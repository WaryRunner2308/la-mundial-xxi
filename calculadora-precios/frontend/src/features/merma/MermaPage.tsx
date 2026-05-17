import React, { useState } from 'react';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';

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
              <SecureInput
                value={kilosFactura}
                onChange={setKilosFactura}
                placeholder="0.00"
                inputMode="decimal"
                editable
                noRing={true}
                displayClassName="border border-gray-300 rounded-lg px-4 py-3 outline-none transition bg-white focus:ring-0 focus:border-gray-300 text-lg"
              />
            </div>

            <div>
              <label htmlFor="kilosLlegaron" className="block text-sm font-medium text-gray-700 mb-2">
                Kilos que Llegaron
              </label>
              <SecureInput
                value={kilosLlegaron}
                onChange={setKilosLlegaron}
                placeholder="0.00"
                inputMode="decimal"
                editable
                noRing={true}
                displayClassName="border border-gray-300 rounded-lg px-4 py-3 outline-none transition bg-white focus:ring-0 focus:border-gray-300 text-lg"
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
