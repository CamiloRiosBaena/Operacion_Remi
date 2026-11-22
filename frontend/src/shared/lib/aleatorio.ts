// Valores aleatorios con el generador criptográfico del navegador.
// crypto.getRandomValues funciona también fuera de HTTPS (por ejemplo, al abrir la app por IP
// en la red local), a diferencia de crypto.randomUUID.

const ALFABETO = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Texto aleatorio de letras minúsculas y números, útil para nombres e identificadores. */
export function textoAleatorio(longitud = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(longitud));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** Número aleatorio en [0, 1), como Math.random. */
export function numeroAleatorio(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
