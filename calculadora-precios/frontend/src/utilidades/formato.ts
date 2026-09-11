export type Moneda = 'Bs' | 'USD';

export function formatearMonto(monto: number, moneda: Moneda): string {
  if (moneda === 'USD') {
    return monto.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // Para Bs, también usamos 2 decimales para consistencia
  return monto.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
