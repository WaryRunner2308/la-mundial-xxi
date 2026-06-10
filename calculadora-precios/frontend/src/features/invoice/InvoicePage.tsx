import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, RotateCcw, Download } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { InvoiceReviewTable } from './InvoiceReviewTable';
import { useInvoiceScanner, LOADING_MESSAGES } from './useInvoiceScanner';

/* ─── Loading spinner con mensajes rotativos ─── */
function ScanningOverlay({ messageIdx }: { messageIdx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      {/* Spinner */}
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

      {/* Mensajes rotativos */}
      <div className="h-7 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="text-center font-bold text-[#8b949e]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.04em' }}
          >
            {LOADING_MESSAGES[messageIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-xs text-[#484f58] text-center">
        Gemini 1.5 Flash está analizando la imagen...
      </p>
    </motion.div>
  );
}

/* ─── Barra de progreso de importación ─── */
function ImportingOverlay({ progress, total }: { progress: number; total: number }) {
  const pct = total > 0 ? (progress / total) * 100 : 0;
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
          {progress} de {total}
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

/* ─── Toast final ─── */
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3.5 rounded-2xl font-bold text-white text-sm"
      style={{
        fontFamily: '"Barlow Condensed", sans-serif',
        letterSpacing: '0.05em',
        background: 'linear-gradient(135deg,#009A3A,#007b2e)',
        boxShadow: '0 8px 32px rgba(0,154,58,0.45)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </motion.div>
  );
}

/* ─── InvoicePage ─── */
export function InvoicePage() {
  const navigate = useNavigate();
  const {
    step,
    setStep,
    productos,
    proveedor,
    error,
    setError,
    importProgress,
    importTotal,
    loadingMessageIdx,
    globalGanancia,
    setGlobalGanancia,
    gananciaMode,
    setGananciaMode,
    scanImage,
    ejecutarImportacion,
    updateProducto,
    toggleAll,
    reset,
  } = useInvoiceScanner();

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleImport = async () => {
    const result = await ejecutarImportacion();
    if (!result) return;
    setStep('done');
    setToastMsg(`✅ ${result.creados} creados · ${result.actualizados} actualizados`);
  };

  useEffect(() => {
    if (step === 'done') {
      const t = setTimeout(() => navigate('/products'), 3000);
      return () => clearTimeout(t);
    }
  }, [step, navigate]);

  const selectedCount = productos.filter((p) => p.seleccionado).length;
  const isLoading = step === 'scanning' || step === 'fetching-images';

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
          onClick={() => navigate('/products')}
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
          {proveedor && step === 'review' && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#8b949e] mt-0.5"
            >
              Proveedor detectado:{' '}
              <span className="font-bold text-[#e6edf3]">{proveedor}</span>
            </motion.p>
          )}
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
          {step === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 md:p-8"
            >
              {/* Error */}
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
                      onClick={() => setError(null)}
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

              <CameraCapture onCapture={scanImage} />
            </motion.div>
          )}

          {/* Step: scanning / fetching-images */}
          {isLoading && (
            <motion.div key="loading" className="p-6 md:p-8">
              <ScanningOverlay messageIdx={loadingMessageIdx} />
            </motion.div>
          )}

          {/* Step: review */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 md:p-6"
            >
              <InvoiceReviewTable
                productos={productos}
                onUpdateProducto={updateProducto}
                onToggleAll={toggleAll}
                globalGanancia={globalGanancia}
                onGlobalGananciaChange={setGlobalGanancia}
                gananciaMode={gananciaMode}
                onGananciaModeChange={setGananciaMode}
              />
            </motion.div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <motion.div key="importing" className="p-6 md:p-8">
              <ImportingOverlay progress={importProgress} total={importTotal} />
            </motion.div>
          )}

          {/* Step: done */}
          {step === 'done' && (
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
              <p className="text-sm text-[#8b949e]">Redirigiendo a productos...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Action bar (solo en review) ─── */}
      <AnimatePresence>
        {step === 'review' && (
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
              onClick={() => reset()}
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
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.06em',
                background: selectedCount > 0
                  ? 'linear-gradient(135deg,#009A3A,#007b2e)'
                  : 'rgba(0,154,58,0.3)',
                boxShadow: selectedCount > 0 ? '0 4px 18px rgba(0,154,58,0.35)' : 'none',
              }}
            >
              <Download size={15} />
              CONFIRMAR IMPORTACIÓN
              {selectedCount > 0 && (
                <span
                  className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-black"
                  style={{ background: 'rgba(255,255,255,0.18)' }}
                >
                  {selectedCount}
                </span>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast final ─── */}
      <AnimatePresence>
        {toastMsg && step === 'done' && <Toast key="toast" message={toastMsg} />}
      </AnimatePresence>
    </motion.div>
  );
}
