import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAlmacenMoneda } from './almacenMoneda';
import { Moneda } from '../utilidades/formato';

/** Producto tal como lo usa la aplicación. */
export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  costoUSD: number;
  monedaOriginal: Moneda;
  porcentajeGanancia: number;
  exentoIva: boolean;
  urlFoto: string;
  idProveedor?: number;
  actualizadoEn: string | null;
}

/** Datos que se reciben de un formulario para crear o modificar un producto. */
export interface DatosProducto {
  nombre: string;
  costo: number;
  moneda: Moneda;
  porcentajeGanancia: number;
  exentoIva: boolean;
  urlFoto: string | null;
  idProveedor?: number | null;
}

interface EstadoProductos {
  productos: Producto[];
  cargando: boolean;
  error: string | null;
  agregarProducto: (producto: DatosProducto) => Promise<number>;
  eliminarProducto: (id: number) => Promise<void>;
  actualizarProducto: (id: number, cambios: Partial<DatosProducto>) => Promise<void>;
  fijarProductos: (productos: Producto[]) => void;
  cargarDesdeSupabase: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// FRONTERA CON LA BASE DE DATOS
//
// Los tres tipos que siguen describen la tabla 'productos' de Supabase tal como
// existe allá. Sus campos van en inglés a propósito: son los nombres reales de
// las columnas. Si se traducen aquí, las consultas dejan de encontrarlas.
//
// La traducción entre estos nombres y los del resto de la app ocurre solo en
// este archivo, en las funciones de mapeo de más abajo.
// ---------------------------------------------------------------------------

interface ProductoDbInsertar {
  name: string;
  category: string;
  cost_usd: number;
  original_currency: Moneda;
  profit_percentage: number;
  exempt_from_vat: boolean;
  photo_url: string | null;
  provider_id?: number;
}

interface ProductoDbActualizar {
  name?: string;
  cost_usd?: number;
  profit_percentage?: number;
  exempt_from_vat?: boolean;
  photo_url?: string | null;
  original_currency?: Moneda;
  provider_id?: number | null;
}

interface ProductoDbFila {
  id: number;
  name: string;
  category: string | null;
  cost_usd: number;
  original_currency: string;
  profit_percentage: number;
  exempt_from_vat: boolean;
  photo_url: string | null;
  provider_id?: number;
  updated_at: string | null;
}

/** Convierte una fila de la base de datos al producto que usa la app. */
function deFilaDb(fila: ProductoDbFila): Producto {
  return {
    id: fila.id,
    nombre: fila.name,
    categoria: fila.category || '',
    costoUSD: fila.cost_usd,
    monedaOriginal: (fila.original_currency === 'Bs' || fila.original_currency === 'USD'
      ? fila.original_currency
      : 'Bs') as Moneda,
    porcentajeGanancia: fila.profit_percentage,
    exentoIva: fila.exempt_from_vat,
    urlFoto: fila.photo_url || '',
    idProveedor: fila.provider_id,
    actualizadoEn: fila.updated_at,
  };
}

export const useAlmacenProductos = create<EstadoProductos>((set, get) => ({
  productos: [],
  cargando: false,
  error: null,

  agregarProducto: async (producto) => {
    const tasa = useAlmacenMoneda.getState().tasa;
    const costoUSD = producto.moneda === 'USD'
      ? producto.costo
      : (tasa > 0 ? producto.costo / tasa : 0);

    const datosDb: ProductoDbInsertar = {
      name: producto.nombre,
      category: '',
      cost_usd: costoUSD,
      original_currency: producto.moneda,
      profit_percentage: producto.porcentajeGanancia,
      exempt_from_vat: producto.exentoIva,
      photo_url: producto.urlFoto || null,
    };

    if (producto.idProveedor !== undefined && producto.idProveedor !== null) {
      datosDb.provider_id = producto.idProveedor;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert(datosDb)
        .select('id')
        .single();

      if (error) throw error;

      const productoNuevo: Producto = {
        id: data.id,
        nombre: producto.nombre,
        categoria: '',
        costoUSD,
        monedaOriginal: producto.moneda,
        porcentajeGanancia: producto.porcentajeGanancia,
        exentoIva: producto.exentoIva,
        urlFoto: producto.urlFoto ?? '',
        idProveedor: producto.idProveedor ?? undefined,
        actualizadoEn: new Date().toISOString(),
      };

      set((s) => ({ productos: [...s.productos, productoNuevo] }));
      return data.id as number;
    } catch (err) {
      console.error('[Supabase] Excepción agregarProducto:', err);
      throw err;
    }
  },

  eliminarProducto: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] ERROR delete:', error);
      throw error;
    }
    set((s) => ({ productos: s.productos.filter((p) => p.id !== id) }));
  },

