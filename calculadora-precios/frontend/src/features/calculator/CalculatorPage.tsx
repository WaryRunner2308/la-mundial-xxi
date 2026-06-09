import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatAmountWithCurrency } from '@/utils/format';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';

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

  const handleCostChange = (value: string) => {
    setFormData(prev => ({ ...prev, cost: value }));
    calculate({ ...formData, cost: value });
  };

  const handleProfitChange = (value: string) => {
    setFormData(prev => ({ ...prev, profitPercentage: value }));
    calculate({ ...formData, profitPercentage: value });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    calculate({ ...formData, currency: newCurrency });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    const newFormData = { ...formData, aplicarIVA: newValue };
    setFormData(newFormData);
    calculate(newFormData);
  };

  useEffect(() => {
    calculate(formData);
  }, [rate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">
          Calculadora de Precios
        </h1>
        <div className="flex items-center mt-1">
          <p className="text-sm text-ink-3 font-mono num">
            {rate > 0 ? `1 USD = ${rate.toFixed(2)} Bs` : 'Tasa no configurada'}
          </p>
          {rate > 0 && (
            <button
              onClick={onEditRate}
              className="ml-2 p-1.5 text-ink-4 hover:text-price hover:bg-price-subtle rounded transition"
              title="Editar tasa"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Panel de Entrada */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-5">Datos del Producto</h2>

          {/* Costo con selector de moneda */}
          <div className="mb-5">
            <span className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
              Costo
            </span>
            <div className="flex rounded-lg border border-line-strong overflow-hidden focus-within:ring-2 focus-within:ring-price">
              <div className="flex-1 min-w-0">
                <SecureInput
                  value={formData.cost}
                  onChange={handleCostChange}
                  placeholder="0.00"
                  inputMode="decimal"
                  editable
                  displayClassName="border-0 rounded-none focus:ring-0 focus:border-none bg-surface text-ink text-base min-h-[44px] flex-1 font-mono num"
                />
              </div>
              <select
                value={formData.currency}
                onChange={handleCurrencyChange}
                className="w-20 px-3 py-2 border-0 border-l border-line rounded-none focus:ring-0 bg-canvas text-ink-2 text-sm font-semibold cursor-pointer shrink-0"
              >
                <option value="Bs">Bs</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* % Ganancia */}
          <div className="mb-5">
            <span className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
              % Ganancia
            </span>
            <SecureInput
              value={formData.profitPercentage}
              onChange={handleProfitChange}
              placeholder="Ej: 30"
              inputMode="decimal"
              editable
            />
          </div>

          {/* IVA Checkbox */}
          <div className="flex items-center p-3 border border-line rounded-lg bg-canvas">
            <input
              id="calc_aplicarIVA"
              type="checkbox"
              checked={formData.aplicarIVA}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-profit border-line-strong rounded focus:ring-profit"
            />
            <span
              className="ml-3 text-sm font-medium text-ink-2 cursor-pointer flex-1"
              onClick={() => setFormData(prev => ({ ...prev, aplicarIVA: !prev.aplicarIVA }))}
            >
              Aplicar IVA (16%)
            </span>
          </div>
        </div>

        {/* Panel de Resultados */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-5">Resultados</h2>
          {results && rate > 0 ? (
            <div className="space-y-3">
              {/* Precio Final */}
              <div className="p-5 bg-price-subtle rounded-xl border border-price/20">
                <span className="block text-xs font-semibold text-ink-4 uppercase tracking-wider mb-1">Precio Final</span>
                <span className="block font-bold text-3xl text-price font-mono num mb-0.5">
                  {formatAmountWithCurrency(results.priceWithVAT, results.currency)}
                </span>
                {rate > 0 && results.priceWithVATConverted !== undefined && (
                  <span className="block text-sm text-ink-4 font-mono num border-t border-price/15 pt-1 mt-1">
                    {formatAmountWithCurrency(results.priceWithVATConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>

              {/* Ganancia */}
              <div className="p-5 bg-profit-subtle rounded-xl border border-profit/20">
                <span className="block text-xs font-semibold text-ink-4 uppercase tracking-wider mb-1">Ganancia</span>
                <span className="block font-bold text-3xl text-profit font-mono num mb-0.5">
                  {formatAmountWithCurrency(results.utility, results.currency)}
                </span>
                {rate > 0 && results.utilityConverted !== undefined && (
                  <span className="block text-sm text-ink-4 font-mono num border-t border-profit/15 pt-1 mt-1">
                    {formatAmountWithCurrency(results.utilityConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-52 text-ink-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="8" x2="16" y1="10" y2="10"/><line x1="8" x2="12" y1="14" y2="14"/>
                  </svg>
                </div>
                <p className="text-sm">Ingresa datos para ver resultados</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
