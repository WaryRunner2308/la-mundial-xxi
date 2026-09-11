import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ============================================================================
//  Historial de facturas importadas.
//
//  Guarda los MISMOS datos que se ven en la tabla de revisión al importar
//  (nombre, precio costo, precio venta, moneda, IVA, % ganancia y estado), para
//  poder volver a verlos después. Solo lectura: en el historial no se edita.
//
//  Los valores quedan congelados tal como estaban ese día y no se recalculan:
//  si mañana cambia el precio de un producto o cambia la tasa, la factura de
//  ayer tiene que seguir mostrando lo de ayer.
// ============================================================================

// OJO: los campos de RenglonFactura son, uno a uno, las llaves del jsonb que ya
// está guardado en la columna 'items' de Supabase. Ya venían en español y así
// deben quedarse: renombrar alguno haría ilegibles las facturas ya guardadas.
export interface RenglonFactura {
  nombre: string;
  /** Precio costo tal como se mostró, en la moneda de la factura */
  precioCosto: number;
  /** Precio de venta calculado ese día, en la moneda de la factura */
  precioVenta: number;
  moneda: 'USD' | 'Bs';
  /** 'yes' con IVA · 'no' exento · null sin definir */
  iva: 'yes' | 'no' | null;
  /** % de ganancia usado en esa fila */
  ganancia: number;
  unidad: string;
  cantidadBulto: number | null;
  /** Costo final guardado en el producto, en USD. null si la fila no se importó */
  costoUsd: number | null;
  estado: 'Nuevo' | 'Actualizar precio' | 'Sin cambios';
  /** Costo que tenía el producto antes, en USD */
  precioAnterior: number | null;
  importado: boolean;
  productoId: number | null;
  /** Nombre con el que ya estaba guardado el producto */
  nombreExistente: string | null;
  /** El emparejamiento fue por parecido, no por nombre idéntico */
  matchAproximado: boolean;
}

/** Una factura del historial, tal como la usa la aplicación. */
export interface FacturaHistorial {
  id: number;
  creadoEn: string;
  proveedorNombre: string | null;
  proveedorId: number | null;
  tasa: number;
  descuento: number | null;
  totalRenglones: number;
  creados: number;
  actualizados: number;
  renglones: RenglonFactura[];
}

export type NuevaFactura = Omit<FacturaHistorial, 'id' | 'creadoEn'>;

// ---------------------------------------------------------------------------
// FRONTERA CON LA BASE DE DATOS
// Fila de la tabla 'facturas_importadas' de Supabase. Los nombres de campo son
// los de las columnas reales; la traducción ocurre en deFilaDb.
// ---------------------------------------------------------------------------
interface FacturaDbFila {
  id: number;
  created_at: string;
  proveedor_nombre: string | null;
  proveedor_id: number | null;
  tasa: number | null;
  descuento: number | null;
  total_items: number | null;
  creados: number | null;
  actualizados: number | null;
  items: RenglonFactura[] | null;
}

function deFilaDb(fila: FacturaDbFila): FacturaHistorial {
  return {
    id: fila.id,
    creadoEn: fila.created_at,
    proveedorNombre: fila.proveedor_nombre,
    proveedorId: fila.proveedor_id,
    tasa: fila.tasa ?? 0,
    descuento: fila.descuento,
    totalRenglones: fila.total_items ?? 0,
    creados: fila.creados ?? 0,
    actualizados: fila.actualizados ?? 0,
    renglones: Array.isArray(fila.items) ? fila.items : [],
  };
}

interface EstadoHistorialFacturas {
  facturas: FacturaHistorial[];
  cargando: boolean;
  error: string | null;
  cargarFacturas: () => Promise<void>;
  guardarFactura: (factura: NuevaFactura) => Promise<void>;
  eliminarFactura: (id: number) => Promise<void>;
}

export const useAlmacenHistorialFacturas = create<EstadoHistorialFacturas>((set) => ({
  facturas: [],
  cargando: false,
  error: null,

  cargarFacturas: async () => {
    set({ cargando: true, error: null });
    const { data, error } = await supabase
      .from('facturas_importadas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] ERROR facturas_importadas select:', error);
      set({ cargando: false, error: 'No se pudo cargar el historial de facturas.' });
      return;
    }
    set({ facturas: ((data || []) as FacturaDbFila[]).map(deFilaDb), cargando: false });
  },

  guardarFactura: async (factura) => {
    const { data, error } = await supabase
      .from('facturas_importadas')
      .insert({
        proveedor_nombre: factura.proveedorNombre,
        proveedor_id: factura.proveedorId,
        tasa: factura.tasa,
        descuento: factura.descuento,
        total_items: factura.totalRenglones,
        creados: factura.creados,
        actualizados: factura.actualizados,
        items: factura.renglones,
      })
      .select('*')
      .single();

    if (error) {
      // El historial es un extra: si falla, la importación de productos ya se
      // hizo y no se debe romper por esto.
      console.error('[Supabase] ERROR facturas_importadas insert:', error);
      throw error;
    }
    set((s) => ({ facturas: [deFilaDb(data as FacturaDbFila), ...s.facturas] }));
  },

  eliminarFactura: async (id) => {
    const { error } = await supabase.from('facturas_importadas').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] ERROR facturas_importadas delete:', error);
      throw error;
    }
    set((s) => ({ facturas: s.facturas.filter((f) => f.id !== id) }));
  },
}));
