import { useState, useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T, index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions<T>) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
          }
          break;
        case 'Escape':
          e.preventDefault();
          setHighlightedIndex(-1);
          if (onEscape) {
            onEscape();
          }
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
  };
}
