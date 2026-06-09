import React from 'react';
import { useProductStore, Product } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useProviderStore } from '../../store/providerStore';
import { ProductForm } from './ProductForm';
import { formatAmountWithCurrency } from '../../utils/format';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { SecureInput } from '@/components/ui/SecureInput';
import { Search, X, Pencil, Trash2, Plus, FilterX } from 'lucide-react';

type Currency = 'Bs' | 'USD';

interface ProductWithDynamicPrices {
  id: number;
  name: string;
  costUSD: number;
  originalCurrency: Currency;
  profitPercentage: number;
  exemptFromVAT: boolean;
  photoUrl: string;
  priceWithVATUSD: number;
  utilityUSD: number;
}

function useProductsWithDynamicPrices(products: Product[]) {
  const rate = useCurrencyStore((state) => state.rate);
  return React.useMemo(() => {
    return products.map(product => {
      const divisor = 1 - (product.profitPercentage / 100);
      const priceBaseUSD = divisor <= 0 ? product.costUSD : product.costUSD / divisor;
      const utilityUSD = priceBaseUSD - product.costUSD;
      const priceWithVATUSD = product.exemptFromVAT ? priceBaseUSD : priceBaseUSD * 1.16;
      return {
        ...product,
        priceWithVATUSD: Math.round(priceWithVATUSD * 100) / 100,
        utilityUSD: Math.round(utilityUSD * 100) / 100,
      } as ProductWithDynamicPrices;
    });
  }, [products]);
}

