import { create } from 'zustand';

// OJO: esta cadena es la llave con la que se guarda en localStorage del navegador.
// No se traduce: si cambia, se pierde la tasa que el usuario ya tenía guardada.
const CLAVE_ALMACENAMIENTO = 'currency-storage';

// La tasa BCV solo vale para el dia en que se cargo; al cambiar de dia se
// descarta para que el modal la vuelva a pedir (no toca como se usa la tasa
// en los calculos, solo de donde se lee al arrancar la app).
function claveDeHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function leerTasaGuardada(): number {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) return 0;
    // Las llaves 'rate' y 'date' son el formato que ya está guardado en el
    // navegador; se renombran aquí al leerlas, pero en localStorage siguen igual.
    const { rate: tasa, date: fecha } = JSON.parse(crudo) as { rate: number; date: string };
    return fecha === claveDeHoy() && typeof tasa === 'number' ? tasa : 0;
  } catch {
    return 0;
  }
}

function guardarTasa(tasa: number) {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify({ rate: tasa, date: claveDeHoy() }));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena); la tasa solo no persiste.
  }
}

interface EstadoMoneda {
  tasa: number;
  fijarTasa: (tasa: number) => void;
  borrarTasa: () => void;
}

export const useAlmacenMoneda = create<EstadoMoneda>((set) => ({
  tasa: leerTasaGuardada(),
  fijarTasa: (tasa) => {
    guardarTasa(tasa);
    set({ tasa });
  },
  borrarTasa: () => {
    guardarTasa(0);
    set({ tasa: 0 });
  },
}));
