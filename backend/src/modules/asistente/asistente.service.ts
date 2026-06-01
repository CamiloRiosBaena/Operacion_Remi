import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { MenuService } from '../menu/menu.service';
import type { ChatMessageDto, CartActionDto, ChatResponseDto } from './dto/chat.dto';

const TOOL_NAME = 'agregarAlCarrito';

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description:
        'Agrega un plato al carrito. SOLO úsala cuando el cliente EXPLÍCITAMENTE diga que quiere pedir, ordenar o agregar ese plato (ej: "quiero uno", "pídeme eso", "agrégalo", "sí quiero ese", "dame X"). NUNCA la uses para simples recomendaciones, preguntas sobre el menú o cuando el cliente no haya confirmado el pedido.',
      parameters: {
        type: 'object',
        properties: {
          platoId: { type: 'number', description: 'ID numérico del plato según el menú' },
          nombre: { type: 'string', description: 'Nombre exacto del plato' },
          precio: { type: 'number', description: 'Precio unitario del plato' },
          cantidad: { type: 'number', description: 'Cantidad de porciones (mínimo 1)' },
          extras: {
            type: 'array',
            description: 'Extras solicitados por el cliente, solo si existen en el menú del plato',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                precio: { type: 'number' },
                cantidad: { type: 'number' },
              },
              required: ['nombre', 'precio', 'cantidad'],
            },
          },
          ingredientesRemovidos: {
            type: 'array',
            description: 'Ingredientes que el cliente quiere quitar del plato',
            items: { type: 'string' },
          },
          nota: { type: 'string', description: 'Observaciones o personalizaciones especiales' },
        },
        required: ['platoId', 'nombre', 'precio', 'cantidad'],
      },
    },
  },
];

@Injectable()
export class AsistenteService {
  private groq: Groq;

  constructor(
    private readonly config: ConfigService,
    private readonly menuService: MenuService,
  ) {
    this.groq = new Groq({ apiKey: this.config.get<string>('GROQ_API_KEY') });
  }

