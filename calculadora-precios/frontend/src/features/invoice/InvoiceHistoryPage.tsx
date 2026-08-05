import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, ChevronRight, Loader2, ScanLine, Store,
  TrendingUp, TrendingDown, Trash2, Tags,
} from 'lucide-react';
import {
  useInvoiceHistoryStore,
  type InvoiceHistoryEntry,
  type InvoiceHistoryItem,
} from '@/store/invoiceHistoryStore';
import { useToastStore } from '@/store/toastStore';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InvoicePriceSummary } from './InvoicePriceSummary';

const VERDE = '#009A3A';
const ROJO = '#C8102E';
const AMBAR = '#fbbf24';
const AZUL = '#60a5fa';

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function usd(valor: number | null): string {
  if (valor === null) return '—';
  return `$${valor.toFixed(2)}`;
}

/* ─── Badge de estado por renglón ─── */
function EstadoPill({ item }: { item: InvoiceHistoryItem }) {
  const config =
    item.estado === 'Nuevo'
      ? { color: AZUL, texto: 'Nuevo' }
      : item.estado === 'Actualizar precio'
        ? { color: AMBAR, texto: item.importado ? 'Precio actualizado' : 'No importado' }
        : { color: VERDE, texto: 'Sin cambios' };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider whitespace-nowrap"
      style={{
        color: config.color,
        background: `${config.color}14`,
        borderColor: `${config.color}40`,
      }}
    >
      {config.texto}
    </span>
  );
}

/* ─── Detalle de una factura ───
   Mismas columnas que la tabla de revisión al importar (Nombre, Precio Costo,
   Precio Venta, Moneda, IVA, % Gan., Estado), pero solo de lectura: aquí no se
   edita nada, es el registro de lo que hizo la IA ese día. */
const COLUMNAS = ['Nombre', 'Precio Costo', 'Precio Venta', 'Moneda', 'IVA', '% Gan.', 'Estado'];

