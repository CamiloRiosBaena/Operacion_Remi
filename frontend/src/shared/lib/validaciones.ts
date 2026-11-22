// Reglas de validación compartidas por los formularios. Deben coincidir con los DTO del backend.

export function validarNombrePersona(nombre: string): string | null {
  const n = nombre.trim();
  if (n.length < 10 || n.length > 30) return 'El nombre debe tener entre 10 y 30 caracteres';
  return null;
}

/**
 * usuario@dominio.ext, sin espacios y con una extensión de al menos 2 caracteres.
 * Se revisa por partes en lugar de con una expresión regular, que podía tardar
 * demasiado con textos largos (retroceso superlineal).
 */
function esCorreoValido(correo: string): boolean {
  if (/\s/.test(correo)) return false;
  const partes = correo.split('@');
  if (partes.length !== 2) return false;
  const [usuario, dominio] = partes;
  const punto = dominio.lastIndexOf('.');
  return usuario.length > 0 && punto > 0 && dominio.length - punto - 1 >= 2;
}

export function validarCorreo(correo: string): string | null {
  if (!esCorreoValido(correo.trim())) return 'Ingresa un correo válido (usuario@dominio.com)';
  return null;
}

export function validarContrasena(contrasena: string): string | null {
  if (contrasena.length < 8 || contrasena.length > 20) return 'La contraseña debe tener entre 8 y 20 caracteres';
  return null;
}
