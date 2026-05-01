/**
 * Limpia y normaliza entrada numérica para móviles
 * - Convierte coma a punto
 * - Elimina cualquier carácter no numérico (excepto un punto)
 * - Mantiene solo un punto decimal
 */
export function validateDecimalInput(value: string): string {
  if (!value) return '';

  // Paso 1: Reemplazar coma por punto
  let cleaned = value.replace(',', '.');

  // Paso 2: Eliminar todo excepto dígitos y punto
  cleaned = cleaned.replace(/[^0-9.]/g, '');

  // Paso 3: Asegurar un solo punto decimal
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // Paso 4: Limitar a 2 decimales (opcional, ajusta según necesidad)
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 2);
  }

  return cleaned;
}

/**
 * Parsea string a número, normalizando coma→punto
 */
export function parseNumericInput(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Limpieza agresiva antes de parsear
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