function DetalleFactura({ factura, onVerResumen }: { factura: InvoiceHistoryEntry; onVerResumen: () => void }) {
  return (
    <div className="px-3 pb-4 pt-1">
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead>
            <tr style={{ background: '#1c2128' }}>
              {COLUMNAS.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#484f58] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factura.items.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-xs text-[#484f58]">
                  Esta factura no tiene renglones guardados.
                </td>
              </tr>
            ) : (
              factura.items.map((item, i) => {
                const simbolo = item.moneda === 'USD' ? '$' : 'Bs';
                const subio =
                  item.precioAnterior !== null &&
                  item.costoUsd !== null &&
                  item.costoUsd > item.precioAnterior;
                const bajo =
                  item.precioAnterior !== null &&
                  item.costoUsd !== null &&
                  item.costoUsd < item.precioAnterior;

                return (
                  <tr
                    key={`${item.nombre}-${i}`}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      // Las filas que no se importaron se ven apagadas, igual que al revisar
                      opacity: item.importado ? 1 : 0.55,
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-[13px] text-[#e6edf3] font-semibold leading-tight">{item.nombre}</p>
                      {item.cantidadBulto !== null && item.cantidadBulto > 1 && (
                        <p className="text-[10px] text-[#484f58] mt-0.5">Bulto de {item.cantidadBulto}</p>
                      )}
                      {/* Si el emparejamiento fue por parecido, se muestra con qué producto se cruzó */}
                      {item.matchAproximado && item.nombreExistente && (
                        <p className="text-[10px] mt-0.5" style={{ color: AMBAR }}>
                          ≈ emparejado con "{item.nombreExistente}"
                        </p>
                      )}
                    </td>

                    {/* Precio Costo + el costo anterior en USD si cambió */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className="text-[12px] font-bold text-[#e6edf3]"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {simbolo}{item.precioCosto.toFixed(2)}
                      </span>
                      {item.precioAnterior !== null && (subio || bajo) && (
                        <span
                          className="flex items-center gap-1 text-[10px] mt-0.5"
                          style={{ fontFamily: '"JetBrains Mono", monospace', color: '#484f58' }}
                        >
                          antes {usd(item.precioAnterior)}
                          {subio && <TrendingUp size={10} style={{ color: ROJO }} />}
                          {bajo && <TrendingDown size={10} style={{ color: VERDE }} />}
                        </span>
                      )}
                    </td>

                    <td
                      className="px-3 py-2.5 text-[12px] font-bold whitespace-nowrap"
                      style={{ fontFamily: '"JetBrains Mono", monospace', color: VERDE }}
                    >
                      {simbolo}{item.precioVenta.toFixed(2)}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-[#8b949e] whitespace-nowrap">
                      {item.moneda}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">
                      {item.iva === 'yes' && <span style={{ color: '#e6edf3' }}>Sí</span>}
                      {item.iva === 'no' && <span style={{ color: '#8b949e' }}>Exento</span>}
                      {item.iva === null && <span style={{ color: '#484f58' }}>—</span>}
                    </td>

                    <td
                      className="px-3 py-2.5 text-[11px] text-[#8b949e] whitespace-nowrap"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {item.ganancia}%
                    </td>

                    <td className="px-3 py-2.5">
                      <EstadoPill item={item} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie del detalle: los datos de contexto a la izquierda, la acción a la derecha */}
      <div className="flex items-end justify-between gap-4 mt-3 px-1">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[#484f58]">
          <span>
            Tasa usada:{' '}
            <span style={{ fontFamily: '"JetBrains Mono", monospace', color: '#8b949e' }}>
              {factura.tasa.toFixed(2)} Bs
            </span>
          </span>
          {factura.descuento !== null && (
            <span>
              Descuento aplicado:{' '}
              <span style={{ fontFamily: '"JetBrains Mono", monospace', color: AMBAR }}>
                {factura.descuento}%
              </span>
            </span>
          )}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onVerResumen}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white flex-shrink-0"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.06em',
            background: `linear-gradient(135deg,${VERDE},#007b2e)`,
            boxShadow: '0 4px 18px rgba(0,154,58,0.3)',
          }}
        >
          <Tags size={14} />
          VER RESUMEN
        </motion.button>
      </div>
    </div>
  );
}

/* ─── Tarjeta de factura (colapsable) ─── */
function FacturaCard({
  factura,
  abierta,
  onToggle,
  onEliminar,
  onVerResumen,
}: {
  factura: InvoiceHistoryEntry;
  abierta: boolean;
  onToggle: () => void;
  onEliminar: () => void;
  onVerResumen: () => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#161b22',
        border: `1px solid ${abierta ? 'rgba(0,154,58,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.18)' }}
        >
          <FileText size={16} style={{ color: VERDE }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Store size={11} className="flex-shrink-0" style={{ color: '#484f58' }} />
            <p
              className="font-bold text-[#e6edf3] truncate uppercase"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem', letterSpacing: '0.04em' }}
            >
              {factura.proveedorNombre ?? 'Proveedor no identificado'}
            </p>
          </div>
          <p className="text-[10px] text-[#484f58] mt-0.5">{formatearFecha(factura.createdAt)}</p>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ color: AZUL, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            {factura.creados} nuevos
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ color: AMBAR, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}
          >
            {factura.actualizados} precios
          </span>
          <span className="text-[10px] text-[#484f58]">{factura.totalItems} renglones</span>
        </div>

        <span
          onClick={(e) => { e.stopPropagation(); onEliminar(); }}
          className="p-1.5 rounded-lg text-[#484f58] hover:text-[#C8102E] transition flex-shrink-0 cursor-pointer"
          title="Eliminar del historial"
        >
          <Trash2 size={14} />
        </span>

        <motion.span
          animate={{ rotate: abierta ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0"
          style={{ color: '#484f58' }}
        >
          <ChevronRight size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <DetalleFactura factura={factura} onVerResumen={onVerResumen} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Página ─── */
export function InvoiceHistoryPage() {
  const navigate = useNavigate();
  const { facturas, loading, error, fetchFacturas, eliminarFactura } = useInvoiceHistoryStore();
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const [porEliminar, setPorEliminar] = useState<InvoiceHistoryEntry | null>(null);
  const [resumenDe, setResumenDe] = useState<InvoiceHistoryEntry | null>(null);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    const id = porEliminar.id;
    setPorEliminar(null);
    try {
      await eliminarFactura(id);
      useToastStore.getState().show('Factura eliminada del historial.', 'success');
    } catch {
      useToastStore.getState().show('No se pudo eliminar la factura.', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.06, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/products')}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#8b949e' }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </motion.button>
        <h1
          className="font-black text-[#e6edf3] uppercase leading-none flex-1 min-w-0"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.5rem,4vw,2.1rem)', letterSpacing: '0.07em' }}
        >
          Facturas <span style={{ color: VERDE }}>Importadas</span>
        </h1>

        <button
          type="button"
          onClick={() => navigate('/import-invoice')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition"
          style={{ background: `linear-gradient(135deg,${VERDE},#007b2e)`, boxShadow: '0 4px 18px rgba(0,154,58,0.3)' }}
        >
          <ScanLine size={13} />
          Nueva factura
        </button>
      </div>

      <div className="flex h-[2px] rounded-full overflow-hidden">
        <div style={{ flex: 2, background: `linear-gradient(90deg,${VERDE},#1ebb60)` }} />
        <div style={{ flex: 3, background: ROJO }} />
      </div>

      {error && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{ color: ROJO, background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && facturas.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 size={26} className="animate-spin" style={{ color: VERDE }} />
          <p className="text-sm text-[#8b949e]">Cargando historial...</p>
        </div>
      )}

      {!loading && facturas.length === 0 && !error && (
        <div
          className="flex flex-col items-center gap-3 py-20 rounded-2xl"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <FileText size={26} style={{ color: '#484f58' }} />
          </div>
          <p
            className="font-black text-[#8b949e] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}
          >
            Todavía no hay facturas importadas
          </p>
          <p className="text-xs text-[#484f58] text-center max-w-xs">
            Cada factura que leas con la IA queda guardada aquí con su lista completa de precios.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {facturas.map((factura) => (
          <FacturaCard
            key={factura.id}
            factura={factura}
            abierta={abiertaId === factura.id}
            onToggle={() => setAbiertaId((prev) => (prev === factura.id ? null : factura.id))}
            onEliminar={() => setPorEliminar(factura)}
            onVerResumen={() => setResumenDe(factura)}
          />
        ))}
      </div>

      <InvoicePriceSummary factura={resumenDe} onClose={() => setResumenDe(null)} />

      <ConfirmationModal
        isOpen={porEliminar !== null}
        title="¿Eliminar esta factura del historial?"
        message={
          porEliminar
            ? `Se borra el registro de "${porEliminar.proveedorNombre ?? 'proveedor no identificado'}" del ${formatearFecha(porEliminar.createdAt)}. Los productos y sus precios NO se tocan.`
            : ''
        }
        confirmText="Sí, eliminar"
        cancelText="No, dejarla"
        onConfirm={confirmarEliminar}
        onCancel={() => setPorEliminar(null)}
      />
    </motion.div>
  );
}
