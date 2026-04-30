export type Currency = 'Bs' | 'USD';

export function formatAmount(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // Para Bs, también usamos 2 decimales para consistencia
  return amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatAmountWithCurrency(amount: number, currency: Currency): string {
  const formatted = formatAmount(amount, currency);
  return `${formatted} ${currency === 'Bs' ? 'Bs' : '$'}`;
}
