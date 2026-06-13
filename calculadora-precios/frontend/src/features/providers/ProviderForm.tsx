import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, X } from 'lucide-react';
import { useProviderStore } from '../../store/providerStore';
import { SecureInput } from '@/components/ui/SecureInput';

interface ProviderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  editingProvider?: { id: number; name: string } | null;
}

export function ProviderForm({ isOpen, onClose, onSave, editingProvider }: ProviderFormProps) {
  const { addProvider, updateProvider } = useProviderStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingProvider) {
      setName(editingProvider.name);
    } else {
      setName('');
    }
    setError(null);
  }, [editingProvider, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, name.trim());
      } else {
        await addProvider(name.trim());
      }
      onSave?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="max-w-md w-full rounded-2xl p-6 md:p-8"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Strip Portugal */}
            <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
              <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
              <div style={{ flex: 3, background: '#C8102E' }} />
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.2)' }}>
                  <Truck size={20} style={{ color: '#009A3A' }} />
                </div>
                <div>
                  <h2 className="font-black text-[#e6edf3] uppercase tracking-wide leading-none"
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                    {editingProvider ? 'Editar Proveedor' : 'Agregar Proveedor'}
                  </h2>
                  <p className="text-sm text-[#8b949e] mt-1.5">
                    {editingProvider ? 'Modifica el nombre del proveedor' : 'Registra un nuevo proveedor para tus productos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl transition flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
              <div>
                <span className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                  Nombre del Proveedor *
                </span>
                <SecureInput
                  value={name}
                  onChange={(v) => { setName(v); setError(null); }}
                  onSubmit={handleSubmit}
                  placeholder="Ej: Polar, Coca-Cola, Luventa"
                  inputMode="text"
                  editable
                  noRing
                  displayClassName="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
                  autoFocus
                />
                {error && (
                  <div className="mt-2 p-3 rounded-xl text-sm flex items-center gap-2 text-[#C8102E]"
                    style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-5 py-3 rounded-xl text-[#8b949e] font-semibold hover:text-[#e6edf3] transition text-sm disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-5 py-3 text-white font-bold rounded-xl transition text-sm disabled:opacity-50"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                    boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                  }}
                >
                  {loading ? 'Guardando...' : (editingProvider ? 'ACTUALIZAR' : 'AGREGAR')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
