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
    cost: '', currency: 'Bs', profitPercentage: '', aplicarIVA: false,
  });
  const [results, setResults] = useState<CalcResults | null>(null);

  const calculate = (data: CalcFormData) => {
    const cost = parseNumericInput(data.cost);
    const profit = parseNumericInput(data.profitPercentage);
    if (cost <= 0 || profit < 0 || profit >= 100) { setResults(null); return; }
    const divisor = 1 - (profit / 100);
    const priceBase = cost / divisor;
    const utility = priceBase - cost;
    const priceWithVAT = data.aplicarIVA ? priceBase * 1.16 : priceBase;
    let priceWithVATConverted = priceWithVAT;
    let utilityConverted = utility;
    if (rate > 0) {
      if (data.currency === 'Bs') { priceWithVATConverted = priceWithVAT / rate; utilityConverted = utility / rate; }
      else { priceWithVATConverted = priceWithVAT * rate; utilityConverted = utility * rate; }
    }
    setResults({
      priceWithVAT: Number(priceWithVAT.toFixed(2)),
      utility: Number(utility.toFixed(2)),
      currency: data.currency,
      priceWithVATConverted: Number(priceWithVATConverted.toFixed(2)),
      utilityConverted: Number(utilityConverted.toFixed(2)),
    });
  };

  const handleCostChange = (value: string) => { setFormData(prev => ({ ...prev, cost: value })); calculate({ ...formData, cost: value }); };
  const handleProfitChange = (value: string) => { setFormData(prev => ({ ...prev, profitPercentage: value })); calculate({ ...formData, profitPercentage: value }); };
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
  useEffect(() => { calculate(formData); }, [rate]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="animate-fade-up">
        <h1
          className="font-black text-[#0d1f14] uppercase tracking-wide"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', letterSpacing: '0.06em' }}
        >
          Calculadora de Precios
        </h1>
        <div className="flex items-center mt-1 gap-2">
          <p className="text-sm text-[#7aaa8a]">
            {rate > 0
              ? <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>1 USD = {rate.toFixed(2)} Bs</span>
              : '⚠️ Tasa no configurada'}
          </p>
          {rate > 0 && (
            <button onClick={onEditRate} className="p-1 text-[#7aaa8a] hover:text-[#009A3A] hover:bg-[#e8f7ed] rounded-lg transition" title="Editar tasa">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* Input Panel */}
        <div className="animate-fade-up-1 card-lift bg-white border border-[#e4ede6] rounded-2xl p-5 md:p-6 shadow-sm">
          <h2
            className="font-black text-[#0d1f14] uppercase tracking-wide mb-5"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem', letterSpacing: '0.06em' }}
          >
            Datos del Producto
          </h2>

          {/* Costo */}
          <div className="mb-5">
            <span className="block text-xs font-black text-[#3d6b4f] mb-2 uppercase tracking-wider">Costo *</span>
            <div className="flex rounded-xl border border-[#e4ede6] overflow-hidden focus-within:border-[#009A3A]/40 transition-colors bg-[#f5f8f5]">
              <div className="flex-1 min-w-0">
                <SecureInput
                  value={formData.cost}
                  onChange={handleCostChange}
                  placeholder="0.00"
                  inputMode="decimal"
                  editable
                  noRing
                  displayClassName="!border-0 !rounded-none !bg-transparent !text-[#0d1f14] focus:!ring-0 text-base md:text-lg !min-h-[48px] flex-1"
                />
              </div>
              <select
                value={formData.currency}
                onChange={handleCurrencyChange}
                className="w-20 md:w-24 px-3 py-3 border-0 border-l border-[#e4ede6] bg-white text-[#3d6b4f] text-sm font-bold cursor-pointer shrink-0 outline-none hover:bg-[#f5f8f5] transition-colors"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                <option value="Bs">Bs</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* % Ganancia */}
          <div className="mb-5">
            <span className="block text-xs font-black text-[#3d6b4f] mb-2 uppercase tracking-wider">% Ganancia *</span>
            <SecureInput
              value={formData.profitPercentage}
              onChange={handleProfitChange}
              placeholder="Ej: 30"
              inputMode="decimal"
              editable
              noRing
              displayClassName="!bg-[#f5f8f5] !border-[#e4ede6] !text-[#0d1f14] !rounded-xl"
            />
          </div>

          {/* IVA Toggle */}
          <div
            className="flex items-center gap-3 p-4 border border-[#e4ede6] rounded-xl bg-[#f5f8f5] cursor-pointer hover:border-[#009A3A]/30 transition-colors"
            onClick={() => {
              const newFormData = { ...formData, aplicarIVA: !formData.aplicarIVA };
              setFormData(newFormData);
              calculate(newFormData);
            }}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${formData.aplicarIVA ? 'bg-[#009A3A] border-[#009A3A]' : 'border-[#c8ddd0] bg-white'}`}>
              {formData.aplicarIVA && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input id="calc_aplicarIVA" type="checkbox" checked={formData.aplicarIVA} onChange={handleCheckboxChange} className="sr-only" />
            <span className="text-sm font-semibold text-[#3d6b4f] select-none">
              Aplicar IVA <span className="text-[#7aaa8a]">(16%)</span>
            </span>
          </div>
        </div>

        {/* Results Panel */}
        <div className="animate-fade-up-2 card-lift bg-white border border-[#e4ede6] rounded-2xl p-5 md:p-6 shadow-sm">
          <h2
            className="font-black text-[#0d1f14] uppercase tracking-wide mb-5"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem', letterSpacing: '0.06em' }}
          >
            Resultados
          </h2>

          {results && rate > 0 ? (
            <div className="space-y-4">
              {/* Precio Final */}
              <div className="p-5 bg-[#e8f7ed] border border-[#009A3A]/15 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(0,154,58,0.06) 0%, transparent 60%)' }} />
                <span className="block text-xs font-black text-[#3d6b4f] uppercase tracking-widest mb-2">Precio Final</span>
                <span
                  className="animate-number-pop block font-black text-[#009A3A] leading-none mb-1"
                  style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)' }}
                >
                  {formatAmountWithCurrency(results.priceWithVAT, results.currency)}
                </span>
                {rate > 0 && results.priceWithVATConverted !== undefined && (
                  <span className="block text-sm text-[#7aaa8a]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {formatAmountWithCurrency(results.priceWithVATConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>

              {/* Ganancia */}
              <div className="p-5 bg-[#f5f8f5] border border-[#e4ede6] rounded-2xl">
                <span className="block text-xs font-black text-[#7aaa8a] uppercase tracking-widest mb-2">Ganancia</span>
                <span
                  className="animate-number-pop block font-black text-[#3d6b4f] leading-none mb-1"
                  style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)' }}
                >
                  {formatAmountWithCurrency(results.utility, results.currency)}
                </span>
                {rate > 0 && results.utilityConverted !== undefined && (
                  <span className="block text-sm text-[#7aaa8a]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {formatAmountWithCurrency(results.utilityConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-56">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#f0f5f2] border border-[#e4ede6] rounded-2xl flex items-center justify-center text-3xl">🧮</div>
                <p className="text-sm font-semibold text-[#7aaa8a]">Ingresa datos para ver resultados</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
