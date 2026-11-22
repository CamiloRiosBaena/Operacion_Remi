import { useEffect, useRef } from 'react';

/**
 * Cierre de un modal desde el fondo o con la tecla Escape.
 *
 * Evita que el modal se cierre cuando el usuario arrastra el ratón
 * desde dentro del contenido hasta el backdrop para seleccionar texto:
 * solo cierra si tanto mousedown como click ocurrieron en el backdrop.
 * Como el fondo solo reacciona a clics sobre sí mismo, el contenido del
 * modal no necesita detener la propagación del evento.
 *
 * @param abierto Si el modal está visible; la tecla Escape solo actúa mientras lo está.
 */
export function useModalClose(onClose: () => void, abierto = true) {
  const fromBackdrop = useRef(false);
  const cerrar = useRef(onClose);
  useEffect(() => {
    cerrar.current = onClose;
  });

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar.current();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abierto]);

  const backdropProps = {
    role: 'presentation',
    onMouseDown: (e: React.MouseEvent) => {
      fromBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      if (fromBackdrop.current && e.target === e.currentTarget) {
        onClose();
      }
    },
  };

  return { backdropProps };
}
