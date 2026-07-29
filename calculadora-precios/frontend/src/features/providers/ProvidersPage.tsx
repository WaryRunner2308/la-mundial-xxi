import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProviderStore } from '../../store/providerStore';
import { useProductStore } from '@/store/productStore';
import { useNavigate } from 'react-router-dom';
import { ProviderForm } from '../providers/ProviderForm';
import { ProviderProductsModal } from './ProviderProductsModal';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';

export function ProvidersPage() {
  const { providers, loading, error, fetchProviders, deleteProvider } = useProviderStore();
  const [editingProvider, setEditingProvider] = useState<{ id: number; name: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<number | null>(null);

  useEffect(() => {
    fetchProviders().catch(() => {});
  }, [fetchProviders]);

  const handleEdit = (provider: { id: number; name: string }) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProvider(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting provider:', err);
    }
  };

  const { highlightedIndex, handleKeyDown, setHighlightedIndex, containerRef } = useKeyboardNavigation({
    items: providers,
    onSelect: (provider) => handleEdit(provider),
    autoFocus: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex justify-between items-start md:items-center gap-4 flex-col md:flex-row">
        <div>
          <h1 className="font-black text-[#e6edf3] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.7rem,4vw,2.4rem)', letterSpacing: '0.06em' }}>
            Proveedores
          </h1>
          <p className="text-sm text-[#8b949e] mt-1">Gestiona los proveedores de tus productos</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition text-sm w-full md:w-auto justify-center"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg,#009A3A,#007b2e)',
            boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          AGREGAR PROVEEDOR
        </motion.button>
      </div>

      {/* Providers Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
        {loading ? (
          <div className="text-center py-14">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-[#009A3A]/30 border-t-[#009A3A] animate-spin" />
            <p className="text-[#8b949e] text-sm">Cargando proveedores...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl text-sm text-[#C8102E]"
            style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)', margin: '1rem' }}>
            ⚠️ {error}
          </div>
        ) : providers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Truck size={24} style={{ color: '#484f58' }} />
            </div>
            <h3 className="font-black text-[#8b949e] mb-2 uppercase tracking-wide"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.2rem' }}>
              No hay proveedores
            </h3>
            <p className="text-[#484f58] text-sm mb-6">Agrega tu primer proveedor para comenzar</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition text-sm"
              style={{ background: 'linear-gradient(135deg,#009A3A,#007b2e)', boxShadow: '0 4px 16px rgba(0,154,58,0.3)' }}
            >
              <Plus size={15} /> Agregar Proveedor
            </motion.button>
          </motion.div>
        ) : (
          <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseLeave={() => setHighlightedIndex(-1)}
            aria-label="Lista de proveedores"
            role="grid"
            className="outline-none"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px]">
                <thead style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <tr>
                    <th className="h-11 px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Nombre</th>
                    <th className="h-11 px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Productos</th>
                    <th className="h-11 px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {providers.map((provider, index) => {
                      const isHighlighted = highlightedIndex === index;
                      return (
                        <motion.tr
                          key={provider.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                          transition={{ delay: index * 0.04, duration: 0.3 }}
                          style={{
                            background: isHighlighted
                              ? 'rgba(0,154,58,0.07)'
                              : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                            borderLeft: isHighlighted ? '3px solid #009A3A' : '3px solid transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => { handleEdit(provider); setHighlightedIndex(index); }}
                          role="row"
                          aria-selected={isHighlighted}
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(0,154,58,0.08)', border: '1px solid rgba(0,154,58,0.15)' }}>
                                <Truck size={13} style={{ color: '#009A3A' }} />
                              </div>
                              <span className="text-sm font-semibold text-[#e6edf3]">{provider.name}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <ProviderProductCount
                              providerId={provider.id}
                              onOpenModal={setSelectedProviderForModal}
                            />
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleEdit(provider); }}
                                className="p-2 rounded-lg text-[#8b949e] hover:text-[#009A3A] transition-colors"
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.1)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                title="Editar"
                                aria-label={`Editar proveedor ${provider.name}`}
                              >
                                <Pencil size={13} strokeWidth={2} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(provider.id); }}
                                className="p-2 rounded-lg text-[#8b949e] hover:text-[#C8102E] transition-colors"
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,16,46,0.1)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                title="Eliminar"
                                aria-label={`Eliminar proveedor ${provider.name}`}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Provider Form */}
      <ProviderForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={() => { setShowForm(false); fetchProviders().catch(() => {}); }}
        editingProvider={editingProvider}
      />

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="max-w-sm w-full rounded-2xl p-6"
              style={{
                background: '#161b22',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex h-[3px] rounded-full overflow-hidden mb-5">
                <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
                <div style={{ flex: 3, background: '#C8102E' }} />
              </div>

              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)' }}>
                  <Trash2 size={22} style={{ color: '#C8102E' }} />
                </div>
                <h3 className="font-black text-[#e6edf3] mb-2 uppercase tracking-wide"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.2rem' }}>
                  ¿Eliminar proveedor?
                </h3>
                <p className="text-[#8b949e] mb-6 text-sm">
                  Esto no eliminará los productos asociados, pero quedarán sin proveedor.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 rounded-xl text-[#8b949e] font-semibold hover:text-[#e6edf3] transition text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-3 text-white font-bold rounded-xl transition text-sm"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      letterSpacing: '0.06em',
                      background: 'linear-gradient(135deg,#C8102E,#a00d25)',
                      boxShadow: '0 4px 16px rgba(200,16,46,0.3)',
                    }}
                  >
                    ELIMINAR
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProviderProductsModal
        providerId={selectedProviderForModal}
        onClose={() => setSelectedProviderForModal(null)}
      />
    </motion.div>
  );
}

function ProviderProductCount({ providerId, onOpenModal }: { providerId: number; onOpenModal: (id: number) => void }) {
  const { products } = useProductStore();
  const count = products.filter((p) => p.providerId === providerId).length;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpenModal(providerId); }}
      className="text-sm font-semibold transition-colors hover:underline"
      style={{ color: '#009A3A' }}
      title="Ver productos de este proveedor"
    >
      {count} producto{count !== 1 ? 's' : ''}
    </button>
  );
}
