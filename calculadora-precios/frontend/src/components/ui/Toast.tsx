import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, ToastVariant } from '@/store/toastStore';

const BACKGROUND: Record<ToastVariant, string> = {
  success: 'linear-gradient(135deg,#009A3A,#007b2e)',
  error: 'linear-gradient(135deg,#d93636,#a32626)',
  info: 'linear-gradient(135deg,#2d6fd9,#1e4f9c)',
};

// Host unico montado en App.tsx. Cualquier parte de la app (componentes,
// stores, AuthContext) llama useToastStore.getState().show(mensaje) para
// mostrar un aviso, sin depender de estar dentro de un arbol de React.
export function ToastHost() {
  const { message, variant, hide } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 4000);
    return () => clearTimeout(t);
  }, [message, hide]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3.5 rounded-2xl font-bold text-white text-sm max-w-[90vw] text-center"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.05em',
            background: BACKGROUND[variant],
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
