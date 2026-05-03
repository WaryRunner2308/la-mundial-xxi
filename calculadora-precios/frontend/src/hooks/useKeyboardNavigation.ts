import { useState, useEffect, useCallback, useRef } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T, index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
  autoFocus?: boolean; // Si debe auto-enfocar el contenedor al montarse
}

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  onEscape,
  enabled = true,
  autoFocus = false,
}: UseKeyboardNavigationOptions<T>) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-enfocar el contenedor si se solicita
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect(items[highlightedIndex], highlightedIndex);
            // Mantener el foco en el contenedor después de seleccionar
            containerRef.current?.focus();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setHighlightedIndex(-1);
          if (onEscape) {
            onEscape();
          }
          // Devolver foco al input padre si existe
          containerRef.current?.blur();
          break;
        default:
          break;
      }
    },
    [enabled, items, highlightedIndex, onSelect, onEscape]
  );

  // Resetear cuando cambia la lista
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [items]);

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    containerRef,
  };
}
