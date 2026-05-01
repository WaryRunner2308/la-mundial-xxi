import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useCurrencyStore } from './currencyStore';
import { useProviderStore } from './providerStore';
import { Provider } from '../types/provider';

type Currency = 'Bs' | 'USD';

interface Product {
  id: number;
  name: string;
  category: string;
  costUSD: number;
  originalCurrency: Currency;
  profitPercentage: number;
  exemptFromVAT: boolean;
  photoUrl: string;
  providerId?: number;
  updatedAt: string | null;
}

interface ProductStore {
  products: Product[];
  loading: boolean;
  error: string | null;
  addProduct: (product: { name: string; cost: number; currency: Currency; profitPercentage: number; exemptFromVAT: boolean; photoUrl: string; providerId?: number }) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  updateProduct: (id: number, updates: Partial<Omit<Product, 'id' | 'updatedAt'>>) => Promise<void>;
  setProducts: (products: Product[]) => void;
  loadFromSupabase: () => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  addProduct: async (product) => {
    console.log('🔵 [Supabase] Agregando:', product.name);
    const rate = useCurrencyStore.getState().rate;
    const costUSD = rate > 0 ? (product.currency === 'Bs' ? product.cost / rate : product.cost) : 0;

    const dbData: any = {
      name: product.name,
      category: '',
      cost_usd: costUSD,
      original_currency: product.currency === 'Bs' ? 'bs' : 'usd',
      profit_percentage: product.profitPercentage,
      exempt_from_vat: product.exemptFromVAT,
      photo_url: product.photoUrl || null,
    };

    if (product.providerId !== undefined) {
      dbData.provider_id = product.providerId;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert(dbData)
        .select('id')
        .single();

      if (error) throw error;
      console.log('🟢 [Supabase] ID recibido:', data.id);

      const newProduct: Product = {
        id: data.id,
        name: product.name,
        category: '',
        costUSD,
        originalCurrency: product.currency,
        profitPercentage: product.profitPercentage,
        exemptFromVAT: product.exemptFromVAT,
        photoUrl: product.photoUrl,
        providerId: product.providerId,
        updatedAt: new Date().toISOString(),
      };

      set((s) => ({ products: [...s.products, newProduct] }));
    } catch (err: any) {
      console.error('🔴 [Supabase] Excepción addProduct:', err);
      throw err;
    }
  },

  removeProduct: async (id) => {
    console.log('🔵 [Supabase] Eliminando ID:', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('🔴 [Supabase] ERROR delete:', error);
      throw error;
    }
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  updateProduct: async (id, updates) => {
    console.log('🔵 [Supabase] Actualizando ID:', id);
    let updatedCostUSD: number | undefined;

    if (updates.cost !== undefined || updates.originalCurrency !== undefined) {
      const rate = useCurrencyStore.getState().rate;
      const existing = get().products.find((p) => p.id === id);
      if (!existing) return;
      const cost = updates.cost ?? existing.costUSD;
      const currency = updates.originalCurrency || existing.originalCurrency;
      if (rate > 0) {
        updatedCostUSD = currency === 'Bs' ? cost / rate : cost;
      }
    }

    const dbUpdate: any = {};
    if (updates.name !== undefined) dbUpdate.name = updates.name;
    if (updatedCostUSD !== undefined) dbUpdate.cost_usd = updatedCostUSD;
    if (updates.profitPercentage !== undefined) dbUpdate.profit_percentage = updates.profitPercentage;
    if (updates.exemptFromVAT !== undefined) dbUpdate.exempt_from_vat = updates.exemptFromVAT;
    if (updates.photoUrl !== undefined) dbUpdate.photo_url = updates.photoUrl || null;
    if (updates.originalCurrency !== undefined) dbUpdate.original_currency = updates.originalCurrency === 'Bs' ? 'bs' : 'usd';
    if (updates.providerId !== undefined) dbUpdate.provider_id = updates.providerId;

    const { error } = await supabase.from('products').update(dbUpdate).eq('id', id);
    if (error) {
      console.error('🔴 [Supabase] ERROR update:', error);
      throw error;
    }

    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, ...updates, ...(updatedCostUSD !== undefined && { costUSD: updatedCostUSD }) } : p
      ),
    }));
  },

  setProducts: (products) => set({ products }),

  loadFromSupabase: async () => {
    console.log('🔵 [Supabase] Cargando todos...');
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          proveedores:provider_id (name)
        `);

      if (error) throw error;

      const products: Product[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        costUSD: item.cost_usd,
        originalCurrency: (item.original_currency === 'bs' ? 'Bs' : item.original_currency === 'usd' ? 'USD' : 'Bs') as Currency,
        profitPercentage: item.profit_percentage,
        exemptFromVAT: item.exempt_from_vat,
        photoUrl: item.photo_url || '',
        providerId: item.provider_id,
        updatedAt: item.updated_at,
      }));

      console.log('🟢 [Supabase] Cargados:', products.length);
      set({ products, loading: false });
    } catch (err: any) {
      console.error('🔴 [Supabase] ERROR load:', err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));

