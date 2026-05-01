import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatAmountWithCurrency } from '@/utils/format';
import { validateDecimalInput, parseNumericInput } from '@/utils/validateDecimal';

type Currency = 'Bs' | 'USD';

interface CalcFormData {
  cost: string;
  currency: Currency;
  profitPercentage: string;
  aplicarIVA: boolean;
}

interface CalcResults {
  priceWithVAT: number;
  utility: number;
  currency: Currency;
  priceWithVATConverted?: number;
  utilityConverted?: number;
}

interface CalculatorPageProps {
  onEditRate: () => void;
}

export function CalculatorPage({ onEditRate }: CalculatorPageProps) {
  const rate = useCurrencyStore((state) => state.rate);
  const [formData, setFormData] = useState<CalcFormData>({
    cost: '',
    currency: 'Bs',
    profitPercentage: '',
    aplicarIVA: false,
  });
  const [results, setResults] = useState<CalcResults | null>(null);

  const calculate = (data: CalcFormData) => {
  const cost = parseNumericInput(data.cost);
  const profit = parseNumericInput(data.profitPercentage);

    if (cost <= 0 || profit < 0 || profit >= 100) {
      setResults(null);
      return;
    }

    const divisor = 1 - (profit / 100);
    const priceBase = cost / divisor;
    const utility = priceBase - cost;
    const priceWithVAT = data.aplicarIVA ? priceBase * 1.16 : priceBase;

    let priceWithVATConverted = priceWithVAT;
    let utilityConverted = utility;

    if (rate > 0) {
      if (data.currency === 'Bs') {
        priceWithVATConverted = priceWithVAT / rate;
        utilityConverted = utility / rate;
      } else {
        priceWithVATConverted = priceWithVAT * rate;
        utilityConverted = utility * rate;
      }
    }

    setResults({
      priceWithVAT: Number(priceWithVAT.toFixed(2)),
      utility: Number(utility.toFixed(2)),
      currency: data.currency,
      priceWithVATConverted: Number(priceWithVATConverted.toFixed(2)),
      utilityConverted: Number(utilityConverted.toFixed(2)),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newData = { ...formData };

    if (name === 'calc_cost_field') {
      newData.cost = value;
    } else if (name === 'calc_profit_field') {
      newData.profitPercentage = value;
    } else if (name === 'calc_currency_field') {
      newData.currency = value as Currency;
    } else {
      newData[name] = value;
    }

    setFormData(newData);
    calculate(newData);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...formData, aplicarIVA: e.target.checked };
    setFormData(newData);
    calculate(newData);
  };

  useEffect(() => {
    calculate(formData);
  }, [rate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Calculadora de Precios
        </h1>
        <div className="flex items-center mt-2">
          <p className="text-sm md:text-base text-gray-500">
            {rate > 0 ? `Tasa: 1 USD = ${rate.toFixed(2)} Bs` : '⚠️ Tasa no configurada'}
          </p>
          {rate > 0 && (
            <button
              onClick={onEditRate}
              className="ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Editar tasa"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de Entrada - Izquierda en desktop, arriba en mobile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Datos del Producto</h2>
          <div className="space-y-6">
            {/* Costo con selector de moneda integrado */}
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
                Costo *
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <input
                    id="calc_cost_field"
                    name="calc_cost_field"
                    type="text"
                    inputMode="decimal"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    autoCapitalize="none"
                    value={formData.cost}
                    onChange={(e) => {
                      const newFormData = { ...formData, cost: e.target.value };
                      setFormData(newFormData);
                      calculate(newFormData);
                    }}
                    required={false}
                    className="flex-1 min-w-0 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-white text-base md:text-lg"
                  />
                <select
                  name="calc_currency_field"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-20 md:w-32 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-gray-50 text-gray-700 text-sm md:text-base font-medium cursor-pointer shrink-0"
                >
                  <option value="Bs">Bs</option>
                  <option value="USD">$</option>
                </select>
              </div>
            </div>

            {/* % Ganancia */}
            <div>
              <label htmlFor="profitPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                % Ganancia *
              </label>
              <input
                id="calc_profit_field"
                name="calc_profit_field"
                type="text"
                inputMode="decimal"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck="false"
                autoCapitalize="none"
                value={formData.profitPercentage}
                onChange={(e) => {
                  const newFormData = { ...formData, profitPercentage: e.target.value };
                  setFormData(newFormData);
                  calculate(newFormData);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base md:text-lg"
              />
            </div>

            {/* IVA Checkbox */}
            <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
              <input
                id="aplicarIVA"
                name="aplicarIVA"
                type="checkbox"
                checked={formData.aplicarIVA}
                onChange={handleCheckboxChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplicarIVA" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-1">
                Aplicar IVA (16%)
              </label>
            </div>
          </div>
        </div>

        {/* Panel de Resultados - Derecha en desktop, abajo en mobile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Resultados</h2>
          {results && rate > 0 ? (
            <div className="space-y-4">
              {/* Precio Final */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                <span className="block text-gray-600 mb-2 text-lg">Precio Final</span>
                <span className="block font-bold text-4xl text-blue-600 mb-1">
                  {formatAmountWithCurrency(results.priceWithVAT, results.currency)}
                </span>
                {rate > 0 && results.priceWithVATConverted !== undefined && (
                  <span className="block text-sm text-gray-500">
                    {formatAmountWithCurrency(results.priceWithVATConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>

              {/* Ganancia */}
              <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-100">
                <span className="block text-gray-600 mb-2 text-lg">Ganancia</span>
                <span className="block font-bold text-4xl text-emerald-600 mb-1">
                  {formatAmountWithCurrency(results.utility, results.currency)}
                </span>
                {rate > 0 && results.utilityConverted !== undefined && (
                  <span className="block text-sm text-gray-500">
                    {formatAmountWithCurrency(results.utilityConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">🧮</div>
                <p className="text-base">Ingresa datos para ver resultados</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
