/**
 * Fondo animado del menú — blobs de luz cálida estilo iluminación de restaurante.
 * position: fixed; z-index: -1  →  detrás de todo el contenido de la página.
 * No usa JS para la animación — solo CSS @keyframes (GPU-accelerated).
 */
export function MenuBackground() {
  return (
    <div className="menu-bg" aria-hidden="true">
      <div className="menu-bg__blob menu-bg__blob--1" />
      <div className="menu-bg__blob menu-bg__blob--2" />
      <div className="menu-bg__blob menu-bg__blob--3" />
      <div className="menu-bg__blob menu-bg__blob--4" />
      <div className="menu-bg__blob menu-bg__blob--5" />
      <div className="menu-bg__blob menu-bg__blob--6" />
    </div>
  );
}
