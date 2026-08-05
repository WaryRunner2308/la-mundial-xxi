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

export interface InvoiceHistoryItem {
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

export interface InvoiceHistoryEntry {
  id: number;
  createdAt: string;
  proveedorNombre: string | null;
  proveedorId: number | null;
  tasa: number;
  descuento: number | null;
  totalItems: number;
  creados: number;
  actualizados: number;
  items: InvoiceHistoryItem[];
}

export type NuevaFactura = Omit<InvoiceHistoryEntry, 'id' | 'createdAt'>;

interface DbFacturaRow {
  id: number;
  created_at: string;
  proveedor_nombre: string | null;
  proveedor_id: number | null;
  tasa: number | null;
  descuento: number | null;
  total_items: number | null;
  creados: number | null;
  actualizados: number | null;
  items: InvoiceHistoryItem[] | null;
}

function mapRow(row: DbFacturaRow): InvoiceHistoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    proveedorNombre: row.proveedor_nombre,
    proveedorId: row.proveedor_id,
    tasa: row.tasa ?? 0,
    descuento: row.descuento,
    totalItems: row.total_items ?? 0,
    creados: row.creados ?? 0,
    actualizados: row.actualizados ?? 0,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

interface InvoiceHistoryStore {
  facturas: InvoiceHistoryEntry[];
  loading: boolean;
  error: string | null;
  fetchFacturas: () => Promise<void>;
  guardarFactura: (factura: NuevaFactura) => Promise<void>;
  eliminarFactura: (id: number) => Promise<void>;
}

export const useInvoiceHistoryStore = create<InvoiceHistoryStore>((set) => ({
  facturas: [],
  loading: false,
  error: null,

  fetchFacturas: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('facturas_importadas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] ERROR facturas_importadas select:', error);
      set({ loading: false, error: 'No se pudo cargar el historial de facturas.' });
      return;
    }
    set({ facturas: ((data || []) as DbFacturaRow[]).map(mapRow), loading: false });
  },

  guardarFactura: async (factura) => {
    const { data, error } = await supabase
      .from('facturas_importadas')
      .insert({
        proveedor_nombre: factura.proveedorNombre,
        proveedor_id: factura.proveedorId,
        tasa: factura.tasa,
        descuento: factura.descuento,
        total_items: factura.totalItems,
        creados: factura.creados,
        actualizados: factura.actualizados,
        items: factura.items,
      })
      .select('*')
      .single();

    if (error) {
      // El historial es un extra: si falla, la importación de productos ya se
      // hizo y no se debe romper por esto.
      console.error('[Supabase] ERROR facturas_importadas insert:', error);
      throw error;
    }
    set((s) => ({ facturas: [mapRow(data as DbFacturaRow), ...s.facturas] }));
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
