/**
 * Parsea string a número, normalizando coma→punto
 */
export function convertirEntradaANumero(valor: string): number {
  if (!valor || valor.trim() === '') return 0;
  // Limpieza agresiva antes de parsear
  const normalizado = valor.replace(',', '.').replace(/[^0-9.]/g, '');
  const numero = parseFloat(normalizado);
  return isNaN(numero) ? 0 : numero;
}
