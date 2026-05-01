/**
 * Valida y formatea entradas decimales, permitiendo tanto punto como coma
 * Como separador decimal. Normaliza a punto.
 */
export function validateDecimalInput(value: string): string {
  // Permitir solo dígitos, punto y coma
  let cleaned = value.replace(/[^0-9.,]/g, '');

  // Reemplazar comas por puntos para normalizar
  cleaned = cleaned.replace(/,/g, '.');

  // Asegurar solo un punto decimal
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // Limitar a 2 decimales
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 2);
  }

  return cleaned;
}

/**
 * Parsea un string numérico (con punto o coma) a número
 * Ej: "12,5" → 12.5, "10.75" → 10.75
 */
export function parseNumericInput(value: string): number {
  if (!value || value.trim() === '') return 0;
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
