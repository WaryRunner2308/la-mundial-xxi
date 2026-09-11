import type { FacturaHistorial, RenglonFactura } from '@/almacen/almacenHistorialFacturas';

// ============================================================================
//  Resumen de precios de venta de una factura, en las dos monedas.
//
//  El historial guarda el precio de venta en la moneda en que venía la factura
//  y la tasa que se usó ese día. Para el resumen hace falta el precio en AMBAS
//  monedas, así que se convierte con la tasa DE LA FACTURA, no con la de hoy:
//  el resumen tiene que dar los mismos números que se vieron al importar.
// ============================================================================

export interface LineaResumen {
  nombre: string;
  /** Precio de venta en bolívares. null si no se puede calcular (sin tasa) */
  precioBs: number | null;
  /** Precio de venta en dólares. null si no se puede calcular (sin tasa) */
  precioUsd: number | null;
  /** La fila se importó de verdad; si no, el precio no quedó en el sistema */
  importado: boolean;
}

function convertir(renglon: RenglonFactura, tasa: number): Pick<LineaResumen, 'precioBs' | 'precioUsd'> {
  const tasaValida = tasa > 0 ? tasa : null;
  if (renglon.moneda === 'Bs') {
    return {
      precioBs: renglon.precioVenta,
      precioUsd: tasaValida ? renglon.precioVenta / tasaValida : null,
    };
  }
  return {
    precioUsd: renglon.precioVenta,
    precioBs: tasaValida ? renglon.precioVenta * tasaValida : null,
  };
}

/**
 * Arma el resumen de una factura: nombre y precio de venta en Bs y USD.
 * Se dejan fuera las filas sin precio de venta (no hay nada que marcar).
 */
export function construirResumen(factura: FacturaHistorial): LineaResumen[] {
  return factura.renglones
    // Number.isFinite además de > 0: el precio viene de un jsonb guardado y un
    // valor corrupto no debe llegar a pantalla como "Infinity" o "NaN"
    .filter((renglon) => Number.isFinite(renglon.precioVenta) && renglon.precioVenta > 0)
    .map((renglon) => ({
      nombre: renglon.nombre,
      importado: renglon.importado,
      ...convertir(renglon, factura.tasa),
    }));
}
