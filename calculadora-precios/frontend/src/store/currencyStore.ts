import { create } from 'zustand';

interface CurrencyStore {
  rate: number;
  setRate: (rate: number) => void;
  clearRate: () => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  rate: 0,
  setRate: (rate) => set({ rate }),
  clearRate: () => set({ rate: 0 }),
}));
