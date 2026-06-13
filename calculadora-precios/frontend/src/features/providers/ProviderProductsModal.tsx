import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductStore } from '@/store/productStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { X, Pencil, Package } from 'lucide-react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { ProductForm } from '../products/ProductForm';

type Currency = 'Bs' | 'USD';

interface ProviderProductsModalProps {
  providerId: number | null;
  onClose: () => void;
}

export function ProviderProductsModal({ providerId, onClose }: ProviderProductsModalProps) {
  const { products } = useProductStore();
  const rate = useCurrencyStore((state) => state.rate);
  const [editingProduct, setEditingProduct] = useState<{
    id: number; name: string; cost: number; currency: Currency;
    profitPercentage: number; exemptFromVAT: boolean; photoUrl: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filtrar productos del proveedor
  const providerProducts = products.filter((p) => p.providerId === providerId);

  // Calcular precios dinámicos
  const productsWithPrices = providerProducts.map((product) => {
    const divisor = 1 - (product.profitPercentage / 100);
    const priceBaseUSD = divisor <= 0 ? product.costUSD : product.costUSD / divisor;
    const priceWithVATUSD = product.exemptFromVAT ? priceBaseUSD : priceBaseUSD * 1.16;
    return {
      ...product,
      priceWithVATUSD: Math.round(priceWithVATUSD * 100) / 100,
    };
  });

  const handleEditProduct = (product: typeof productsWithPrices[number]) => {
    setEditingProduct({
      id: product.id, name: product.name,
      cost: product.costUSD * (rate > 0 ? rate : 1),
      currency: product.originalCurrency,
      profitPercentage: product.profitPercentage,
      exemptFromVAT: product.exemptFromVAT,
      photoUrl: product.photoUrl,
    });
    setShowForm(true);
  };

  // Navegación por teclado: Enter abre la edición del producto resaltado
  const { highlightedIndex, setHighlightedIndex, handleKeyDown } = useKeyboardNavigation({
    items: productsWithPrices,
    onSelect: (product) => handleEditProduct(product),
    enabled: true,
  });

  if (!providerId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop con desenfoque */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="relative rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            background: '#161b22',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
          }}
        >
          {/* Strip Portugal */}
          <div className="flex h-[2px] flex-shrink-0">
            <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
            <div style={{ flex: 3, background: '#C8102E' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.2)' }}>
                <Package size={20} style={{ color: '#009A3A' }} />
              </div>
              <div>
                <h2 className="font-black text-[#e6edf3] uppercase tracking-wide leading-none"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  Productos del Proveedor
                </h2>
                <p className="text-sm text-[#8b949e] mt-1.5">
                  {productsWithPrices.length} producto{productsWithPrices.length !== 1 ? 's' : ''} encontrado{productsWithPrices.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e6edf3'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b949e'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Contenido con scroll */}
          <div className="flex-1 overflow-y-auto">
            {productsWithPrices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#8b949e]">
                <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                  📦
                </div>
                <p className="text-lg font-bold text-[#8b949e]">No hay productos registrados</p>
                <p className="text-sm mt-2 text-[#484f58]">Este proveedor aún no tiene productos asociados</p>
              </div>
            ) : (
              <div
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onMouseLeave={() => setHighlightedIndex(-1)}
                aria-label="Lista de productos del proveedor"
                role="grid"
                className="outline-none"
              >
                <table className="w-full">
                  <thead className="sticky top-0 z-10" style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest">Nombre</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest">Costo</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest">Precio Final</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest">Margen</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsWithPrices.map((product, index) => {
                      const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                      const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                      const isHighlighted = highlightedIndex === index;

                      return (
                        <tr
                          key={product.id}
                          style={{
                            background: isHighlighted ? 'rgba(0,154,58,0.07)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            borderLeft: isHighlighted ? '3px solid #009A3A' : '3px solid transparent',
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {product.photoUrl ? (
                                <img src={product.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[#484f58]"
                                  style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                                  📷
                                </div>
                              )}
                              <span className="font-semibold text-[#e6edf3]">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {rate > 0 ? (
                              <>
                                <div className="font-semibold text-[#e6edf3]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {costBs.toFixed(2)} Bs
                                </div>
                                <div className="text-xs text-[#484f58]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {product.costUSD.toFixed(2)} USD
                                </div>
                              </>
                            ) : (
                              <div className="font-semibold text-[#e6edf3]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {product.costUSD.toFixed(2)} USD
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {rate > 0 ? (
                              <>
                                <div className="font-bold text-lg text-[#009A3A]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {priceWithVATBs.toFixed(2)} Bs
                                </div>
                                <div className="text-xs text-[#484f58]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {product.priceWithVATUSD.toFixed(2)} USD
                                </div>
                              </>
                            ) : (
                              <div className="font-bold text-lg text-[#009A3A]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {product.priceWithVATUSD.toFixed(2)} USD
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full"
                              style={{ background: 'rgba(0,154,58,0.1)', color: '#1ebb60', border: '1px solid rgba(0,154,58,0.25)' }}>
                              {product.profitPercentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <motion.button
                              whileHover={{ scale: 1.12 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEditProduct(product)}
                              className="p-2 rounded-lg text-[#8b949e] hover:text-[#009A3A] transition-colors"
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.1)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              title="Editar producto"
                            >
                              <Pencil size={15} strokeWidth={2} />
                            </motion.button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-white font-bold rounded-xl transition text-sm"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                boxShadow: '0 4px 16px rgba(0,154,58,0.3)',
              }}
            >
              CERRAR
            </button>
          </div>
        </motion.div>
      </div>

      {/* Form de edición del producto (lapicito) */}
      <ProductForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingProduct(null); }}
        productToEdit={editingProduct}
        onSave={() => { setShowForm(false); setEditingProduct(null); }}
      />
    </>
  );
}
