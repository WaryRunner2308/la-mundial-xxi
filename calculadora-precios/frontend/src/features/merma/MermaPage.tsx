import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';
import { TrendingDown } from 'lucide-react';

export function MermaPage() {
  const [kilosFactura, setKilosFactura] = useState<string>('');
  const [kilosLlegaron, setKilosLlegaron] = useState<string>('');

  const factura = parseNumericInput(kilosFactura);
  const llegaron = parseNumericInput(kilosLlegaron);

  const mermaKilos = factura > 0 ? Math.max(0, factura - llegaron) : null;
  const mermaPercentage = factura > 0 ? ((factura - llegaron) / factura * 100).toFixed(2) : null;
  const mermaNum = mermaPercentage !== null ? parseFloat(mermaPercentage) : 0;

  const getSeverity = (pct: number) => {
    if (pct <= 2) return { color: '#009A3A', label: 'Normal', glow: 'rgba(0,154,58,0.3)' };
    if (pct <= 5) return { color: '#f59e0b', label: 'Moderada', glow: 'rgba(245,158,11,0.3)' };
    return { color: '#C8102E', label: 'Alta', glow: 'rgba(200,16,46,0.3)' };
  };

  const severity = mermaNum > 0 ? getSeverity(mermaNum) : null;

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
          Cálculo de Merma
        </h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Calcula la diferencia entre la factura y lo que realmente llegó.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* ─── Input Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl p-5 md:p-6"
          style={{
            background: '#161b22',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)' }}>
              <TrendingDown size={18} style={{ color: '#C8102E' }} strokeWidth={2} />
            </div>
            <h2 className="font-black text-[#e6edf3] uppercase tracking-wide"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em' }}>
              Datos de la Merma
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                Kilos en Factura
              </label>
              <SecureInput
                value={kilosFactura}
                onChange={setKilosFactura}
                placeholder="0.00"
                inputMode="decimal"
                editable
                noRing
                displayClassName="!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl !text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                Kilos que Llegaron
              </label>
              <SecureInput
                value={kilosLlegaron}
                onChange={setKilosLlegaron}
                placeholder="0.00"
                inputMode="decimal"
                editable
                noRing
                displayClassName="!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl !text-lg"
              />
            </div>

            {/* Quick info */}
            {factura > 0 && llegaron > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 pt-1"
              >
                <div className="p-3 rounded-xl text-center"
                  style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs text-[#484f58] uppercase tracking-wider mb-1">Factura</div>
                  <div className="font-black text-[#e6edf3]"
                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>
                    {factura.toFixed(2)} <span className="text-[#8b949e] text-xs">kg</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl text-center"
                  style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs text-[#484f58] uppercase tracking-wider mb-1">Llegaron</div>
                  <div className="font-black text-[#e6edf3]"
                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>
                    {llegaron.toFixed(2)} <span className="text-[#8b949e] text-xs">kg</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ─── Result Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg,#161b22 0%,#1c2128 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* Ambient */}
          <AnimatePresence>
            {severity && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top right, ${severity.glow.replace('0.3', '0.06')} 0%, transparent 55%)` }}
              />
            )}
          </AnimatePresence>

          <h2 className="font-black text-[#e6edf3] uppercase tracking-wide mb-5 relative z-10"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em' }}>
            Resultado
          </h2>

          <AnimatePresence mode="wait">
            {mermaPercentage !== null && kilosFactura ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                className="flex flex-col items-center justify-center h-56 relative z-10 space-y-4"
              >
                {/* Main percentage */}
                <div className="text-center p-6 rounded-2xl w-full"
                  style={{
                    background: severity ? `rgba(${hexToRgb(severity.color)},0.08)` : 'rgba(0,154,58,0.08)',
                    border: `1px solid ${severity ? severity.color : '#009A3A'}30`,
                    boxShadow: severity ? `0 0 30px ${severity.glow}` : undefined,
                  }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: severity?.color || '#009A3A' }}>
                    Porcentaje de Merma
                  </div>
                  <div className="font-black leading-none mb-1"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 'clamp(3rem,10vw,5rem)',
                      color: severity?.color || '#009A3A',
                      textShadow: `0 0 40px ${severity?.glow || 'rgba(0,154,58,0.4)'}`,
                    }}>
                    {mermaPercentage}<span style={{ fontSize: '0.45em' }}>%</span>
                  </div>
                  {severity && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                      style={{
                        background: `rgba(${hexToRgb(severity.color)},0.12)`,
                        border: `1px solid ${severity.color}40`,
                        color: severity.color,
                      }}>
                      Merma {severity.label}
                    </span>
                  )}
                </div>

                {/* Kilos perdidos */}
                {mermaKilos !== null && mermaKilos > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[#8b949e] text-sm"
                  >
                    <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {mermaKilos.toFixed(2)} kg
                    </span>{' '}
                    perdidos de factura
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
                    📊
                  </div>
                  <p className="text-sm font-semibold text-[#8b949e]">
                    Ingresa los datos para ver el porcentaje de merma
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,154,58';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
