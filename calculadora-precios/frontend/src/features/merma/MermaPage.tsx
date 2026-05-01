import React, { useState } from 'react';
import { validateDecimalInput, parseNumericInput } from '@/utils/validateDecimal';

export function MermaPage() {
  const [kilosFactura, setKilosFactura] = useState<string>('');
  const [kilosLlegaron, setKilosLlegaron] = useState<string>('');

  const mermaPercentage = (() => {
    const factura = parseNumericInput(kilosFactura);
    const llegaron = parseNumericInput(kilosLlegaron);

    if (factura <= 0) return null;

    const merma = factura - llegaron;
    const percentage = (merma / factura) * 100;
    return percentage.toFixed(2);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Bienvenido, vamos a sacar la merma
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de Entrada */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Datos de la Merma</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="kilosFactura" className="block text-sm font-medium text-gray-700 mb-2">
                Kilos en Factura
              </label>
                <input
                  id="merma_kilos_factura"
                  name="merma_kilos_factura"
                  type="text"
                  inputMode="decimal"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  autoCapitalize="none"
                  value={kilosFactura}
                  onChange={(e) => setKilosFactura(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg"
                />
            </div>

            <div>
              <label htmlFor="kilosLlegaron" className="block text-sm font-medium text-gray-700 mb-2">
                Kilos que Llegaron
              </label>
                <input
                  id="merma_kilos_llegaron"
                  name="merma_kilos_llegaron"
                  type="text"
                  inputMode="decimal"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  autoCapitalize="none"
                  value={kilosLlegaron}
                  onChange={(e) => setKilosLlegaron(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg"
                />
            </div>
          </div>
        </div>

        {/* Panel de Resultados */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Resultado</h2>
          {mermaPercentage !== null && kilosFactura ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 inline-block">
                  <span className="block text-gray-600 mb-2 text-lg">Porcentaje de Merma</span>
                  <span className="block font-bold text-5xl text-blue-600">
                    {mermaPercentage}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">📊</div>
                <p>Ingresa los datos para ver el porcentaje de merma</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
