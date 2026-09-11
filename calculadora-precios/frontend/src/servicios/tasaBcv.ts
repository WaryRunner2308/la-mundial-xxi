/**
 * Tasa oficial BCV vía DolarApi Venezuela (https://ve.dolarapi.com).
 * API pública sin key, CORS abierto. Si falla, la app sigue con entrada manual.
 */

export interface TasaBcv {
  tasa: number;
  /** Fecha de actualización reportada por la API (ISO 8601) */
  actualizadoEn: string;
}

const URL_API_BCV = 'https://ve.dolarapi.com/v1/dolares/oficial';
const TIEMPO_LIMITE_MS = 8000;

export async function obtenerTasaBcv(): Promise<TasaBcv | null> {
  const controlador = new AbortController();
  const tiempoLimite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    const respuesta = await fetch(URL_API_BCV, { signal: controlador.signal });
    if (!respuesta.ok) return null;
    const datos: unknown = await respuesta.json();
    const promedio = (datos as { promedio?: unknown })?.promedio;
    const fecha = (datos as { fechaActualizacion?: unknown })?.fechaActualizacion;
    if (typeof promedio !== 'number' || !Number.isFinite(promedio) || promedio <= 0) {
      return null;
    }
    return {
      tasa: Math.round(promedio * 100) / 100,
      actualizadoEn: typeof fecha === 'string' ? fecha : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(tiempoLimite);
  }
}

/** Formatea la fecha de la API como dd/mm para mostrarla junto a la tasa. */
export function formatearFechaBcv(iso: string): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}
