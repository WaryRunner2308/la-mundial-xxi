import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Provider } from '../types/provider';

interface ProviderStore {
  providers: Provider[];
  loading: boolean;
  error: string | null;
  fetchProviders: () => Promise<void>;
  addProvider: (name: string) => Promise<Provider>;
  updateProvider: (id: number, name: string) => Promise<void>;
  deleteProvider: (id: number) => Promise<void>;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  loading: false,
  error: null,

  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({ providers: data || [], loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar proveedores.';
      console.error('Error fetching providers:', err);
      set({ error: message, loading: false });
    }
  },

  addProvider: async (name: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set((state) => ({ providers: [...state.providers, data] }));
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al agregar proveedor.';
      console.error('Error adding provider:', err);
      set({ error: message });
      throw err;
    }
  },

  updateProvider: async (id: number, name: string) => {
    try {
      const { error } = await supabase
        .from('proveedores')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        providers: state.providers.map((p) => (p.id === id ? { ...p, name } : p)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al actualizar proveedor.';
      console.error('Error updating provider:', err);
      set({ error: message });
      throw err;
    }
  },

  deleteProvider: async (id: number) => {
    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        providers: state.providers.filter((p) => p.id !== id),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al eliminar proveedor.';
      console.error('Error deleting provider:', err);
      set({ error: message });
      throw err;
    }
  },
}));
