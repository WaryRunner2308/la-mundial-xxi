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
    id: number;
    name: string;
    cost: number;
    currency: Currency;
    profitPercentage: number;
    exemptFromVAT: boolean;
    photoUrl: string;
  } | null>(null);
  const [productToDelete, setProductToDelete] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const providerFilterId = searchParams.get('providerId');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Determinar si es gerencia
  const isGerencia = userRole === 'gerencia';

  // Filtrar productos por proveedor y búsqueda
  const filteredProducts = products
    .filter(p => {
      const matchesProvider = providerFilterId
        ? p.providerId?.toString() === providerFilterId
        : true;
      const matchesSearch = searchQuery
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesProvider && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Obtener nombre del proveedor para el encabezado
  const currentProvider = providerFilterId
    ? providers.find(p => p.id.toString() === providerFilterId)
    : null;

  const productsWithPrices = useProductsWithDynamicPrices(filteredProducts);

  // Navegación por teclado en tabla de productos
  const { highlightedIndex, handleKeyDown, setHighlightedIndex, containerRef } = useKeyboardNavigation({
    items: productsWithPrices,
    onSelect: (product) => {
      setEditingProduct({
        id: product.id,
        name: product.name,
        cost: product.costUSD * (rate > 0 ? rate : 1),
        currency: product.originalCurrency,
        profitPercentage: product.profitPercentage,
        exemptFromVAT: product.exemptFromVAT,
        photoUrl: product.photoUrl,
      });
      setShowForm(true);
    },
    autoFocus: false, // No auto-enfocar, el foco lo controla el usuario
  });

  return (
    <div className="space-y-4 md:space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">Productos</h1>
           <div className="flex items-center mt-1">
             <p className="text-sm text-ink-3 font-mono num">
               {rate > 0 ? `1 USD = ${rate.toFixed(2)} Bs` : 'Tasa no configurada'}
             </p>
             {rate > 0 && (
               <button
                 onClick={onEditRate}
                 className="ml-2 p-1.5 text-ink-4 hover:text-price hover:bg-price-subtle rounded transition"
                 title="Editar tasa"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                   <path d="m15 5 4 4" />
                 </svg>
               </button>
             )}
           </div>
         </div>
         {isGerencia && (
           <button
             onClick={() => {
               setEditingProduct(null);
               setShowForm(true);
             }}
             className="px-4 py-2 bg-profit hover:bg-profit-hover text-surface-overlay font-semibold rounded-lg transition text-sm w-full md:w-auto flex items-center justify-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M5 12h14"/><path d="M12 5v14"/>
             </svg>
             Agregar Producto
           </button>
         )}
       </div>

        {/* Tarjeta de Estadísticas */}
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-gray-200 p-4 md:p-8 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex-1 flex items-center justify-center md:justify-start">
              <h2 className="text-3xl md:text-5xl font-black italic tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                LA MUNDIAL
              </h2>
              <span className="text-xl md:text-2xl font-bold italic text-gray-700 ml-2">XXI</span>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <div className="text-5xl md:text-6xl font-black text-blue-600 leading-none num">
                {filteredProducts.length}
              </div>
              <p className="text-xs md:text-sm font-semibold text-gray-600 mt-1 uppercase tracking-widest">
                {currentProvider ? `Productos de ${currentProvider.name}` : 'Productos'}
              </p>
            </div>
          </div>
          <div className="mt-4 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full"></div>
        </div>

         {/* Buscador de Productos */}
         <div className="bg-canvas rounded-xl border border-line p-3">
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-4">
                 <circle cx="11" cy="11" r="8" />
                 <path d="m21 21-4.3-4.3" />
               </svg>
             </div>
             <SecureInput
               value={searchQuery}
               onChange={setSearchQuery}
               placeholder="Buscar por nombre..."
               inputMode="text"
               editable
               noRing={true}
               displayClassName="w-full pl-9 pr-4 py-2 border border-line-strong rounded-lg outline-none transition text-sm bg-surface focus:ring-0 focus:border-price text-ink placeholder:text-ink-4"
             />
             {searchQuery && (
               <button
                 type="button"
                 onClick={() => setSearchQuery('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 z-10"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M18 6 6 18" />
                   <path d="m6 6 12 12" />
                 </svg>
               </button>
             )}
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-canvas rounded-xl border border-line overflow-hidden">
           {/* Header con controles */}
           <div className="px-4 md:px-6 py-3 border-b border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
             <h2 className="text-sm font-semibold text-ink-2">
               Lista de Productos
               <span className="font-normal text-ink-4 ml-2">
                 ({filteredProducts.length} de {products.length})
               </span>
             </h2>
             {currentProvider && isGerencia && (
               <button
                 onClick={() => navigate('/products')}
                 className="px-3 py-1.5 text-xs font-medium text-price hover:text-price-hover hover:bg-price-subtle rounded-lg border border-price/30 transition-colors flex items-center gap-1.5"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                 </svg>
                 Limpiar filtro
               </button>
             )}
           </div>

           {/* Contenedor de tabla con navegación por teclado */}
           <div
             ref={containerRef}
             tabIndex={0}
             onKeyDown={handleKeyDown}
             onMouseLeave={() => setHighlightedIndex(-1)}
             aria-label="Lista de productos"
             role="grid"
             className="outline-none"
           >
             <div className="overflow-x-auto px-4 md:px-0">
               <table className="w-full min-w-[600px]">
                 <thead className="bg-surface border-b border-line">
                   <tr>
                     <th className="h-10 px-2 md:px-4 text-left text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap min-w-[64px]">Foto</th>
                     <th className="h-10 px-2 md:px-4 text-left text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">Nombre</th>
                     <th className="h-10 px-2 md:px-4 text-right text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">Precio Final</th>
                     {isGerencia && (
                       <>
                         <th className="h-10 px-2 md:px-4 text-right text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">Costo</th>
                         <th className="h-10 px-2 md:px-4 text-right text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">Ganancia</th>
                         <th className="h-10 px-2 md:px-4 text-center text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">Margen</th>
                         <th className="h-10 px-2 md:px-4 text-center text-[11px] font-semibold text-ink-4 uppercase tracking-wider align-middle whitespace-nowrap">IVA</th>
                         <th className="h-10 px-2 md:px-4 align-middle whitespace-nowrap"></th>
                       </>
                     )}
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-line-soft">
                   {productsWithPrices.map((product, index) => {
                     const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                     const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                     const utilityBs = rate > 0 ? product.utilityUSD * rate : product.utilityUSD;
                     const isHighlighted = highlightedIndex === index;

                     return (
                     <tr
                       key={product.id}
                       className={`
                         hover:bg-surface transition-colors
                         ${isHighlighted ? 'bg-price-subtle border-l-2 border-l-price' : ''}
                       `}
                       role="row"
                       aria-selected={isHighlighted}
                     >
                       {/* Foto */}
                       <td className="px-2 md:px-4 py-3 align-middle">
                         {product.photoUrl ? (
                           <img src={product.photoUrl} className="w-9 h-9 object-cover rounded-lg" alt="" />
                         ) : (
                           <div className="w-9 h-9 bg-surface-raised rounded-lg flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-4">
                               <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                             </svg>
                           </div>
                         )}
                       </td>

                       {/* Nombre */}
                       <td className="px-2 md:px-4 py-3 align-middle font-medium text-ink text-sm">
                         {product.name}
                       </td>

                       {/* Precio Final */}
                       <td className="px-2 md:px-4 py-3 align-middle text-right">
                         {rate > 0 ? (
                           <>
                             <div className="font-bold text-base md:text-lg text-ink font-mono num">
                               {priceWithVATBs.toFixed(2)} Bs
                             </div>
                             <div className="text-xs text-ink-4 font-mono num mt-0.5 border-t border-line-soft pt-0.5">
                               {product.priceWithVATUSD.toFixed(2)} USD
                             </div>
                           </>
                         ) : (
                           <div className="font-bold text-base md:text-lg text-ink font-mono num">
                             {product.priceWithVATUSD.toFixed(2)} USD
                           </div>
                         )}
                       </td>

                       {/* Columnas SOLO GERENCIA */}
                       {isGerencia && (
                         <>
                           {/* Costo */}
                           <td className="px-2 md:px-4 py-3 align-middle text-right">
                             {rate > 0 ? (
                               <>
                                 <div className="font-medium text-sm text-ink-2 font-mono num">
                                   {costBs.toFixed(2)} Bs
                                 </div>
                                 <div className="text-xs text-ink-4 font-mono num mt-0.5 border-t border-line-soft pt-0.5">
                                   {product.costUSD.toFixed(2)} USD
                                 </div>
                               </>
                             ) : (
                               <div className="font-medium text-sm text-ink-2 font-mono num">
                                 {product.costUSD.toFixed(2)} USD
                               </div>
                             )}
                           </td>

                           {/* Ganancia */}
                           <td className="px-2 md:px-4 py-3 align-middle text-right">
                             {rate > 0 ? (
                               <>
                                 <div className="font-bold text-base text-profit font-mono num">
                                   {utilityBs.toFixed(2)} Bs
                                 </div>
                                 <div className="text-xs text-ink-4 font-mono num mt-0.5 border-t border-line-soft pt-0.5">
                                   {product.utilityUSD.toFixed(2)} USD
                                 </div>
                               </>
                             ) : (
                               <div className="font-bold text-base text-profit font-mono num">
                                 {product.utilityUSD.toFixed(2)} USD
                               </div>
                             )}
                           </td>

                           {/* Margen */}
                           <td className="px-2 md:px-4 py-3 align-middle text-center">
                             <span className="text-sm font-mono num text-ink-2">{product.profitPercentage}%</span>
                           </td>

                           {/* IVA */}
                           <td className="px-2 md:px-4 py-3 align-middle text-center">
                             <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${product.exemptFromVAT ? 'bg-price-subtle text-price-hover' : 'bg-profit-subtle text-profit'}`}>
                               {product.exemptFromVAT ? 'Exento' : 'Sí'}
                             </span>
                           </td>

                           {/* Acciones */}
                           <td className="px-2 md:px-4 py-3 align-middle">
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setEditingProduct({
                                     id: product.id,
                                     name: product.name,
                                     cost: product.costUSD * (rate > 0 ? rate : 1),
                                     currency: product.originalCurrency,
                                     profitPercentage: product.profitPercentage,
                                     exemptFromVAT: product.exemptFromVAT,
                                     photoUrl: product.photoUrl,
                                   });
                                   setShowForm(true);
                                 }}
                                 className="p-1.5 text-ink-4 hover:text-ink hover:bg-surface rounded transition"
                                 title="Editar"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                               </button>
                               <button
                                 onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                                 className="p-1.5 text-ink-4 hover:text-danger hover:bg-danger-subtle rounded transition"
                                 title="Eliminar"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                   <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                                 </svg>
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
          </div> {/* Cierre del contenedor con navegación por teclado */}

        {/* Empty State */}
        {productsWithPrices.length === 0 && (
          <div className="text-center py-10 md:py-14">
            <div className="w-14 h-14 mx-auto mb-4 bg-surface-raised rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-4">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-1 text-ink">Sin productos</h3>
            <p className="text-sm text-ink-3 mb-5">Agrega tu primer producto para comenzar</p>
            {isGerencia && (
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2 bg-profit hover:bg-profit-hover text-surface-overlay font-medium rounded-lg transition text-sm"
              >
                Agregar producto
              </button>
            )}
          </div>
        )}
      </div>

       {/* Form Modal */}
       <ProductForm
         isOpen={showForm}
         onClose={() => {
           setShowForm(false);
           setEditingProduct(null);
         }}
         productToEdit={editingProduct}
         onSave={() => {
           setShowForm(false);
           setEditingProduct(null);
         }}
       />

       {/* Delete Confirmation Modal */}
       <ConfirmationModal
         isOpen={productToDelete !== null}
         title="¿Eliminar producto?"
         message={`¿Estás seguro de que deseas eliminar "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
         confirmText="Eliminar"
         cancelText="Cancelar"
         onConfirm={async () => {
           if (productToDelete) {
             try {
               await removeProduct(productToDelete.id);
             } catch {
               alert('Error al eliminar el producto. Inténtalo de nuevo.');
             } finally {
               setProductToDelete(null);
             }
           }
         }}
         onCancel={() => setProductToDelete(null)}
       />
     </div>
   );
}
