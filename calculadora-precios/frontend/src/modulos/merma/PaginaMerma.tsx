import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertirEntradaANumero } from '@/utilidades/decimales';
import { CampoSeguro } from '@/componentes/ui/CampoSeguro';
import { TrendingDown } from 'lucide-react';

export function PaginaMerma() {
  const [kilosFactura, fijarKilosFactura] = useState<string>('');
  const [kilosLlegaron, fijarKilosLlegaron] = useState<string>('');

  const factura = convertirEntradaANumero(kilosFactura);
  const llegaron = convertirEntradaANumero(kilosLlegaron);

  // Los kilos que faltaron nunca son negativos: si llego MAS de lo facturado no
  // hay merma, hay sobrante. El porcentaje se topa igual que los kilos porque
  // antes solo se topaban los kilos: al recibir de mas, la pantalla mostraba un
  // "-3.50%" enorme y al mismo tiempo escondia la linea de kilos (que exige
  // > 0), asi que los dos numeros se contradecian.
  const faltante = factura > 0 ? Math.max(0, factura - llegaron) : null;
  const kilosMerma = faltante;
  const porcentajeMerma = faltante !== null ? (faltante / factura * 100).toFixed(2) : null;
  const mermaNumerica = porcentajeMerma !== null ? parseFloat(porcentajeMerma) : 0;

  const severidadSegunMerma = (pct: number) => {
    if (pct <= 2) return { color: '#009A3A', etiqueta: 'Normal', brillo: 'rgba(0,154,58,0.3)' };
    if (pct <= 5) return { color: '#f59e0b', etiqueta: 'Moderada', brillo: 'rgba(245,158,11,0.3)' };
    return { color: '#C8102E', etiqueta: 'Alta', brillo: 'rgba(200,16,46,0.3)' };
  };

  const severidad = mermaNumerica > 0 ? severidadSegunMerma(mermaNumerica) : null;

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
              <CampoSeguro
                value={kilosFactura}
                onChange={fijarKilosFactura}
                placeholder="0.00"
                inputMode="decimal"
                editable
                sinAnillo
                claseTextoVisible="!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl !text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                Kilos que Llegaron
              </label>
              <CampoSeguro
                value={kilosLlegaron}
                onChange={fijarKilosLlegaron}
                placeholder="0.00"
                inputMode="decimal"
                editable
                sinAnillo
                claseTextoVisible="!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl !text-lg"
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
            {severidad && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top right, ${severidad.brillo.replace('0.3', '0.06')} 0%, transparent 55%)` }}
              />
            )}
          </AnimatePresence>

          <h2 className="font-black text-[#e6edf3] uppercase tracking-wide mb-5 relative z-10"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em' }}>
            Resultado
          </h2>

          <AnimatePresence mode="wait">
            {porcentajeMerma !== null && kilosFactura ? (
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
                    background: severidad ? `rgba(${hexARgb(severidad.color)},0.08)` : 'rgba(0,154,58,0.08)',
                    border: `1px solid ${severidad ? severidad.color : '#009A3A'}30`,
                    boxShadow: severidad ? `0 0 30px ${severidad.brillo}` : undefined,
                  }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: severidad?.color || '#009A3A' }}>
                    Porcentaje de Merma
                  </div>
                  <div className="font-black leading-none mb-1"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 'clamp(3rem,10vw,5rem)',
                      color: severidad?.color || '#009A3A',
                      textShadow: `0 0 40px ${severidad?.brillo || 'rgba(0,154,58,0.4)'}`,
                    }}>
                    {porcentajeMerma}<span style={{ fontSize: '0.45em' }}>%</span>
                  </div>
                  {severidad && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                      style={{
                        background: `rgba(${hexARgb(severidad.color)},0.12)`,
                        border: `1px solid ${severidad.color}40`,
                        color: severidad.color,
                      }}>
                      Merma {severidad.etiqueta}
                    </span>
                  )}
                </div>

                {/* Kilos perdidos */}
                {kilosMerma !== null && kilosMerma > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[#8b949e] text-sm"
                  >
                    <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {kilosMerma.toFixed(2)} kg
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

function hexARgb(hex: string): string {
  const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!resultado) return '0,154,58';
  return `${parseInt(resultado[1], 16)},${parseInt(resultado[2], 16)},${parseInt(resultado[3], 16)}`;
}
