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
        'Agrega un plato al carrito de compras del cliente. Úsala cuando el cliente exprese intención de pedir o comprar un plato específico.',
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
    const categorias = await this.menuService.getMenuPublico();
    const systemPrompt = this.buildSystemPrompt(categorias);

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
      mensaje: choice.message.content ?? 'Lo siento, no pude procesar tu solicitud.',
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
        categoria: plato.categoria?.nombre ?? '',
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
      mensaje: segunda.choices[0].message.content ?? '¡Listo! Tu pedido fue actualizado.',
      cartActions,
    };
  }

  private buildSystemPrompt(categorias: any[]): string {
    const lineas: string[] = [];
    for (const cat of categorias) {
      lineas.push(`\n### ${cat.nombre}`);
      for (const p of cat.platos) {
        const extrasStr = p.extras?.length
          ? ` | Extras: ${p.extras.map((e: any) => `${e.nombre} (+$${Number(e.precio).toLocaleString('es-CO')})`).join(', ')}`
          : '';
        const desc = p.descripcion ? ` — ${p.descripcion}` : '';
        lineas.push(
          `- [ID:${p.id}] ${p.nombre}: $${Number(p.precio).toLocaleString('es-CO')}${desc}${extrasStr}`,
        );
      }
    }

    return `Eres "Remi", el asistente virtual del restaurante Operación Remi. Tu misión es ayudar a los clientes a descubrir el menú, responder preguntas sobre los platos y tomar pedidos de forma natural y amigable.

MENÚ DISPONIBLE HOY:
${lineas.join('\n')}

REGLAS:
1. Solo recomiendes platos que están listados en el menú de arriba.
2. Cuando el cliente quiera pedir algo, usa la función agregarAlCarrito con los datos exactos del menú (ID, nombre, precio).
3. Si el plato no existe en el menú, díselo amablemente y sugiere alternativas similares del menú.
4. Si la solicitud es ambigua (ej: "el de siempre", "algo especial"), pide clarificación antes de agregar.
5. Responde SIEMPRE en español, tono cálido y conciso.
6. Nunca inventes precios, IDs ni platos que no estén en el menú.
7. Si el cliente pide extras que no están listados para ese plato, infórmale que no están disponibles.`;
  }
}