  async chat(historial: ChatMessageDto[]): Promise<ChatResponseDto> {
    const [categorias, promos] = await Promise.all([
      this.menuService.getMenuPublico(),
      this.menuService.findActivePromos(),
    ]);
    const systemPrompt = this.buildSystemPrompt(categorias, promos);

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historial.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const primera = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.5,
    });

    const choice = primera.choices[0];

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      return this.handleToolCall(choice.message, messages, categorias);
    }

    return {
      mensaje: this.sanitizeMessage(choice.message.content),
      cartActions: [],
    };
  }

  private async handleToolCall(
    assistantMsg: Groq.Chat.Completions.ChatCompletionMessage,
    prevMessages: Groq.Chat.Completions.ChatCompletionMessageParam[],
    categorias: any[],
  ): Promise<ChatResponseDto> {
    const cartActions: CartActionDto[] = [];
    const platosDisponibles = categorias.flatMap((c) => c.platos);

    // Mapa platoId → nombreCategoria para que `categoria` llegue correctamente al carrito
    // y el CartDrawer pueda hacer matching de promos por categoría.
    // (La relación inversa plato.categoria no se carga en getMenuPublico, así que usamos el árbol de categorias.)
    const categoriaPorPlato = new Map<number, string>(
      categorias.flatMap((c) => (c.platos as any[]).map((p) => [p.id as number, c.nombre as string])),
    );

    const toolResults: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

    for (const toolCall of assistantMsg.tool_calls!) {
      if (toolCall.function.name !== TOOL_NAME) continue;

      let args: any;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: false, error: 'Argumentos inválidos' }),
        });
        continue;
      }

      const plato = platosDisponibles.find((p) => p.id === args.platoId);

      if (!plato) {
        // El LLM intentó agregar un plato que no existe — devolvemos error al modelo
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            error: `El plato con ID ${args.platoId} no existe o no está disponible en el menú actual.`,
          }),
        });
        continue;
      }

      // Validar extras: solo incluir los que realmente existen en el plato
      const extrasValidos = (args.extras ?? []).filter((e: any) =>
        plato.extras?.some((pe: any) => pe.nombre.toLowerCase() === e.nombre.toLowerCase()),
      );

      // Precio con IVA ya incluido (igual que PlatoModal) y tasaIva = 0
      // para que el carrito no aplique IVA dos veces
      const precioBase = Number(plato.precio);
      const precioConIva = Math.round(precioBase * (1 + Number(plato.tasaIva)));

      cartActions.push({
        platoId: plato.id,
        nombre: plato.nombre,
        precio: precioConIva,
        cantidad: Math.max(1, args.cantidad ?? 1),
        tasaIva: 0,
        categoria: categoriaPorPlato.get(plato.id) ?? '',
        imageUrl: plato.imagenUrl ?? undefined,
        extras: extrasValidos.length ? extrasValidos : undefined,
        ingredientesRemovidos: args.ingredientesRemovidos?.length
          ? args.ingredientesRemovidos
          : undefined,
        nota: args.nota ?? undefined,
      });

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ success: true, mensaje: `${plato.nombre} añadido al carrito.` }),
      });
    }

    // Segunda llamada para que el modelo confirme con un mensaje natural
    const segunda = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [...prevMessages, assistantMsg, ...toolResults],
      max_tokens: 512,
      temperature: 0.5,
    });

    return {
      mensaje: this.sanitizeMessage(segunda.choices[0].message.content),
      cartActions,
    };
  }

  /** Elimina JSON crudo / bloques de código que el LLM a veces incluye en texto natural */
  private sanitizeMessage(raw: string | null | undefined): string {
    if (!raw) return 'Lo siento, no pude procesar tu solicitud.';
    let msg = raw;

    // Eliminar bloques de código (```json ... ``` o ``` ... ```)
    msg = msg.replace(/```(?:json)?\s*[\s\S]*?```/g, '');

    // Eliminar objetos JSON que parecen argumentos de tool call o respuestas técnicas
    msg = msg.replace(/\{\s*"(?:platoId|success|error|nombre|precio|cantidad|id)[\s\S]*?\}/g, '');

    // Eliminar líneas que empiecen con { o contengan "platoId":
    msg = msg
      .split('\n')
      .filter(l => !/^\s*\{/.test(l) && !/"platoId"\s*:/.test(l))
      .join('\n');

    // Limpiar líneas en blanco excesivas
    msg = msg.replace(/\n{3,}/g, '\n\n').trim();

    return msg || '¡Listo! Tu pedido fue actualizado.';
  }

  private buildSystemPrompt(categorias: any[], promos: any[]): string {
    // ── Sección de menú ──
    const platosMap = new Map<string, string>(); // ID → nombre, para resolver promos de plato
    const menuLineas: string[] = [];
    for (const cat of categorias) {
      menuLineas.push(`\n### ${cat.nombre}`);
      for (const p of cat.platos) {
        platosMap.set(String(p.id), p.nombre);
        const extrasStr = p.extras?.length
          ? ` | Extras: ${p.extras.map((e: any) => `${e.nombre} (+$${Number(e.precio).toLocaleString('es-CO')})`).join(', ')}`
          : '';
        const desc = p.descripcion ? ` — ${p.descripcion}` : '';
        menuLineas.push(
          `- [ID:${p.id}] ${p.nombre}: $${Math.round(Number(p.precio) * (1 + Number(p.tasaIva))).toLocaleString('es-CO')}${desc}${extrasStr}`,
        );
      }
    }

    // ── Sección de promociones ──
    let promoSeccion = '';
    const promosConDescuento = promos.filter(p => p.tipoDescuento);
    const promosInformativas = promos.filter(p => !p.tipoDescuento);

    if (promos.length > 0) {
      const pLines: string[] = [];

      for (const p of promosConDescuento) {
        let descuento = '';
        if (p.tipoDescuento === 'porcentaje')
          descuento = `${Number(p.valorDescuento)}% de descuento`;
        else if (p.tipoDescuento === '2x1')
          descuento = '2×1 (paga uno, llevas dos — el sistema lo descuenta automáticamente al tener 2+ unidades en el carrito)';
        else if (p.tipoDescuento === 'monto_fijo')
          descuento = `$${Number(p.valorDescuento).toLocaleString('es-CO')} de descuento fijo`;

        let aplica = '';
        if (p.ctaAccion === 'plato') {
          const nombrePlato = platosMap.get(String(p.ctaValor)) ?? `plato ID ${p.ctaValor}`;
          aplica = `solo en "${nombrePlato}"`;
        } else if (p.ctaAccion === 'categoria') {
          aplica = `en toda la categoría "${p.ctaValor}"`;
        }

        pLines.push(`- [PROMO] "${p.titulo}" (${p.tag}): ${descuento} — aplica ${aplica}.${p.subtitulo ? ' ' + p.subtitulo : ''}`);
      }

      for (const p of promosInformativas) {
        pLines.push(`- [BANNER] "${p.titulo}": ${p.subtitulo ?? p.cta}`);
      }

      promoSeccion = `\n\nPROMOCIONES Y DESCUENTOS ACTIVOS:\n${pLines.join('\n')}`;
    }

    return `Eres "Remi", el asistente virtual del restaurante Operación Remi. Tu misión es ayudar a los clientes a descubrir el menú, responder preguntas sobre platos y promociones, y tomar pedidos de forma natural y amigable.

MENÚ DISPONIBLE HOY (precios con IVA incluido):
${menuLineas.join('\n')}${promoSeccion}

REGLAS:
1. Solo recomiendas platos que están en el menú de arriba.
2. CRITICAL — Separación entre RECOMENDAR y PEDIR:
   - Si el cliente pide una RECOMENDACIÓN ("recomiéndame algo", "¿qué está bueno?") → describe el plato con entusiasmo pero NO uses agregarAlCarrito. Termina preguntando si lo quiere pedir.
   - Si el cliente CONFIRMA el pedido ("sí", "pídelo", "agrégalo", "dame X", "ponme X") → entonces sí usa agregarAlCarrito.
3. Cuando el cliente quiera pedir algo, usa agregarAlCarrito con los datos exactos del menú.
4. Cuando el cliente pregunte por promociones, ofertas o descuentos, describe las PROMOCIONES ACTIVAS listadas arriba con entusiasmo. Si no hay promos, díselo con amabilidad.
5. Cuando agregues al carrito un plato que tenga una promo activa, menciónala en tu confirmación (ej: "¡Además tiene promo 2×1! Si pides 2, el descuento se aplica automáticamente en el carrito 🎉").
6. Si el plato no existe en el menú, díselo amablemente y sugiere alternativas.
7. Si la solicitud es ambigua, pide clarificación antes de agregar.
8. Responde SIEMPRE en español, tono cálido y conciso.
9. Nunca inventes precios, IDs ni platos que no estén en el menú.
10. NUNCA incluyas JSON, bloques de código ni datos técnicos en tus respuestas. Solo lenguaje natural.
11. Cuando uses agregarAlCarrito, tu respuesta de texto debe ser únicamente una confirmación breve y amigable. Nada más.`;
  }
}
