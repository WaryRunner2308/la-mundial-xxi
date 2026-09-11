import { useState, useEffect, useCallback, useRef } from 'react';

interface OpcionesNavegacionTeclado<T> {
  elementos: T[];
  alSeleccionar: (elemento: T, indice: number) => void;
  alEscapar?: () => void;
  habilitado?: boolean;
  enfocarAlMontar?: boolean; // Si debe auto-enfocar el contenedor al montarse
}

export function useNavegacionTeclado<T>({
  elementos,
  alSeleccionar,
  alEscapar,
  habilitado = true,
  enfocarAlMontar = false,
}: OpcionesNavegacionTeclado<T>) {
  const [indiceResaltado, fijarIndiceResaltado] = useState(-1);
  const refContenedor = useRef<HTMLDivElement>(null);

  // Auto-enfocar el contenedor si se solicita
  useEffect(() => {
    if (enfocarAlMontar && refContenedor.current) {
      refContenedor.current.focus();
    }
  }, [enfocarAlMontar]);

  const alPresionarTecla = useCallback(
    (e: React.KeyboardEvent) => {
      if (!habilitado || elementos.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          fijarIndiceResaltado((prev) =>
            prev < elementos.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          fijarIndiceResaltado((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (indiceResaltado >= 0 && indiceResaltado < elementos.length) {
            alSeleccionar(elementos[indiceResaltado], indiceResaltado);
            // Mantener el foco en el contenedor después de seleccionar
            refContenedor.current?.focus();
          }
          break;
        case 'Escape':
          e.preventDefault();
          fijarIndiceResaltado(-1);
          if (alEscapar) {
            alEscapar();
          }
          // Devolver foco al input padre si existe
          refContenedor.current?.blur();
          break;
        default:
          break;
      }
    },
    [habilitado, elementos, indiceResaltado, alSeleccionar, alEscapar]
  );

  // Resetear cuando cambia la lista
  useEffect(() => {
    fijarIndiceResaltado(-1);
  }, [elementos]);

  return {
    indiceResaltado,
    fijarIndiceResaltado,
    alPresionarTecla,
    refContenedor,
  };
}