  actualizarProducto: async (id: number, cambios: Partial<DatosProducto>) => {
    let costoUsdActualizado: number | undefined;

    // Si cambia el costo o la moneda, hay que reconvertir a costo en USD
    if (cambios.costo !== undefined || cambios.moneda !== undefined) {
      const tasa = useAlmacenMoneda.getState().tasa;
      const existente = get().productos.find((p) => p.id === id);
      if (!existente) return;
      const costo = cambios.costo ?? existente.costoUSD;
      const moneda = cambios.moneda ?? existente.monedaOriginal;
      if (tasa > 0) {
        costoUsdActualizado = moneda === 'Bs' ? costo / tasa : costo;
      } else {
        costoUsdActualizado = costo;
      }
    }

    const cambiosDb: ProductoDbActualizar = {};
    if (cambios.nombre !== undefined) cambiosDb.name = cambios.nombre;
    if (costoUsdActualizado !== undefined) cambiosDb.cost_usd = costoUsdActualizado;
    if (cambios.porcentajeGanancia !== undefined) cambiosDb.profit_percentage = cambios.porcentajeGanancia;
    if (cambios.exentoIva !== undefined) cambiosDb.exempt_from_vat = cambios.exentoIva;
    if (cambios.urlFoto !== undefined) cambiosDb.photo_url = cambios.urlFoto || null;
    if (cambios.moneda !== undefined) cambiosDb.original_currency = cambios.moneda;
    if (cambios.idProveedor !== undefined && cambios.idProveedor !== null) {
      cambiosDb.provider_id = cambios.idProveedor;
    } else if (cambios.idProveedor === null) {
      cambiosDb.provider_id = null;
    }

    const { error } = await supabase.from('products').update(cambiosDb).eq('id', id);
    if (error) {
      console.error('[Supabase] ERROR update:', error);
      throw error;
    }

    set((s) => ({
      productos: s.productos.map((p) =>
        p.id === id ? {
          ...p,
          nombre: cambios.nombre ?? p.nombre,
          porcentajeGanancia: cambios.porcentajeGanancia ?? p.porcentajeGanancia,
          exentoIva: cambios.exentoIva ?? p.exentoIva,
          urlFoto: cambios.urlFoto !== undefined ? (cambios.urlFoto ?? '') : p.urlFoto,
          idProveedor: cambios.idProveedor !== undefined ? (cambios.idProveedor ?? undefined) : p.idProveedor,
          costoUSD: costoUsdActualizado ?? p.costoUSD,
          monedaOriginal: cambios.moneda ?? p.monedaOriginal,
        } : p
      ),
    }));
  },

  fijarProductos: (productos) => set({ productos }),

  cargarDesdeSupabase: async () => {
    set({ cargando: true, error: null });
    try {
      // 'proveedores:provider_id (name)' es sintaxis de PostgREST con los
      // nombres reales de la tabla y la columna; no se traduce.
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          proveedores:provider_id (name)
        `);

      if (error) throw error;

      const productos: Producto[] = ((data || []) as ProductoDbFila[]).map(deFilaDb);

      set({ productos, cargando: false });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al cargar productos.';
      console.error('[Supabase] ERROR load:', err);
      set({ error: mensaje, cargando: false });
      throw err;
    }
  },
}));
