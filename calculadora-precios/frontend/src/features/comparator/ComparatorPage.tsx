import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductStore } from '../../store/productStore';
import { useProviderStore } from '../../store/providerStore';
import { ProductPriceComparison } from '../../types/provider';
import { SecureInput } from '../../components/ui/SecureInput';
import { Search, X, Trophy } from 'lucide-react';

export function ComparatorPage() {
  const { products } = useProductStore();
  const { providers } = useProviderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductPriceComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const uniqueProductNames = Array.from(new Set(products.map((p) => p.name))).sort();
  const filteredProducts = uniqueProductNames.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => { setHighlightedIndex(-1); }, [searchTerm]);

  const handleSelectProduct = (productName: string) => {
    setLoading(true);
    setError(null);
    setHighlightedIndex(-1);
    try {
      const productVariants = products.filter((p) => p.name === productName);
      const comparison: ProductPriceComparison = {
        product: { id: 0, name: productName, category: '' },
        prices: productVariants
          .filter((p) => p.providerId !== undefined)
          .map((p) => {
            const provider = providers.find((prov) => prov.id === p.providerId);
            return {
              id: p.id, product_id: p.id, provider_id: p.providerId!,
              cost_usd: p.costUSD, profit_percentage: p.profitPercentage,
              exempt_from_vat: p.exemptFromVAT, photo_url: p.photoUrl,
              updated_at: p.updatedAt ?? undefined,
              provider_name: provider?.name || 'Desconocido',
            };
          })
          .sort((a, b) => a.cost_usd - b.cost_usd),
      };
      setSelectedProduct(comparison);
    } catch (err: any) {
      setError('Error al cargar datos del producto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => prev < filteredProducts.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          const name = filteredProducts[highlightedIndex];
          setSearchTerm(name);
          handleSelectProduct(name);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchTerm('');
        setSelectedProduct(null);
        setHighlightedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0) {
      const listbox = document.querySelector('[role="listbox"]');
      if (listbox) {
        const items = listbox.querySelectorAll('[role="option"]');
        (items[highlightedIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (searchTerm === '') { setSelectedProduct(null); setError(null); setHighlightedIndex(-1); }
  }, [searchTerm]);

  const minPrice = selectedProduct?.prices.length
    ? Math.min(...selectedProduct.prices.map((p) => p.cost_usd))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h1 className="font-black text-[#e6edf3] uppercase tracking-wide"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.7rem,4vw,2.4rem)', letterSpacing: '0.06em' }}>
          Comparador de Precios
        </h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Busca un producto y compara precios entre proveedores
        </p>
      </div>

      {/* Search Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
          Buscar Producto
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={15} className="text-[#8b949e]" />
          </div>
          <SecureInput
            value={searchTerm}
            onChange={(value) => { setSearchTerm(value); setHighlightedIndex(-1); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Ej: Malta 1.5L"
            inputMode="text"
            editable
            noRing
            displayClassName={`!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl pl-9 ${
              highlightedIndex === -1 ? '' : '!border-white/5'
            }`}
          />
          <AnimatePresence>
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedProduct(null); setHighlightedIndex(-1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] z-10 transition p-1 rounded"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {searchTerm && filteredProducts.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="listbox"
              className="mt-2 rounded-xl max-h-60 overflow-y-auto"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#1c2128' }}
            >
              {filteredProducts.map((productName, index) => (
                <li
                  key={productName}
                  onClick={() => { setSearchTerm(productName); handleSelectProduct(productName); setHighlightedIndex(-1); }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className="px-4 py-3 cursor-pointer transition-colors text-sm"
                  style={{
                    background: index === highlightedIndex ? 'rgba(0,154,58,0.1)' : 'transparent',
                    color: index === highlightedIndex ? '#009A3A' : '#8b949e',
                    borderBottom: index < filteredProducts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    fontWeight: index === highlightedIndex ? 700 : 400,
                    outline: index === highlightedIndex ? '1px solid rgba(0,154,58,0.25)' : 'none',
                    outlineOffset: '-1px',
                  }}
                >
                  {productName}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-[#009A3A]/30 border-t-[#009A3A] animate-spin" />
          <p className="text-[#8b949e] text-sm">Cargando comparación...</p>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}
          >
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-[#C8102E] text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No prices */}
      <AnimatePresence>
        {!loading && selectedProduct && selectedProduct.prices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-8 text-center"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-[#e6edf3] mb-2">No hay precios registrados</h3>
            <p className="text-[#8b949e] text-sm">
              Este producto no tiene precios asociados a proveedores. Agrega proveedores desde el formulario de productos.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results table */}
      <AnimatePresence>
        {!loading && selectedProduct && selectedProduct.prices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1c2128' }}>
              <h2 className="font-black text-[#e6edf3] uppercase tracking-wide"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem', letterSpacing: '0.06em' }}>
                {selectedProduct.product.name}
              </h2>
              <p className="text-xs text-[#8b949e] mt-0.5">
                {selectedProduct.prices.length} proveedor(es) · ordenado por precio
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead style={{ background: '#21262d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <tr>
                    <th className="h-11 px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Proveedor</th>
                    <th className="h-11 px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Precio USD</th>
                    <th className="h-11 px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Margen</th>
                    <th className="h-11 px-5 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.prices.map((price, index) => {
                    const isCheapest = minPrice !== null && price.cost_usd === minPrice;
                    return (
                      <motion.tr
                        key={price.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          background: isCheapest
                            ? 'rgba(0,154,58,0.06)'
                            : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          borderLeft: isCheapest ? '3px solid #009A3A' : '3px solid transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#e6edf3]">{price.provider_name}</span>
                            {isCheapest && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider"
                                style={{
                                  background: 'rgba(0,154,58,0.15)',
                                  border: '1px solid rgba(0,154,58,0.25)',
                                  color: '#009A3A',
                                }}
                              >
                                <Trophy size={9} /> Más barato
                              </motion.span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className="font-black"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '1.1rem',
                              color: isCheapest ? '#009A3A' : '#e6edf3',
                            }}>
                            ${price.cost_usd.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right text-[#8b949e] text-sm"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          {price.profit_percentage}%
                        </td>
                        <td className="p-4 align-middle text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                            price.exempt_from_vat
                              ? 'text-[#C8102E] border-[#C8102E]/25'
                              : 'text-[#009A3A] border-[#009A3A]/25'
                          }`}
                            style={{ background: price.exempt_from_vat ? 'rgba(200,16,46,0.08)' : 'rgba(0,154,58,0.08)', border: '1px solid' }}>
                            {price.exempt_from_vat ? 'Exento' : 'Sí'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial empty state */}
      {!searchTerm && !selectedProduct && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-16 rounded-2xl"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-base font-bold text-[#e6edf3] mb-2">Busca un producto para comparar</h3>
          <p className="text-[#8b949e] text-sm max-w-md mx-auto">
            Ingresa el nombre de un producto para ver los precios de todos los proveedores que lo ofrecen.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
