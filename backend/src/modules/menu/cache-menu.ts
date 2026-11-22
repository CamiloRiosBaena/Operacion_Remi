/** Vencimiento de respaldo, por si los datos se editan directamente en la base. */
export const TTL_CACHE_MENU_MS = 60_000;

interface Entrada {
  valor: Promise<unknown>;
  vence: number;
}

/**
 * Caché en memoria para las consultas públicas del menú.
 * Guarda la promesa, así las peticiones simultáneas comparten una sola consulta.
 */
export class CacheMenu {
  private readonly entradas = new Map<string, Entrada>();

  constructor(
    private readonly ttlMs = TTL_CACHE_MENU_MS,
    private readonly ahora: () => number = Date.now,
  ) {}

  obtener<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
    const actual = this.entradas.get(clave);
    if (actual && actual.vence > this.ahora())
      return actual.valor as Promise<T>;

    const entrada: Entrada = {
      valor: cargar(),
      vence: this.ahora() + this.ttlMs,
    };
    this.entradas.set(clave, entrada);
    // Un error no se guarda: la siguiente petición vuelve a consultar
    entrada.valor.catch(() => {
      if (this.entradas.get(clave) === entrada) this.entradas.delete(clave);
    });
    return entrada.valor as Promise<T>;
  }

  invalidar(): void {
    this.entradas.clear();
  }
}

/** Vacía la caché del menú cuando termina el método, haya salido bien o no. */
export function InvalidaCacheMenu(): MethodDecorator {
  return (_objetivo, _nombre, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    descriptor.value = async function (
      this: { cacheMenu: CacheMenu },
      ...args: unknown[]
    ) {
      try {
        const resultado: unknown = await original.apply(this, args);
        return resultado;
      } finally {
        this.cacheMenu.invalidar();
      }
    };
  };
}
