import { create } from 'zustand';

export type TipoAviso = 'success' | 'error' | 'info';

interface EstadoAvisos {
  mensaje: string | null;
  tipo: TipoAviso;
  mostrar: (mensaje: string, tipo?: TipoAviso) => void;
  ocultar: () => void;
}

export const useAlmacenAvisos = create<EstadoAvisos>((set) => ({
  mensaje: null,
  tipo: 'info',
  mostrar: (mensaje, tipo = 'info') => set({ mensaje, tipo }),
  ocultar: () => set({ mensaje: null }),
}));
