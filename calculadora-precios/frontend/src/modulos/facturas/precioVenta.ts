import type { ProductoFactura, OpcionIva } from './useEscanerFacturas';
import { IVA } from '@/utilidades/iva';

// ============================================================================
//  Cálculo de precio de venta de una fila de factura.
//
//  Vive aparte porque lo usan DOS pantallas: la tabla de revisión (al importar)
//  y el historial de facturas importadas. La fórmula tiene que ser una sola: si
//  se duplicara, el historial mostraría números distintos a los que se vieron
//  al momento de importar.
// ============================================================================

// base = costo / (1 - ganancia/100)
// opcionIva 'yes' → base * 1.16; 'no' o null → base
export function calcularPrecioVenta(costo: number, ganancia: number, opcionIva: OpcionIva): number {
  if (costo <= 0) return 0;
  const margen = 1 - (ganancia || 0) / 100;
  if (margen <= 0) return 0;
  const base = costo / margen;
  return opcionIva === 'yes' ? base * (1 + IVA) : base;
}

export interface CalculoFila {
  /** Precio de venta en la moneda de la factura */
  precioVenta: number;
  /** Costo que realmente se guarda en el producto, en la moneda de la factura */
  costoAGuardar: number;
  /** La fila puede elegir entre mantener o bajar el precio de venta */
  eligePv: boolean;
  /** Se está conservando el precio de venta anterior */
  mantienePv: boolean;
  /** Puntos de margen extra por mantener el PV pagando un costo con descuento */
  extraPct: number;
}

/**
 * Resuelve costo y precio de venta de una fila, tomando en cuenta el descuento
 * de factura y la decisión de mantener o bajar el precio de venta.
 */
export function calcularFila(
  producto: ProductoFactura,
  gananciaUsada: number,
  descuentoAplicado: number,
  tasa: number
): CalculoFila {
  const descuentoFila = descuentoAplicado > 0 && descuentoAplicado < 100;
  // Solo productos existentes con datos previos pueden elegir mantener/bajar el PV
  const eligePv =
    descuentoFila &&
    producto.estado === 'Actualizar precio' &&
    producto.precioAnterior !== null &&
    producto.gananciaAnterior !== null;
  const mantienePv = eligePv && producto.descuentoPv === 'mantener';

  let precioVenta: number;
  if (mantienePv) {
    // Precio de venta anterior del producto (costo y ganancia guardados, en USD)
    const margenPrev = 1 - (producto.gananciaAnterior ?? 0) / 100;
    let pvUsd = margenPrev > 0 ? (producto.precioAnterior ?? 0) / margenPrev : 0;
    if (producto.opcionIva === 'yes') pvUsd *= 1 + IVA;
    precioVenta = producto.moneda === 'Bs' ? pvUsd * (tasa > 0 ? tasa : 1) : pvUsd;
  } else {
    // Los productos nuevos con descuento se guardan con el costo sin descuento,
    // así que su PV también se calcula sobre esa base
    const costoBasePv =
      descuentoFila && producto.estado === 'Nuevo' ? producto.precioOriginal : producto.precio;
    precioVenta = calcularPrecioVenta(costoBasePv, gananciaUsada, producto.opcionIva);
  }

  const extraPct = mantienePv
    ? (descuentoAplicado * (100 - (producto.gananciaAnterior ?? 0))) / 100
    : 0;

  const costoAGuardar =
    descuentoFila && producto.descuentoPv === 'mantener' ? producto.precioOriginal : producto.precio;

  return { precioVenta, costoAGuardar, eligePv, mantienePv, extraPct };
}
