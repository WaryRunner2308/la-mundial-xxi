import React, { useState, useEffect, useRef } from 'react';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatAmountWithCurrency } from '@/utils/format';
import { parseNumericInput } from '@/utils/validateDecimal';

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

  // Refs para displays
  const costDisplayRef = useRef<HTMLDivElement>(null);
  const profitDisplayRef = useRef<HTMLDivElement>(null);

  // Refs para inputs fantasma
  const costInputRef = useRef<HTMLInputElement>(null);
  const profitInputRef = useRef<HTMLInputElement>(null);

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

  // Handlers de inputs fantasma
  const handleCostProxyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.,]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setFormData(prev => ({ ...prev, cost: value }));
    calculate({ ...formData, cost: value });
    if (costDisplayRef.current) {
      costDisplayRef.current.textContent = value;
    }
  };

  const handleProfitProxyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.,]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setFormData(prev => ({ ...prev, profitPercentage: value }));
    calculate({ ...formData, profitPercentage: value });
    if (profitDisplayRef.current) {
      profitDisplayRef.current.textContent = value;
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    calculate({ ...formData, currency: newCurrency });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setFormData(prev => ({ ...prev, aplicarIVA: newValue }));
    calculate({ ...formData, aplicarIVA: newValue });
  };

  // Focus handlers - redirigen a inputs fantasma
  const handleCostFocus = () => {
    if (costInputRef.current) costInputRef.current.focus();
  };

  const handleProfitFocus = () => {
    if (profitInputRef.current) profitInputRef.current.focus();
  };

  useEffect(() => {
    calculate(formData);
  }, [rate]);

  // Generate unique IDs to break Chrome's form history
  const ts = Date.now();
  const calcFormId = `calc_form_${ts}`;
  const fieldCostId = `calc_ct_${Math.random().toString(36).substring(2)}`;
  const fieldProfitId = `calc_pf_${Math.random().toString(36).substring(2)}`;

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
        {/* Panel de Entrada */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Datos del Producto</h2>

          {/* INPUTS FANTASMA - Técnica anti-autocomplete avanzada */}
          <div style={{ position: 'absolute', left: '-1000px', top: '-1000px', opacity: 0, height: 0, width: 0, overflow: 'hidden' }}>
            <input
              ref={costInputRef}
              type="text"
              name={fieldCostId}
              inputMode="decimal"
              data-1p-ignore
              data-lpignore="true"
              autoComplete="new-random-calc-cost"
              readOnly
              onFocus={(e) => { (e.target as HTMLInputElement).readOnly = false; }}
              value={formData.cost}
              onChange={handleCostProxyChange}
              tabIndex={-1}
              aria-hidden="true"
              style={{ pointerEvents: 'none' }}
            />
            <input
              ref={profitInputRef}
              type="text"
              name={fieldProfitId}
              inputMode="decimal"
              data-1p-ignore
              data-lpignore="true"
              autoComplete="new-random-calc-profit"
              readOnly
              onFocus={(e) => { (e.target as HTMLInputElement).readOnly = false; }}
              value={formData.profitPercentage}
              onChange={handleProfitProxyChange}
              tabIndex={-1}
              aria-hidden="true"
              style={{ pointerEvents: 'none' }}
            />
          </div>

          {/* Costo con selector de moneda */}
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Costo *
            </span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <div
                ref={costDisplayRef}
                contentEditable={true}
                onFocus={handleCostFocus}
                className="flex-1 min-w-0 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-white text-base md:text-lg min-h-[48px]"
                style={{ outline: 'none' }}
                suppressContentEditableWarning
              />
              <select
                value={formData.currency}
                onChange={handleCurrencyChange}
                className="w-20 md:w-32 px-4 py-3 border-0 rounded-none focus:ring-0 focus:border-none bg-gray-50 text-gray-700 text-sm md:text-base font-medium cursor-pointer shrink-0"
              >
                <option value="Bs">Bs</option>
                <option value="USD">$</option>
              </select>
            </div>
          </div>

          {/* % Ganancia */}
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              % Ganancia *
            </span>
            <div
              ref={profitDisplayRef}
              contentEditable={true}
              onFocus={handleProfitFocus}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base md:text-lg min-h-[48px]"
              style={{ outline: 'none' }}
              suppressContentEditableWarning
            />
          </div>

          {/* IVA Checkbox */}
          <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <input
              id="calc_aplicarIVA"
              type="checkbox"
              checked={formData.aplicarIVA}
              onChange={handleCheckboxChange}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-1" onClick={() => setFormData(prev => ({ ...prev, aplicarIVA: !prev.aplicarIVA }))}>
              Aplicar IVA (16%)
            </span>
          </div>
        </div>

        {/* Panel de Resultados */}
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
