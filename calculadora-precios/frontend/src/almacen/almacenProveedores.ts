import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Proveedor } from '../tipos/proveedor';

interface EstadoProveedores {
  proveedores: Proveedor[];
  cargando: boolean;
  error: string | null;
  cargarProveedores: () => Promise<void>;
  agregarProveedor: (nombre: string) => Promise<Proveedor>;
  actualizarProveedor: (id: number, nombre: string) => Promise<void>;
  eliminarProveedor: (id: number) => Promise<void>;
}

// OJO: 'proveedores' es el nombre real de la tabla en Supabase y 'name' el de
// la columna. Esas cadenas no se traducen.
export const useAlmacenProveedores = create<EstadoProveedores>((set) => ({
  proveedores: [],
  cargando: false,
  error: null,

  cargarProveedores: async () => {
    set({ cargando: true, error: null });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({ proveedores: data || [], cargando: false });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al cargar proveedores.';
      console.error('Error al cargar proveedores:', err);
      set({ error: mensaje, cargando: false });
    }
  },

  agregarProveedor: async (nombre: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .insert({ name: nombre })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set((estado) => ({ proveedores: [...estado.proveedores, data] }));
      }
      return data;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al agregar proveedor.';
      console.error('Error al agregar proveedor:', err);
      set({ error: mensaje });
      throw err;
    }
  },

  actualizarProveedor: async (id: number, nombre: string) => {
    try {
      const { error } = await supabase
        .from('proveedores')
        .update({ name: nombre })
        .eq('id', id);

      if (error) throw error;
      set((estado) => ({
        proveedores: estado.proveedores.map((p) => (p.id === id ? { ...p, name: nombre } : p)),
      }));
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al actualizar proveedor.';
      console.error('Error al actualizar proveedor:', err);
      set({ error: mensaje });
      throw err;
    }
  },

  eliminarProveedor: async (id: number) => {
    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((estado) => ({
        proveedores: estado.proveedores.filter((p) => p.id !== id),
      }));
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al eliminar proveedor.';
      console.error('Error al eliminar proveedor:', err);
      set({ error: mensaje });
      throw err;
    }
  },
}));
