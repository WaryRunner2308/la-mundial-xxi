import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, ChevronRight, Loader2, ScanLine, Store,
  TrendingUp, TrendingDown, Trash2, Tags,
} from 'lucide-react';
import {
  useAlmacenHistorialFacturas,
  type FacturaHistorial,
  type RenglonFactura,
} from '@/almacen/almacenHistorialFacturas';
import { useAlmacenAvisos } from '@/almacen/almacenAvisos';
import { ModalConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { ResumenPreciosFactura } from './ResumenPreciosFactura';

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
function PildoraEstado({ renglon }: { renglon: RenglonFactura }) {
  const config =
    renglon.estado === 'Nuevo'
      ? { color: AZUL, texto: 'Nuevo' }
      : renglon.estado === 'Actualizar precio'
        ? { color: AMBAR, texto: renglon.importado ? 'Precio actualizado' : 'No importado' }
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

function DetalleFactura({ factura, alVerResumen }: { factura: FacturaHistorial; alVerResumen: () => void }) {
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
            {factura.renglones.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-xs text-[#484f58]">
                  Esta factura no tiene renglones guardados.
                </td>
              </tr>
            ) : (
              factura.renglones.map((renglon, i) => {
                const simbolo = renglon.moneda === 'USD' ? '$' : 'Bs';
                const subio =
                  renglon.precioAnterior !== null &&
                  renglon.costoUsd !== null &&
                  renglon.costoUsd > renglon.precioAnterior;
                const bajo =
                  renglon.precioAnterior !== null &&
                  renglon.costoUsd !== null &&
                  renglon.costoUsd < renglon.precioAnterior;

                return (
                  <tr
                    key={`${renglon.nombre}-${i}`}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      // Las filas que no se importaron se ven apagadas, igual que al revisar
                      opacity: renglon.importado ? 1 : 0.55,
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-[13px] text-[#e6edf3] font-semibold leading-tight">{renglon.nombre}</p>
                      {renglon.cantidadBulto !== null && renglon.cantidadBulto > 1 && (
                        <p className="text-[10px] text-[#484f58] mt-0.5">Bulto de {renglon.cantidadBulto}</p>
                      )}
                      {/* Si el emparejamiento fue por parecido, se muestra con qué producto se cruzó */}
                      {renglon.matchAproximado && renglon.nombreExistente && (
                        <p className="text-[10px] mt-0.5" style={{ color: AMBAR }}>
                          ≈ emparejado con "{renglon.nombreExistente}"
                        </p>
                      )}
                    </td>

                    {/* Precio Costo + el costo anterior en USD si cambió */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className="text-[12px] font-bold text-[#e6edf3]"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {simbolo}{renglon.precioCosto.toFixed(2)}
                      </span>
                      {renglon.precioAnterior !== null && (subio || bajo) && (
                        <span
                          className="flex items-center gap-1 text-[10px] mt-0.5"
                          style={{ fontFamily: '"JetBrains Mono", monospace', color: '#484f58' }}
                        >
                          antes {usd(renglon.precioAnterior)}
                          {subio && <TrendingUp size={10} style={{ color: ROJO }} />}
                          {bajo && <TrendingDown size={10} style={{ color: VERDE }} />}
                        </span>
                      )}
                    </td>

                    <td
                      className="px-3 py-2.5 text-[12px] font-bold whitespace-nowrap"
                      style={{ fontFamily: '"JetBrains Mono", monospace', color: VERDE }}
                    >
                      {simbolo}{renglon.precioVenta.toFixed(2)}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] text-[#8b949e] whitespace-nowrap">
                      {renglon.moneda}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">
                      {renglon.iva === 'yes' && <span style={{ color: '#e6edf3' }}>Sí</span>}
                      {renglon.iva === 'no' && <span style={{ color: '#8b949e' }}>Exento</span>}
                      {renglon.iva === null && <span style={{ color: '#484f58' }}>—</span>}
                    </td>

                    <td
                      className="px-3 py-2.5 text-[11px] text-[#8b949e] whitespace-nowrap"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {renglon.ganancia}%
                    </td>

                    <td className="px-3 py-2.5">
                      <PildoraEstado renglon={renglon} />
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
          onClick={alVerResumen}
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
function TarjetaFactura({
  factura,
  abierta,
  alAlternar,
  onEliminar,
  alVerResumen,
}: {
  factura: FacturaHistorial;
  abierta: boolean;
  alAlternar: () => void;
  onEliminar: () => void;
  alVerResumen: () => void;
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
        onClick={alAlternar}
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
          <p className="text-[10px] text-[#484f58] mt-0.5">{formatearFecha(factura.creadoEn)}</p>
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
          <span className="text-[10px] text-[#484f58]">{factura.totalRenglones} renglones</span>
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
            <DetalleFactura factura={factura} alVerResumen={alVerResumen} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Página ─── */
export function PaginaHistorialFacturas() {
  const navigate = useNavigate();
  const { facturas, cargando, error, cargarFacturas, eliminarFactura } = useAlmacenHistorialFacturas();
  const [idAbierta, fijarIdAbierta] = useState<number | null>(null);
  const [facturaAEliminar, fijarFacturaAEliminar] = useState<FacturaHistorial | null>(null);
  const [resumenDe, fijarResumenDe] = useState<FacturaHistorial | null>(null);

  useEffect(() => { cargarFacturas(); }, [cargarFacturas]);

  const confirmarEliminar = async () => {
    if (!facturaAEliminar) return;
    const id = facturaAEliminar.id;
    fijarFacturaAEliminar(null);
    try {
      await eliminarFactura(id);
      useAlmacenAvisos.getState().mostrar('Factura eliminada del historial.', 'success');
    } catch {
      useAlmacenAvisos.getState().mostrar('No se pudo eliminar la factura.', 'error');
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

      {cargando && facturas.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 size={26} className="animate-spin" style={{ color: VERDE }} />
          <p className="text-sm text-[#8b949e]">Cargando historial...</p>
        </div>
      )}

      {!cargando && facturas.length === 0 && !error && (
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
          <TarjetaFactura
            key={factura.id}
            factura={factura}
            abierta={idAbierta === factura.id}
            alAlternar={() => fijarIdAbierta((prev) => (prev === factura.id ? null : factura.id))}
            onEliminar={() => fijarFacturaAEliminar(factura)}
            alVerResumen={() => fijarResumenDe(factura)}
          />
        ))}
      </div>

      <ResumenPreciosFactura factura={resumenDe} onClose={() => fijarResumenDe(null)} />

      <ModalConfirmacion
        estaAbierto={facturaAEliminar !== null}
        titulo="¿Eliminar esta factura del historial?"
        mensaje={
          facturaAEliminar
            ? `Se borra el registro de "${facturaAEliminar.proveedorNombre ?? 'proveedor no identificado'}" del ${formatearFecha(facturaAEliminar.creadoEn)}. Los productos y sus precios NO se tocan.`
            : ''
        }
        textoConfirmar="Sí, eliminar"
        textoCancelar="No, dejarla"
        alConfirmar={confirmarEliminar}
        alCancelar={() => fijarFacturaAEliminar(null)}
      />
    </motion.div>
  );
}
