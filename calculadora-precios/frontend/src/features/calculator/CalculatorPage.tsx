import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
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

/* ─── Animated Number ─── */
function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const springVal = useSpring(value, { stiffness: 120, damping: 22, restDelta: 0.001 });
  const displayed = useTransform(springVal, (v) => v.toFixed(decimals));

  useEffect(() => {
    springVal.set(value);
  }, [value, springVal]);

  return <motion.span>{displayed}</motion.span>;
}

/* ─── IVA Toggle Switch ─── */
function IVASwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl cursor-pointer select-none transition-colors"
      style={{
        border: `1px solid ${checked ? 'rgba(0,154,58,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: checked ? 'rgba(0,154,58,0.06)' : '#1c2128',
      }}
      onClick={onToggle}
    >
      {/* Switch */}
      <div
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-300"
        style={{ background: checked ? '#009A3A' : '#21262d' }}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
          style={{ background: '#e6edf3' }}
        />
      </div>

      <div>
        <span className="text-sm font-semibold text-[#e6edf3]">
          Aplicar IVA{' '}
          <span className="text-[#8b949e] font-normal">(16%)</span>
        </span>
        <AnimatePresence mode="wait">
          {checked ? (
            <motion.div
              key="on"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold"
              style={{ color: '#009A3A' }}
            >
              Incluido (+16%)
            </motion.div>
          ) : (
            <motion.div
              key="off"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[#484f58]"
            >
              Exento de IVA
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
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
    const divisor = 1 - profit / 100;
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

  const handleCostChange = (value: string) => { const d = { ...formData, cost: value }; setFormData(d); calculate(d); };
  const handleProfitChange = (value: string) => { const d = { ...formData, profitPercentage: value }; setFormData(d); calculate(d); };
  const handleCurrencyToggle = () => {
    const d: CalcFormData = { ...formData, currency: formData.currency === 'Bs' ? 'USD' : 'Bs' };
    setFormData(d); calculate(d);
  };
  const handleIVAToggle = () => {
    const d = { ...formData, aplicarIVA: !formData.aplicarIVA };
    setFormData(d); calculate(d);
  };
  useEffect(() => { calculate(formData); }, [rate]);

  const hasResults = results !== null && rate > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h1 className="font-black text-[#e6edf3] uppercase tracking-wide"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.7rem,4vw,2.4rem)', letterSpacing: '0.06em' }}>
          Calculadora de Precios
        </h1>
        <div className="flex items-center mt-1 gap-2">
          <p className="text-sm text-[#8b949e]">
            {rate > 0
              ? <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>1 USD = {rate.toFixed(2)} Bs</span>
              : '⚠️ Tasa no configurada'}
          </p>
          {rate > 0 && (
            <button onClick={onEditRate}
              className="p-1 rounded-lg text-[#8b949e] hover:text-[#009A3A] transition"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="Editar tasa">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* ─── Input Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-5 md:p-6"
          style={{
            background: '#161b22',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <h2 className="font-black text-[#e6edf3] uppercase tracking-wide mb-5"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em' }}>
            Datos del Producto
          </h2>

          {/* Costo */}
          <div className="mb-5">
            <span className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">Costo *</span>
            <div className="flex rounded-xl overflow-hidden transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#1c2128' }}>
              <div className="flex-1 min-w-0">
                <SecureInput
                  value={formData.cost}
                  onChange={handleCostChange}
                  placeholder="0.00"
                  inputMode="decimal"
                  editable
                  noRing
                  displayClassName="!border-0 !rounded-none !bg-transparent !text-[#e6edf3] !min-h-[48px] flex-1"
                />
              </div>
              <button
                type="button"
                onClick={handleCurrencyToggle}
                className="shrink-0 px-4 py-3 font-bold text-sm transition-all"
                style={{
                  borderLeft: '1px solid rgba(255,255,255,0.07)',
                  background: 'transparent',
                  color: '#009A3A',
                  fontFamily: '"JetBrains Mono", monospace',
                  minWidth: '4rem',
                }}
                title="Cambiar moneda"
              >
                {formData.currency}
              </button>
            </div>
          </div>

          {/* % Ganancia */}
          <div className="mb-5">
            <span className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">% Ganancia *</span>
            <SecureInput
              value={formData.profitPercentage}
              onChange={handleProfitChange}
              placeholder="Ej: 30"
              inputMode="decimal"
              editable
              noRing
              displayClassName="!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl"
            />
          </div>

          {/* IVA Toggle */}
          <IVASwitch checked={formData.aplicarIVA} onToggle={handleIVAToggle} />
        </motion.div>

        {/* ─── Results Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg,#161b22 0%,#1c2128 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* Ambient glow when results exist */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top right, rgba(0,154,58,0.06) 0%, transparent 60%)' }}
              />
            )}
          </AnimatePresence>

          <h2 className="font-black text-[#e6edf3] uppercase tracking-wide mb-5 relative z-10"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em' }}>
            Resultados
          </h2>

          <AnimatePresence mode="wait">
            {hasResults && results ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 relative z-10"
              >
                {/* Precio Final */}
                <div className="p-5 rounded-2xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg,rgba(0,154,58,0.12) 0%,rgba(0,154,58,0.04) 100%)',
                    border: '1px solid rgba(0,154,58,0.2)',
                    boxShadow: '0 0 24px rgba(0,154,58,0.08)',
                  }}>
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(0,154,58,0.08) 0%, transparent 50%)' }} />
                  <span className="block text-xs font-black text-[#009A3A] uppercase tracking-widest mb-2">
                    Precio Final {formData.aplicarIVA && <span className="text-[#1ebb60]">· con IVA</span>}
                  </span>
                  <span className="block font-black leading-none mb-1 relative z-10"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 'clamp(1.8rem,5vw,2.6rem)',
                      color: '#009A3A',
                      textShadow: '0 0 30px rgba(0,154,58,0.4)',
                    }}>
                    <AnimatedNumber value={results.priceWithVAT} />
                    {' '}
                    <span style={{ fontSize: '0.45em', color: '#1ebb60' }}>{results.currency}</span>
                  </span>
                  {rate > 0 && results.priceWithVATConverted !== undefined && (
                    <span className="block text-sm text-[#8b949e]"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      <AnimatedNumber value={results.priceWithVATConverted} />
                      {' '}{results.currency === 'Bs' ? 'USD' : 'Bs'}
                    </span>
                  )}
                </div>

                {/* Ganancia */}
                <div className="p-5 rounded-2xl"
                  style={{
                    background: '#1c2128',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <span className="block text-xs font-black text-[#8b949e] uppercase tracking-widest mb-2">
                    Ganancia (Utilidad)
                  </span>
                  <span className="block font-black leading-none mb-1"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 'clamp(1.6rem,4vw,2.2rem)',
                      color: '#1ebb60',
                    }}>
                    <AnimatedNumber value={results.utility} />
                    {' '}
                    <span style={{ fontSize: '0.45em', color: '#8b949e' }}>{results.currency}</span>
                  </span>
                  {rate > 0 && results.utilityConverted !== undefined && (
                    <span className="block text-sm text-[#8b949e]"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      <AnimatedNumber value={results.utilityConverted} />
                      {' '}{results.currency === 'Bs' ? 'USD' : 'Bs'}
                    </span>
                  )}
                </div>

                {/* % Margen info */}
                {formData.profitPercentage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-xs text-[#8b949e] uppercase tracking-wider">Margen aplicado</span>
                    <span className="font-bold text-[#e6edf3]"
                      style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem' }}>
                      {formData.profitPercentage}%
                    </span>
                    <AnimatePresence>
                      {formData.aplicarIVA && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-xs px-2 py-0.5 rounded-full font-black uppercase tracking-wider"
                          style={{ background: 'rgba(0,154,58,0.15)', color: '#009A3A', border: '1px solid rgba(0,154,58,0.25)' }}
                        >
                          + IVA 16%
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-56 relative z-10"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                    🧮
                  </div>
                  <p className="text-sm font-semibold text-[#8b949e]">Ingresa datos para ver resultados</p>
                  {rate === 0 && (
                    <p className="text-xs text-[#C8102E] mt-2">
                      ⚠️ Configura la tasa de cambio primero
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
