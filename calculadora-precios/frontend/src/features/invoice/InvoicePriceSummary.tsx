import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Store, Landmark, Tags } from 'lucide-react';
import type { InvoiceHistoryEntry } from '@/store/invoiceHistoryStore';
import { construirResumen } from './resumenPrecios';
import { formatAmount } from '@/utils/format';

const VERDE = '#009A3A';
const ROJO = '#C8102E';
const AMBAR = '#fbbf24';

const MONO = '"JetBrains Mono", monospace';
const CONDENSED = '"Barlow Condensed", sans-serif';

// Curva de salida: arranca rápido y frena. La nativa se siente floja.
const SALIDA = [0.23, 1, 0.32, 1] as const;

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface InvoicePriceSummaryProps {
  factura: InvoiceHistoryEntry | null;
  onClose: () => void;
}

/**
 * Resumen de precios de venta: solo nombre y precio, en Bs y en dólares.
 * Pensado para leerse de corrido mientras se marcan los productos.
 */
export function InvoicePriceSummary({ factura, onClose }: InvoicePriceSummaryProps) {
  const sinMovimiento = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const abierto = factura !== null;

  // Bloqueo del scroll de fondo. Aparte del manejo de teclas a propósito: si
  // dependiera de onClose (que el padre recrea en cada render) se estaría
  // soltando y volviendo a poner el bloqueo sin necesidad.
  useEffect(() => {
    if (!abierto) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowPrevio; };
  }, [abierto]);

  // Escape para cerrar
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [abierto, onClose]);

  // Al abrir, el foco entra al panel; al cerrar vuelve a donde estaba. Sin esto
  // el teclado sigue navegando la página de atrás, que ya no se ve.
  useEffect(() => {
    if (!abierto) return;
    const foco = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => foco?.focus?.();
  }, [abierto]);

  const lineas = factura ? construirResumen(factura) : [];
  const hayNoImportados = lineas.some((l) => !l.importado);

  return (
    <AnimatePresence>
      {factura && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[240] flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.24, ease: SALIDA }}
            // Alineada arriba, no centrada: con una factura larga el centrado
            // vertical deja el encabezado fuera de alcance al hacer scroll.
            className="w-full max-w-2xl rounded-2xl overflow-hidden outline-none"
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-resumen-precios"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 24px 64px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Franja portuguesa 2:3 — identifica cada pantalla de la app */}
            <div className="flex h-[3px]">
              <div style={{ flex: 2, background: `linear-gradient(90deg,${VERDE},#1ebb60)` }} />
              <div style={{ flex: 3, background: ROJO }} />
            </div>

            {/* ─── Encabezado ─── */}
            <div
              className="sticky top-0 z-10 px-4 sm:px-6 py-4"
              style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.18)' }}
                >
                  <Tags size={16} style={{ color: VERDE }} />
                </div>

                <div className="flex-1 min-w-0">
                  <h2
                    id="titulo-resumen-precios"
                    className="font-black text-[#e6edf3] uppercase leading-none"
                    style={{ fontFamily: CONDENSED, fontSize: '1.35rem', letterSpacing: '0.06em' }}
                  >
                    Resumen de <span style={{ color: VERDE }}>precios</span>
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                    <Store size={11} className="flex-shrink-0" style={{ color: '#484f58' }} />
                    <p className="text-[11px] text-[#8b949e] truncate">
                      {factura.proveedorNombre ?? 'Proveedor no identificado'}
                      <span className="text-[#484f58]"> · {formatearFecha(factura.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar resumen"
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[#8b949e] transition-colors hover:text-[#e6edf3]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-3">
                <span className="text-[10px] text-[#484f58] uppercase tracking-widest font-semibold">
                  {lineas.length} {lineas.length === 1 ? 'producto' : 'productos'}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#484f58]">
                  <Landmark size={10} />
                  Tasa de la factura:{' '}
                  <span style={{ fontFamily: MONO, color: '#8b949e' }}>
                    {factura.tasa > 0 ? `${formatAmount(factura.tasa, 'Bs')} Bs` : 'sin tasa'}
                  </span>
                </span>
              </div>
            </div>

            {/* ─── Lista ─── */}
            {lineas.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p
                  className="font-black text-[#8b949e] uppercase tracking-wide"
                  style={{ fontFamily: CONDENSED, fontSize: '1rem' }}
                >
                  Esta factura no tiene precios de venta
                </p>
                <p className="text-xs text-[#484f58] mt-1.5">
                  No quedó ningún renglón con precio para mostrar.
                </p>
              </div>
            ) : (
              <>
                {/* Rótulo de columnas: solo lo justo para saber qué moneda es cuál */}
                <div
                  className="flex items-center px-4 sm:px-6 py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="flex-1 text-[9px] font-black text-[#484f58] uppercase tracking-[0.16em]">
                    Producto
                  </span>
                  <span className="text-[9px] font-black text-[#484f58] uppercase tracking-[0.16em] text-right">
                    Precio de venta
                  </span>
                </div>

                <div>
                  {lineas.map((linea, i) => (
                    <div
                      key={`${linea.nombre}-${i}`}
                      className="flex items-center gap-4 px-4 sm:px-6"
                      style={{
                        minHeight: '56px',
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div className="flex-1 min-w-0 py-2">
                        <p className="text-[14px] font-semibold text-[#e6edf3] leading-snug">
                          {linea.nombre}
                        </p>
                        {/* Solo aparece cuando hay algo que advertir */}
                        {!linea.importado && (
                          <p className="text-[10px] mt-0.5" style={{ color: AMBAR }}>
                            No se importó · precio no guardado
                          </p>
                        )}
                      </div>

                      {/* El Bs manda: es el precio que se marca. El $ es referencia. */}
                      <div className="text-right flex-shrink-0 py-2">
                        <p
                          className="text-[#e6edf3] leading-none"
                          style={{ fontFamily: MONO, fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {linea.precioBs !== null ? formatAmount(linea.precioBs, 'Bs') : '—'}
                          <span className="text-[#484f58] ml-1" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                            Bs
                          </span>
                        </p>
                        <p
                          className="text-[#8b949e] mt-1 leading-none"
                          style={{ fontFamily: MONO, fontSize: '0.75rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {linea.precioUsd !== null ? `$${formatAmount(linea.precioUsd, 'USD')}` : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─── Pie ─── */}
            <div
              className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
              style={{ background: '#1c2128', borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] text-[#484f58] leading-snug">
                {hayNoImportados
                  ? 'Los renglones marcados en ámbar no se importaron: ese precio no está guardado.'
                  : 'Precios calculados con la tasa del día de la factura.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-[13px] flex-shrink-0 transition-colors"
                style={{
                  fontFamily: CONDENSED,
                  letterSpacing: '0.06em',
                  color: '#8b949e',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                CERRAR
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
