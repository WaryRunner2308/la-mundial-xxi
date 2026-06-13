/**
 * Tasa oficial BCV vía DolarApi Venezuela (https://ve.dolarapi.com).
 * API pública sin key, CORS abierto. Si falla, la app sigue con entrada manual.
 */

export interface BcvRate {
  rate: number;
  /** Fecha de actualización reportada por la API (ISO 8601) */
  updatedAt: string;
}

const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const TIMEOUT_MS = 8000;

export async function fetchBcvRate(): Promise<BcvRate | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BCV_API_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const promedio = (data as { promedio?: unknown })?.promedio;
    const fecha = (data as { fechaActualizacion?: unknown })?.fechaActualizacion;
    if (typeof promedio !== 'number' || !Number.isFinite(promedio) || promedio <= 0) {
      return null;
    }
    return {
      rate: Math.round(promedio * 100) / 100,
      updatedAt: typeof fecha === 'string' ? fecha : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Formatea la fecha de la API como dd/mm para mostrarla junto a la tasa. */
export function formatBcvDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