export function ProductsPage({ onEditRate, userRole }: { onEditRate: () => void; userRole: 'gerencia' | 'invitado' | null }) {
  const { products, removeProduct } = useProductStore((state) => state);
  const { providers } = useProviderStore();
  const rate = useCurrencyStore((state) => state.rate);
  const [showForm, setShowForm] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<{
    id: number; name: string; cost: number; currency: Currency;
    profitPercentage: number; exemptFromVAT: boolean; photoUrl: string;
  } | null>(null);
  const [productToDelete, setProductToDelete] = React.useState<{ id: number; name: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const providerFilterId = searchParams.get('providerId');
  const [searchQuery, setSearchQuery] = React.useState('');

  const isGerencia = userRole === 'gerencia';

  const filteredProducts = products
    .filter(p => {
      const matchesProvider = providerFilterId ? p.providerId?.toString() === providerFilterId : true;
      const matchesSearch = searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchesProvider && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentProvider = providerFilterId ? providers.find(p => p.id.toString() === providerFilterId) : null;
  const productsWithPrices = useProductsWithDynamicPrices(filteredProducts);

  const { highlightedIndex, handleKeyDown, setHighlightedIndex, containerRef } = useKeyboardNavigation({
    items: productsWithPrices,
    onSelect: (product) => {
      setEditingProduct({
        id: product.id, name: product.name,
        cost: product.costUSD * (rate > 0 ? rate : 1),
        currency: product.originalCurrency,
        profitPercentage: product.profitPercentage,
        exemptFromVAT: product.exemptFromVAT,
        photoUrl: product.photoUrl,
      });
      setShowForm(true);
    },
    autoFocus: false,
  });

  return (
    <div className="space-y-4 md:space-y-5">

      {/* Header */}
      <div className="animate-fade-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1
            className="font-black text-[#0d1f14] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', letterSpacing: '0.06em' }}
          >
            Gestión de Productos
          </h1>
          <div className="flex items-center mt-1 gap-2">
            <p className="text-sm text-[#7aaa8a]">
              {rate > 0
                ? <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>1 USD = {rate.toFixed(2)} Bs</span>
                : '⚠️ Tasa no configurada'}
            </p>
            {rate > 0 && (
              <button onClick={onEditRate} className="p-1 text-[#7aaa8a] hover:text-[#009A3A] hover:bg-[#e8f7ed] rounded-lg transition" title="Editar tasa">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {isGerencia && (
          <button
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#009A3A] hover:bg-[#007b2e] text-white font-bold rounded-xl shadow-md transition text-sm w-full md:w-auto justify-center"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em', fontSize: '0.95rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            AGREGAR PRODUCTO
          </button>
        )}
      </div>

      {/* Stats Card */}
      <div className="animate-fade-up-1 card-lift bg-white border border-[#e4ede6] rounded-2xl p-5 md:p-7 overflow-hidden relative shadow-sm">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 80% at 5% 50%, rgba(0,154,58,0.04) 0%, transparent 60%)' }}
        />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-4">
            <div>
              <h2
                className="font-black text-[#0d1f14] uppercase tracking-widest leading-none"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', letterSpacing: '0.12em' }}
              >
                <span className="text-[#009A3A]">LA</span>{' '}MUNDIAL
              </h2>
              <span className="text-[#7aaa8a] uppercase tracking-[0.2em] font-semibold" style={{ fontSize: '0.65rem' }}>
                XXI · Gestión de Precios
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <div
              className="animate-number-pop font-black text-[#009A3A] leading-none"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(3rem, 8vw, 4.5rem)' }}
            >
              {filteredProducts.length}
            </div>
            <p className="text-[11px] font-semibold text-[#7aaa8a] mt-1 uppercase tracking-widest">
              {currentProvider ? `Productos de ${currentProvider.name}` : 'Productos'}
            </p>
          </div>
        </div>
        <div className="animate-pulse-bar mt-4 flex h-[2px] rounded-full overflow-hidden">
          <div className="bg-[#009A3A]" style={{ flex: 2 }} />
          <div className="bg-[#C8102E]" style={{ flex: 3 }} />
        </div>
      </div>

      {/* Search */}
      <div className="animate-fade-up-2 bg-white border border-[#e4ede6] rounded-xl p-3 shadow-sm">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-[#7aaa8a]" />
          </div>
          <SecureInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar producto por nombre..."
            inputMode="text"
            editable
            noRing
            displayClassName="!bg-transparent !border-transparent !text-[#0d1f14] pl-9 !rounded-lg !min-h-[40px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#7aaa8a] hover:text-[#0d1f14] hover:bg-[#f0f5f2] rounded-lg z-10 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="animate-fade-up-3 bg-white border border-[#e4ede6] rounded-2xl overflow-hidden shadow-sm">

        <div className="px-4 md:px-6 py-3 border-b border-[#e4ede6] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2
            className="font-black text-[#0d1f14] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem', letterSpacing: '0.06em' }}
          >
            Lista de Productos{' '}
            <span className="text-[#7aaa8a] font-semibold text-xs normal-case tracking-normal" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ({filteredProducts.length} de {products.length})
            </span>
          </h2>
          {currentProvider && isGerencia && (
            <button
              onClick={() => navigate('/products')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#009A3A] hover:bg-[#e8f7ed] border border-[#009A3A]/25 rounded-lg transition"
            >
              <FilterX size={13} /> Limpiar Filtro
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseLeave={() => setHighlightedIndex(-1)}
          aria-label="Lista de productos"
          role="grid"
          className="outline-none"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-[#f5f8f5] border-b border-[#e4ede6]">
                <tr>
                  <th className="h-11 px-3 md:px-5 text-left text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap min-w-[70px]">Foto</th>
                  <th className="h-11 px-3 md:px-5 text-left text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">Nombre</th>
                  <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">Precio Final</th>
                  {isGerencia && (
                    <>
                      <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">Costo</th>
                      <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">Ganancia</th>
                      <th className="h-11 px-3 md:px-5 text-center text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">Margen</th>
                      <th className="h-11 px-3 md:px-5 text-center text-[10px] font-black text-[#7aaa8a] uppercase tracking-widest align-middle whitespace-nowrap">IVA</th>
                      <th className="h-11 px-3 md:px-5 align-middle whitespace-nowrap" />
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0f5f2]">
                {productsWithPrices.map((product, index) => {
                  const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                  const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                  const utilityBs = rate > 0 ? product.utilityUSD * rate : product.utilityUSD;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <tr
                      key={product.id}
                      className={`animate-row-in transition-colors duration-100 ${
                        isHighlighted ? 'bg-[#e8f7ed] border-l-4 border-l-[#009A3A]' : 'hover:bg-[#f8faf8]'
                      }`}
                      style={{ animationDelay: `${0.28 + index * 0.025}s` }}
                      role="row"
                      aria-selected={isHighlighted}
                    >
                      {/* Foto */}
                      <td className="px-3 md:px-5 py-3 md:py-4 align-middle">
                        {product.photoUrl ? (
                          <img src={product.photoUrl} className="w-10 h-10 object-cover rounded-xl border border-[#e4ede6]" alt="" />
                        ) : (
                          <div className="w-10 h-10 bg-[#f0f5f2] border border-[#e4ede6] rounded-xl flex items-center justify-center text-xs text-[#7aaa8a]">📷</div>
                        )}
                      </td>

                      {/* Nombre */}
                      <td className="px-3 md:px-5 py-3 md:py-4 align-middle font-semibold text-[#0d1f14] text-sm md:text-base">
                        {product.name}
                      </td>

                      {/* Precio Final */}
                      <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                        {rate > 0 ? (
                          <>
                            <div className="font-black text-[#0d1f14]" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)' }}>
                              {priceWithVATBs.toFixed(2)} <span className="text-[#7aaa8a] text-xs font-bold">Bs</span>
                            </div>
                            <div className="text-xs text-[#7aaa8a]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {product.priceWithVATUSD.toFixed(2)} USD
                            </div>
                          </>
                        ) : (
                          <div className="font-black text-[#0d1f14]" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>
                            {product.priceWithVATUSD.toFixed(2)} USD
                          </div>
                        )}
                      </td>

                      {isGerencia && (
                        <>
                          {/* Costo */}
                          <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                            {rate > 0 ? (
                              <>
                                <div className="font-bold text-[#3d6b4f] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {costBs.toFixed(2)} <span className="text-[#7aaa8a] text-xs">Bs</span>
                                </div>
                                <div className="text-xs text-[#7aaa8a]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {product.costUSD.toFixed(2)} USD
                                </div>
                              </>
                            ) : (
                              <div className="font-bold text-[#3d6b4f] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {product.costUSD.toFixed(2)} USD
                              </div>
                            )}
                          </td>

                          {/* Ganancia */}
                          <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                            {rate > 0 ? (
                              <>
                                <div className="font-black text-[#009A3A]" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(0.95rem, 2vw, 1.2rem)' }}>
                                  {utilityBs.toFixed(2)} <span className="text-[#007b2e] text-xs font-bold">Bs</span>
                                </div>
                                <div className="text-xs text-[#7aaa8a]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {product.utilityUSD.toFixed(2)} USD
                                </div>
                              </>
                            ) : (
                              <div className="font-black text-[#009A3A] text-lg" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {product.utilityUSD.toFixed(2)} USD
                              </div>
                            )}
                          </td>

                          {/* Margen */}
                          <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-center">
                            <span className="text-[#3d6b4f] font-bold text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {product.profitPercentage}%
                            </span>
                          </td>

                          {/* IVA */}
                          <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-center">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider ${
                              product.exemptFromVAT
                                ? 'bg-[#fde8ec] text-[#C8102E] border-[#C8102E]/20'
                                : 'bg-[#e8f7ed] text-[#009A3A] border-[#009A3A]/20'
                            }`}>
                              {product.exemptFromVAT ? 'Exento' : 'Sí'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 md:px-5 py-3 md:py-4 align-middle">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProduct({
                                    id: product.id, name: product.name,
                                    cost: product.costUSD * (rate > 0 ? rate : 1),
                                    currency: product.originalCurrency,
                                    profitPercentage: product.profitPercentage,
                                    exemptFromVAT: product.exemptFromVAT,
                                    photoUrl: product.photoUrl,
                                  });
                                  setShowForm(true);
                                }}
                                className="p-2 text-[#7aaa8a] hover:text-[#009A3A] hover:bg-[#e8f7ed] rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={13} strokeWidth={2} />
                              </button>
                              <button
                                onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                                className="p-2 text-[#7aaa8a] hover:text-[#C8102E] hover:bg-[#fde8ec] rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {productsWithPrices.length === 0 && (
            <div className="text-center py-14">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#f0f5f2] border border-[#e4ede6] rounded-2xl flex items-center justify-center text-3xl">📦</div>
              <h3 className="font-black text-[#3d6b4f] mb-2 uppercase tracking-wide" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.2rem' }}>
                No hay productos
              </h3>
              <p className="text-sm text-[#7aaa8a] mb-6">Agrega tu primer producto para comenzar</p>
              {isGerencia && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009A3A] hover:bg-[#007b2e] text-white font-bold rounded-xl transition text-sm"
                >
                  <Plus size={15} /> Agregar Primer Producto
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ProductForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingProduct(null); }}
        productToEdit={editingProduct}
        onSave={() => { setShowForm(false); setEditingProduct(null); }}
      />

      <ConfirmationModal
        isOpen={productToDelete !== null}
        title="¿Eliminar producto?"
        message={`¿Estás seguro de que deseas eliminar "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={async () => {
          if (productToDelete) {
            try { await removeProduct(productToDelete.id); }
            catch { alert('Error al eliminar el producto. Inténtalo de nuevo.'); }
            finally { setProductToDelete(null); }
          }
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
