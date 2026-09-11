import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, RotateCcw, Download, ChevronDown, Plus, Store, X, TrendingUp, TrendingDown } from 'lucide-react';
import { CapturaCamara } from './CapturaCamara';
import { TablaRevisionFactura } from './TablaRevisionFactura';
import { useEscanerFacturas, MENSAJES_CARGA } from './useEscanerFacturas';
import { useAlmacenProveedores } from '@/almacen/almacenProveedores';
import { useAlmacenAvisos } from '@/almacen/almacenAvisos';
import { ModalConfirmacion } from '@/componentes/ui/ModalConfirmacion';

// Acción pendiente de confirmar cuando hay una factura leída sin importar
type Confirmacion = 'salir' | 'nueva' | 'importar' | null;

// El toast es chico: más de esto no se lee. El resto queda en la pantalla final
// y en Facturas Importadas.
const MAX_CAMBIOS_EN_TOAST = 4;

/* ─── Loading spinner con mensajes rotativos ─── */
function CapaEscaneando({ indiceMensaje }: { indiceMensaje: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      <div className="relative w-20 h-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            border: '3px solid rgba(0,154,58,0.15)',
            borderTopColor: '#009A3A',
          }}
        />
        <div
          className="absolute inset-3 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,154,58,0.08)', border: '1px solid rgba(0,154,58,0.15)' }}
        >
          <FileText size={22} style={{ color: '#009A3A' }} />
        </div>
      </div>

      <div className="h-7 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={indiceMensaje}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="text-center font-bold text-[#8b949e]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.04em' }}
          >
            {MENSAJES_CARGA[indiceMensaje]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-xs text-[#484f58] text-center">
        Analizando la imagen con IA...
      </p>
    </motion.div>
  );
}

/* ─── Barra de progreso de importación ─── */
function CapaImportando({ progreso, total }: { progreso: number; total: number }) {
  const pct = total > 0 ? (progreso / total) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(0,154,58,0.08)', border: '1px solid rgba(0,154,58,0.15)' }}
      >
        <Download size={28} style={{ color: '#009A3A' }} />
      </div>

      <div className="text-center">
        <p className="font-black text-[#e6edf3] uppercase tracking-wide mb-1"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}>
          Importando productos...
        </p>
        <p className="text-sm text-[#8b949e]">
          {progreso} de {total}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)', height: '8px' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Selector de proveedor ─── */
interface PropsSelectorProveedor {
  proveedorId: number | null;
  proveedorDetectado: string | null;
  alSeleccionar: (id: number | null) => void;
}

