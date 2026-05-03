import { useRef } from 'react';

/**
 * Evita que el modal se cierre cuando el usuario arrastra el ratón
 * desde dentro del contenido hasta el backdrop para seleccionar texto.
 * Solo cierra si tanto mousedown como click ocurrieron en el backdrop.
 */
export function useModalClose(onClose: () => void) {
  const fromBackdrop = useRef(false);

  const backdropProps = {
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
