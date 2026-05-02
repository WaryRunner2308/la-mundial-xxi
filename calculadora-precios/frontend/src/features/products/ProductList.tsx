import React from 'react';
import { useProductStore, Product } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useProviderStore } from '../../store/providerStore';
import { ProductForm } from './ProductForm';
import { formatAmountWithCurrency } from '../../utils/format';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

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

export function ProductsPage({ onEditRate }: { onEditRate: () => void }) {
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
  const [searchQuery, setSearchQuery] = React.useState(''); // ← BUSCADOR

  // Filtrar productos por proveedor (si hay) y por búsqueda de texto
  const filteredProducts = products
    .filter(p => {
      // Filtro por proveedor
      const matchesProvider = providerFilterId
        ? p.providerId?.toString() === providerFilterId
        : true;
      // Filtro por texto de búsqueda
      const matchesSearch = searchQuery
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesProvider && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // ← ORDEN ALFABÉTICO

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Gestión de Productos</h1>
          <div className="flex items-center mt-1">
            <p className="text-sm md:text-base text-gray-500">
              {rate > 0 ? `Tasa: 1 USD = ${rate.toFixed(2)} Bs` : '⚠️ Tasa no configurada'}
            </p>
            {rate > 0 && (
              <button
                onClick={onEditRate}
                className="ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
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
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition text-sm md:text-base w-full md:w-auto"
        >
          + Agregar Producto
        </button>
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
              <div className="text-5xl md:text-6xl font-black text-blue-600 leading-none">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Header con controles */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Lista de Productos
              <span className="text-xs md:text-sm font-normal text-gray-500 ml-2">
                ({filteredProducts.length} de {products.length})
              </span>
            </h2>
            {currentProvider && (
              <button
                onClick={() => navigate('/products')}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Limpiar Filtro
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
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="h-12 px-4 md:px-6 text-left text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Foto</th>
                    <th className="h-12 px-4 md:px-6 text-left text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Nombre</th>
                    <th className="h-12 px-4 md:px-6 text-center text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Moneda</th>
                    <th className="h-12 px-4 md:px-6 text-right text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Costo</th>
                    <th className="h-12 px-4 md:px-6 text-right text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Precio Final</th>
                    <th className="h-12 px-4 md:px-6 text-right text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Ganancia</th>
                    <th className="h-12 px-4 md:px-6 text-center text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Margen</th>
                    <th className="h-12 px-4 md:px-6 text-center text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">IVA</th>
                    <th className="h-12 px-4 md:px-6 text-center text-xs md:text-sm font-semibold text-gray-600 align-middle whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productsWithPrices.map((product, index) => {
                    const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                    const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                    const utilityBs = rate > 0 ? product.utilityUSD * rate : product.utilityUSD;
                    const isHighlighted = highlightedIndex === index;

                    return (
                    <tr
                      key={product.id}
                      className={`
                        hover:bg-gray-50 transition
                        ${isHighlighted ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                      `}
                      role="row"
                      aria-selected={isHighlighted}
                    >
                    <td className="p-3 md:p-6 align-middle">
                      {product.photoUrl ? (
                        <img src={product.photoUrl} className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg" alt="" />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                          📷
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-6 align-middle font-medium text-gray-900 text-sm md:text-base">
                      {product.name}
                    </td>
                    <td className="p-3 md:p-6 align-middle text-center">
                      <span className="inline-flex px-2 py-0.5 md:px-2 md:py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {product.originalCurrency}
                      </span>
                    </td>
                    <td className="p-3 md:p-6 align-middle text-right">
                      {rate > 0 ? (
                        <>
                          <div className="font-bold text-sm md:text-base text-gray-900">
                            {costBs.toFixed(2).toLocaleString()} Bs
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {product.costUSD.toFixed(2)} USD
                          </div>
                        </>
                      ) : (
                        <div className="font-bold text-sm md:text-base text-gray-900">
                          {product.costUSD.toFixed(2)} USD
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-6 align-middle text-right">
                      {rate > 0 ? (
                        <>
                          <div className="font-bold text-lg md:text-2xl text-gray-900">
                            {priceWithVATBs.toFixed(2).toLocaleString()} Bs
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {product.priceWithVATUSD.toFixed(2)} USD
                          </div>
                        </>
                      ) : (
                        <div className="font-bold text-lg md:text-2xl text-gray-900">
                          {product.priceWithVATUSD.toFixed(2)} USD
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-6 align-middle text-right">
                      {rate > 0 ? (
                        <>
                          <div className="font-bold text-lg md:text-2xl text-green-600">
                            {utilityBs.toFixed(2).toLocaleString()} Bs
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {product.utilityUSD.toFixed(2)} USD
                          </div>
                        </>
                      ) : (
                        <div className="font-bold text-lg md:text-2xl text-green-600">
                          {product.utilityUSD.toFixed(2)} USD
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-6 align-middle text-center text-gray-600 text-sm">
                      {product.profitPercentage}%
                    </td>
                    <td className="p-3 md:p-6 align-middle text-center">
                      <span className={`inline-flex px-1.5 md:px-2 py-0.5 text-xs font-semibold rounded-full ${product.exemptFromVAT ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {product.exemptFromVAT ? 'Exento' : 'Sí'}
                      </span>
                    </td>
                    <td className="p-3 md:p-6 align-middle space-x-1 md:space-x-2">
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
                          className="px-2 md:px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition"
                          title="Editar"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                       <button
                         onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                         className="px-2 md:px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                         title="Eliminar"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                           <path d="M3 6h18"/>
                           <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                           <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                           <line x1="10" x2="10" y1="11" y2="17"/>
                           <line x1="14" x2="14" y1="11" y2="17"/>
                         </svg>
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </div> {/* Cierre del contenedor con navegación por teclado */}

        {/* Empty State */}
        {productsWithPrices.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <div className="w-16 md:w-24 h-16 md:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-3xl md:text-4xl">📦</span>
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">No hay productos</h3>
            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">Agrega tu primer producto para comenzar</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm md:text-base"
            >
              Agregar Primer Producto
            </button>
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
         onConfirm={() => {
           if (productToDelete) {
             removeProduct(productToDelete.id);
             setProductToDelete(null);
           }
         }}
         onCancel={() => setProductToDelete(null)}
       />
     </div>
   );
}
