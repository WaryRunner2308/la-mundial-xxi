import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /**
   * 'peligro' (rojo) para lo que destruye algo: borrar, descartar, salir
   * perdiendo trabajo. 'accion' (verde) para confirmar algo que se quiere
   * hacer, como importar: en rojo parecía que era el botón de cancelar.
   */
  variant?: 'peligro' | 'accion';
  onConfirm: () => void;
  onCancel: () => void;
}

const COLORES = {
  peligro: {
    acento: '#C8102E',
    fondoIcono: 'rgba(200,16,46,0.1)',
    bordeIcono: 'rgba(200,16,46,0.2)',
    boton: 'linear-gradient(135deg,#C8102E,#a00d25)',
    sombra: '0 4px 16px rgba(200,16,46,0.3)',
  },
  accion: {
    acento: '#009A3A',
    fondoIcono: 'rgba(0,154,58,0.1)',
    bordeIcono: 'rgba(0,154,58,0.2)',
    boton: 'linear-gradient(135deg,#009A3A,#007b2e)',
    sombra: '0 4px 16px rgba(0,154,58,0.3)',
  },
} as const;

export function ConfirmationModal({
  isOpen,
  title = 'Confirmación',
  message,
  confirmText = 'Sí, cancelar',
  cancelText = 'Continuar editando',
  variant = 'peligro',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const c = COLORES[variant];
  useEffect(() => {
    if (!isOpen) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-[220] p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="max-w-md w-full rounded-2xl p-6 md:p-8"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Portugal flag strip */}
            <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
              <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
              <div style={{ flex: 3, background: '#C8102E' }} />
            </div>

            <div className="flex justify-center mb-5">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 20 }}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: c.fondoIcono, border: `1px solid ${c.bordeIcono}` }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: c.acento }}
                >
                  {variant === 'accion' ? (
                    // Visto: la acción se quiere hacer, no es una advertencia
                    <>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="m9 11 3 3L22 4" />
                    </>
                  ) : (
                    <>
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </>
                  )}
                </svg>
              </motion.div>
            </div>

            <h3
              className="font-black text-[#e6edf3] text-center mb-2 uppercase tracking-wide"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.3rem', letterSpacing: '0.06em' }}
            >
              {title}
            </h3>
            <p className="text-[#8b949e] text-center mb-6 text-sm leading-relaxed">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-[#8b949e] hover:text-[#e6edf3] transition text-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {cancelText}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className="flex-1 px-4 py-3 text-white font-bold rounded-xl transition text-sm"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  background: c.boton,
                  boxShadow: c.sombra,
                }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
