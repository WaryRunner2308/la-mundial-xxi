import { create } from 'zustand';

const STORAGE_KEY = 'currency-storage';

// La tasa BCV solo vale para el dia en que se cargo; al cambiar de dia se
// descarta para que el modal la vuelva a pedir (no toca como se usa la tasa
// en los calculos, solo de donde se lee al arrancar la app).
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function readPersistedRate(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const { rate, date } = JSON.parse(raw) as { rate: number; date: string };
    return date === todayKey() && typeof rate === 'number' ? rate : 0;
  } catch {
    return 0;
  }
}

function persistRate(rate: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, date: todayKey() }));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena); la tasa solo no persiste.
  }
}

interface CurrencyStore {
  rate: number;
  setRate: (rate: number) => void;
  clearRate: () => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  rate: readPersistedRate(),
  setRate: (rate) => {
    persistRate(rate);
    set({ rate });
  },
  clearRate: () => {
    persistRate(0);
    set({ rate: 0 });
  },
}));
