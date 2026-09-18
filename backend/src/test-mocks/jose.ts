// Stub de Jest para el paquete ESM-only "jose".
// Solo lo importa SupabaseAdminService (createRemoteJWKSet, jwtVerify), y las pruebas
// unitarias del taller nunca instancian ese servicio real: siempre pasan un objeto
// `supabase` mockeado a AuthService. Sin este stub, Jest falla al parsear el `export`
// de ESM de "jose" (no está en transformIgnorePatterns).
export function createRemoteJWKSet() {
  return jest.fn();
}

export function jwtVerify() {
  return Promise.reject(new Error('jose está mockeado en las pruebas unitarias'));
}