function SelectorProveedor({ proveedorId, proveedorDetectado, alSeleccionar }: PropsSelectorProveedor) {
  const { proveedores, agregarProveedor } = useAlmacenProveedores();
  const [abierto, fijarAbierto] = useState(false);
  const [nuevoNombre, fijarNuevoNombre] = useState('');
  const [creando, fijarCreando] = useState(false);
  const [mostrarNuevo, fijarMostrarNuevo] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const marcado = proveedores.find((p) => p.id === proveedorId) ?? null;

  // Cierra al hacer click fuera
  useEffect(() => {
    const alHacerClic = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        fijarAbierto(false);
        fijarMostrarNuevo(false);
      }
    };
    if (abierto) document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
  }, [abierto]);

  const alCrear = async () => {
    const name = nuevoNombre.trim();
    if (!name) return;
    fijarCreando(true);
    try {
      const nuevo = await agregarProveedor(name);
      alSeleccionar(nuevo.id);
      fijarNuevoNombre('');
      fijarMostrarNuevo(false);
      fijarAbierto(false);
    } finally {
      fijarCreando(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => fijarAbierto((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition"
        style={{
          background: marcado ? 'rgba(0,154,58,0.1)' : 'rgba(255,255,255,0.05)',
          border: marcado ? '1px solid rgba(0,154,58,0.25)' : '1px solid rgba(255,255,255,0.1)',
          color: marcado ? '#1ebb60' : '#8b949e',
        }}
      >
        <Store size={14} />
        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.04em' }}>
          {marcado ? marcado.name : (proveedorDetectado ? `¿Es "${proveedorDetectado}"?` : '¿Qué proveedor es este?')}
        </span>
        {marcado && (
          <span
            onClick={(e) => { e.stopPropagation(); alSeleccionar(null); }}
            className="ml-1 text-[#484f58] hover:text-[#C8102E] transition cursor-pointer"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown
          size={13}
          className="ml-1 transition-transform"
          style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', color: '#484f58' }}
        />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl overflow-hidden"
            style={{
              background: '#1c2128',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Opción: sin proveedor */}
            <button
              type="button"
              onClick={() => { alSeleccionar(null); fijarAbierto(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
              style={{ color: proveedorId === null ? '#009A3A' : '#8b949e' }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={10} />
              </div>
              <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                Sin proveedor
              </span>
              {proveedorId === null && <span className="ml-auto text-[#009A3A] text-xs">✓</span>}
            </button>

            {/* Separador */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {/* Lista de proveedores */}
            <div className="max-h-48 overflow-y-auto py-1">
              {proveedores.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#484f58]">No hay proveedores registrados</p>
              ) : (
                proveedores.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { alSeleccionar(p.id); fijarAbierto(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
                    style={{ color: proveedorId === p.id ? '#009A3A' : '#e6edf3' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black uppercase"
                      style={{
                        background: proveedorId === p.id ? 'rgba(0,154,58,0.2)' : 'rgba(255,255,255,0.08)',
                        color: proveedorId === p.id ? '#009A3A' : '#484f58',
                      }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <span className="flex-1 truncate" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                      {p.name}
                    </span>
                    {proveedorId === p.id && <span className="ml-auto text-[#009A3A] text-xs">✓</span>}
                  </button>
                ))
              )}
            </div>

            {/* Separador + agregar nuevo */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {!mostrarNuevo ? (
              <button
                type="button"
                onClick={() => { fijarMostrarNuevo(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
                style={{ color: '#009A3A' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.12)', border: '1px solid rgba(0,154,58,0.2)' }}>
                  <Plus size={10} style={{ color: '#009A3A' }} />
                </div>
                <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                  Agregar nuevo proveedor
                </span>
              </button>
            ) : (
              <div className="px-3 py-2.5 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => fijarNuevoNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') alCrear(); if (e.key === 'Escape') { fijarMostrarNuevo(false); fijarNuevoNombre(''); } }}
                  placeholder="Nombre del proveedor"
                  className="flex-1 bg-transparent text-sm text-[#e6edf3] outline-none placeholder-[#484f58]"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                />
                <button
                  type="button"
                  onClick={alCrear}
                  disabled={!nuevoNombre.trim() || creando}
                  className="px-2.5 py-1 rounded-lg text-xs font-black uppercase transition disabled:opacity-40"
                  style={{
                    background: 'rgba(0,154,58,0.15)',
                    color: '#009A3A',
                    border: '1px solid rgba(0,154,58,0.2)',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.05em',
                  }}
                >
                  {creando ? '...' : 'Crear'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── PaginaFactura ─── */
export function PaginaFactura() {
  const navigate = useNavigate();
  const {
    paso,
    fijarPaso,
    productos,
    proveedor,
    proveedorId,
    setProveedorId,
    error,
    fijarError,
    progresoImportacion,
    totalImportacion,
    resultadoImportacion,
    indiceMensajeCarga,
    gananciaGeneral,
    fijarGananciaGeneral,
    modoGanancia,
    fijarModoGanancia,
    conDescuento,
    toggleDescuento,
    descuento,
    setDescuento,
    escanearImagen,
    ejecutarImportacion,
    actualizarFila,
    setPrecioManual,
    alternarTodos,
    fijarIvaTodos,
    reiniciar,
  } = useEscanerFacturas();

  const { cargarProveedores } = useAlmacenProveedores();
  useEffect(() => { cargarProveedores(); }, []);

  const [confirmacion, fijarConfirmacion] = useState<Confirmacion>(null);

  // Hay trabajo que se puede perder: la IA ya leyó la factura y todavía no se
  // ha importado nada.
  const hayTrabajoSinGuardar = paso === 'review' && productos.length > 0;

  // Aviso del navegador al recargar o cerrar la pestaña con la factura a medias.
  // No cubre el botón atrás del navegador o del teléfono: eso lo controla el
  // enrutador y aquí no hay forma de interceptarlo.
  useEffect(() => {
    if (!hayTrabajoSinGuardar) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayTrabajoSinGuardar]);

  const volverAProductos = () => navigate('/products');

  // Cada botón pide confirmación solo si de verdad hay algo que perder
  const pedirSalir = () => {
    if (hayTrabajoSinGuardar) fijarConfirmacion('salir');
    else volverAProductos();
  };
  const pedirNueva = () => {
    if (hayTrabajoSinGuardar) fijarConfirmacion('nueva');
    else reiniciar();
  };

  const alImportar = async () => {
    const resultado = await ejecutarImportacion();
    if (!resultado) return;
    fijarPaso('done');

    // Aviso de precios: además del resumen, se dice producto por producto
    // cuánto era el último precio y cuánto quedó ahora. El toast dura poco, así
    // que la lista completa también queda en la pantalla final y en el historial.
    const lineas = [`✅ ${resultado.creados} creados · ${resultado.actualizados} actualizados`];
    if (resultado.cambiosPrecio.length > 0) {
      lineas.push('', '💰 PRECIO MODIFICADO');
      for (const cambio of resultado.cambiosPrecio.slice(0, MAX_CAMBIOS_EN_TOAST)) {
        lineas.push(`${cambio.nombre}: $${cambio.antes.toFixed(2)} → $${cambio.ahora.toFixed(2)}`);
      }
      const restantes = resultado.cambiosPrecio.length - MAX_CAMBIOS_EN_TOAST;
      if (restantes > 0) lineas.push(`y ${restantes} más...`);
    }
    useAlmacenAvisos.getState().mostrar(lineas.join('\n'), 'success');
  };

  // Si hubo cambios de precio NO se redirige solo: el usuario tiene que poder
  // leer cuánto era antes y cuánto quedó ahora sin que la pantalla se le vaya.
  const hayCambiosPrecio = (resultadoImportacion?.cambiosPrecio.length ?? 0) > 0;

  useEffect(() => {
    if (paso === 'done' && !hayCambiosPrecio) {
      const t = setTimeout(() => navigate('/products'), 3000);
      return () => clearTimeout(t);
    }
  }, [paso, hayCambiosPrecio, navigate]);

  const cantidadMarcados = productos.filter((p) => p.seleccionado).length;
  const isLoading = paso === 'scanning';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-10"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.06, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={pedirSalir}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#8b949e' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </motion.button>
        <div>
          <h1
            className="font-black text-[#e6edf3] uppercase leading-none"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.5rem,4vw,2.1rem)', letterSpacing: '0.07em' }}
          >
            Importar Factura{' '}
            <span style={{ color: '#009A3A' }}>con IA</span>
          </h1>
        </div>
      </div>

      {/* ─── Portugal strip ─── */}
      <div className="flex h-[2px] rounded-full overflow-hidden">
        <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
        <div style={{ flex: 3, background: '#C8102E' }} />
      </div>

      {/* ─── Main content card ─── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Step: idle */}
          {paso === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 md:p-8"
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-5 flex items-start gap-3 p-4 rounded-xl"
                    style={{
                      background: 'rgba(200,16,46,0.07)',
                      border: '1px solid rgba(200,16,46,0.2)',
                    }}
                  >
                    <AlertCircle size={18} style={{ color: '#C8102E', flexShrink: 0, marginTop: '1px' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#C8102E' }}>{error}</p>
                    </div>
                    <button
                      onClick={() => fijarError(null)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap flex-shrink-0"
                      style={{
                        color: '#C8102E',
                        background: 'rgba(200,16,46,0.1)',
                        border: '1px solid rgba(200,16,46,0.2)',
                      }}
                    >
                      <RotateCcw size={11} />
                      Reintentar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <CapturaCamara alCapturar={escanearImagen} />
            </motion.div>
          )}

          {/* Step: scanning / fetching-images */}
          {isLoading && (
            <motion.div key="loading" className="p-6 md:p-8">
              <CapaEscaneando indiceMensaje={indiceMensajeCarga} />
            </motion.div>
          )}

          {/* Step: review */}
          {paso === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 md:p-6 space-y-4"
            >
              {/* Selector de proveedor */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black text-[#484f58] uppercase tracking-widest">
                  Proveedor:
                </span>
                <SelectorProveedor
                  proveedorId={proveedorId}
                  proveedorDetectado={proveedor}
                  alSeleccionar={setProveedorId}
                />
              </div>

              <TablaRevisionFactura
                productos={productos}
                alActualizarFila={actualizarFila}
                alCambiarPrecio={setPrecioManual}
                alAlternarTodos={alternarTodos}
                alFijarIvaTodos={fijarIvaTodos}
                gananciaGeneral={gananciaGeneral}
                onGlobalGananciaChange={fijarGananciaGeneral}
                modoGanancia={modoGanancia}
                onGananciaModeChange={fijarModoGanancia}
                conDescuento={conDescuento}
                onConDescuentoChange={toggleDescuento}
                descuento={descuento}
                onDescuentoChange={setDescuento}
              />
            </motion.div>
          )}

          {/* Step: importing */}
          {paso === 'importing' && (
            <motion.div key="importing" className="p-6 md:p-8">
              <CapaImportando progreso={progresoImportacion} total={totalImportacion} />
            </motion.div>
          )}

          {/* Step: done */}
          {paso === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 flex flex-col items-center gap-4 py-16"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,154,58,0.12)', border: '1px solid rgba(0,154,58,0.25)' }}
              >
                <CheckCircle size={36} style={{ color: '#009A3A' }} />
              </motion.div>
              <p className="font-black text-[#e6edf3] uppercase tracking-wide"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.3rem' }}>
                ¡Importación completada!
              </p>

              {resultadoImportacion && (
                <p className="text-sm text-[#8b949e] -mt-2">
                  {resultadoImportacion.creados} creados · {resultadoImportacion.actualizados} actualizados
                </p>
              )}

              {/* Lista de precios modificados: último precio → precio nuevo */}
              {hayCambiosPrecio && resultadoImportacion && (
                <div
                  className="w-full max-w-md rounded-xl overflow-hidden mt-1"
                  style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <p
                    className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
                    style={{ color: '#fbbf24', borderBottom: '1px solid rgba(251,191,36,0.15)' }}
                  >
                    💰 Precio modificado
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    {resultadoImportacion.cambiosPrecio.map((cambio, i) => {
                      const subio = cambio.ahora > cambio.antes;
                      return (
                        <div
                          key={`${cambio.nombre}-${i}`}
                          className="flex items-center gap-2 px-4 py-2.5"
                          style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        >
                          <span className="flex-1 min-w-0 text-[13px] text-[#e6edf3] font-semibold truncate text-left">
                            {cambio.nombre}
                          </span>
                          <span
                            className="text-[12px] whitespace-nowrap"
                            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#8b949e' }}
                          >
                            ${cambio.antes.toFixed(2)}
                          </span>
                          {subio
                            ? <TrendingUp size={12} style={{ color: '#C8102E', flexShrink: 0 }} />
                            : <TrendingDown size={12} style={{ color: '#009A3A', flexShrink: 0 }} />}
                          <span
                            className="text-[12px] font-bold whitespace-nowrap"
                            style={{ fontFamily: '"JetBrains Mono", monospace', color: subio ? '#C8102E' : '#009A3A' }}
                          >
                            ${cambio.ahora.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hayCambiosPrecio ? (
                <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => navigate('/invoices')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      letterSpacing: '0.06em',
                      color: '#8b949e',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <FileText size={14} />
                    VER FACTURAS IMPORTADAS
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      letterSpacing: '0.06em',
                      background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                      boxShadow: '0 4px 18px rgba(0,154,58,0.3)',
                    }}
                  >
                    IR A PRODUCTOS
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#8b949e]">Redirigiendo a productos...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Action bar (solo en review) ─── */}
      <AnimatePresence>
        {paso === 'review' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={pedirNueva}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.06em',
                color: '#8b949e',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <RotateCcw size={14} />
              NUEVA FACTURA
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fijarConfirmacion('importar')}
              disabled={cantidadMarcados === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.06em',
                background: cantidadMarcados > 0
                  ? 'linear-gradient(135deg,#009A3A,#007b2e)'
                  : 'rgba(0,154,58,0.3)',
                boxShadow: cantidadMarcados > 0 ? '0 4px 18px rgba(0,154,58,0.35)' : 'none',
              }}
            >
              <Download size={15} />
              CONFIRMAR IMPORTACIÓN
              {cantidadMarcados > 0 && (
                <span
                  className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-black"
                  style={{ background: 'rgba(255,255,255,0.18)' }}
                >
                  {cantidadMarcados}
                </span>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmaciones: perder la lectura de la IA es lo más costoso que puede
          pasar aquí (hay que volver a fotografiar y volver a escanear). */}
      <ModalConfirmacion
        estaAbierto={confirmacion === 'salir'}
        titulo="¿Salir sin importar?"
        mensaje={`La IA leyó ${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} y todavía no se ha guardado nada. Si sales ahora se pierde y hay que escanear la factura de nuevo.`}
        textoConfirmar="Sí, salir"
        textoCancelar="Seguir aquí"
        alConfirmar={() => { fijarConfirmacion(null); volverAProductos(); }}
        alCancelar={() => fijarConfirmacion(null)}
      />

      <ModalConfirmacion
        estaAbierto={confirmacion === 'nueva'}
        titulo="¿Empezar otra factura?"
        mensaje={`Se descartan los ${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} de esta factura sin importarlos. Habría que escanearla de nuevo.`}
        textoConfirmar="Sí, descartar"
        textoCancelar="Seguir aquí"
        alConfirmar={() => { fijarConfirmacion(null); reiniciar(); }}
        alCancelar={() => fijarConfirmacion(null)}
      />

      <ModalConfirmacion
        estaAbierto={confirmacion === 'importar'}
        titulo="¿Confirmar importación?"
        mensaje={`Se van a guardar ${cantidadMarcados} ${cantidadMarcados === 1 ? 'producto' : 'productos'}: los nuevos se crean y a los repetidos se les actualiza el precio. Revisa que los precios y el IVA estén correctos.`}
        textoConfirmar="Sí, importar"
        textoCancelar="Revisar otra vez"
        tipo="accion"
        alConfirmar={() => { fijarConfirmacion(null); alImportar(); }}
        alCancelar={() => fijarConfirmacion(null)}
      />
    </motion.div>
  );
}
