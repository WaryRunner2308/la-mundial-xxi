import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useProviderStore } from '../../store/providerStore';
import { ProductPriceComparison } from '../../types/provider';
import { SecureInput } from '../../components/ui/SecureInput';

export function ComparatorPage() {
  const { products } = useProductStore();
  const { providers } = useProviderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductPriceComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Generar un nombre aleatorio único para el input (cada vez que el componente se monta)
  const randomInputName = `search_input_${Math.random().toString(36).substring(7)}`;

  // Obtener productos únicos por nombre
  const uniqueProductNames = Array.from(new Set(products.map((p) => p.name))).sort();

  // Filtrar productos por búsqueda
  const filteredProducts = uniqueProductNames.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Resetear índice resaltado cuando cambia la búsqueda
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Manejo de teclado (flechas y Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          const selectedName = filteredProducts[highlightedIndex];
          setSearchTerm(selectedName);
          handleSelectProduct(selectedName);
          setHighlightedIndex(-1);
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

  // Al seleccionar un producto, agrupar por proveedor
  const handleSelectProduct = (productName: string) => {
    setLoading(true);
    setError(null);
    setHighlightedIndex(-1);

    try {
      const productVariants = products.filter((p) => p.name === productName);
      const comparison: ProductPriceComparison = {
        product: {
          id: 0,
          name: productName,
          category: '',
        },
        prices: productVariants
          .filter((p) => p.providerId !== undefined)
          .map((p) => {
            const provider = providers.find((prov) => prov.id === p.providerId);
            return {
              id: p.id,
              product_id: p.id,
              provider_id: p.providerId!,
              cost_usd: p.costUSD,
              profit_percentage: p.profitPercentage,
              exempt_from_vat: p.exemptFromVAT,
              photo_url: p.photoUrl,
              updated_at: p.updatedAt ?? undefined,
              provider_name: provider?.name || 'Desconocido',
            };
          })
          .sort((a, b) => a.cost_usd - b.cost_usd), // Ordenar por precio ascendente
      };

      setSelectedProduct(comparison);
    } catch (err: any) {
      console.error('Error al cargar comparación:', err);
      setError('Error al cargar datos del producto');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar resultados cuando el buscador esté vacío
  useEffect(() => {
    if (searchTerm === '') {
      setSelectedProduct(null);
      setError(null);
      setHighlightedIndex(-1);
    }
  }, [searchTerm]);

  // Encontrar precio mínimo
  const minPrice = selectedProduct?.prices.length
    ? Math.min(...selectedProduct.prices.map((p) => p.cost_usd))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Comparador de Precios
        </h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">
          Busca un producto y compara precios entre proveedores
        </p>
      </div>

       {/* Buscador */}
       <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
         <label htmlFor={randomInputName} className="block text-sm font-medium text-gray-700 mb-2">
           Buscar Producto
         </label>
         <div className="relative">
           <SecureInput
             id={randomInputName}
             value={searchTerm}
             onChange={setSearchTerm}
             onKeyDown={handleKeyDown}
             placeholder="Ej: Malta 1.5L"
             inputMode="search"
             editable
             displayClassName="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base pr-8"
           />
           {searchTerm && (
             <button
               type="button"
               onClick={() => {
                 setSearchTerm('');
                 setSelectedProduct(null);
               }}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
             >
               ✕
             </button>
           )}
         </div>

        {/* Sugerencias */}
        {searchTerm && filteredProducts.length > 0 && (
          <ul 
            className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white"
            onMouseLeave={() => setHighlightedIndex(-1)}
          >
            {filteredProducts.map((productName, index) => (
              <li
                key={productName}
                onClick={() => {
                  setSearchTerm(productName);
                  handleSelectProduct(productName);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {productName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resultados */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-500">Cargando comparación...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && selectedProduct && selectedProduct.prices.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            No hay precios registrados
          </h3>
          <p className="text-gray-600">
            Este producto no tiene precios asociados a proveedores. Agrega proveedores desde el formulario de productos.
          </p>
        </div>
      )}

      {!loading && selectedProduct && selectedProduct.prices.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
              Precios de: {selectedProduct.product.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedProduct.prices.length} proveedor(es) encontrado(s)
            </p>
          </div>

          <div className="overflow-x-auto -mx-4">
            <table className="w-full min-w-[300px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="h-12 px-4 text-left text-xs md:text-sm font-semibold text-gray-600">Proveedor</th>
                  <th className="h-12 px-4 text-right text-xs md:text-sm font-semibold text-gray-600">Precio USD</th>
                  <th className="h-12 px-4 text-right text-xs md:text-sm font-semibold text-gray-600">Margen</th>
                  <th className="h-12 px-4 text-center text-xs md:text-sm font-semibold text-gray-600">IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedProduct.prices.map((price) => {
                  const isCheapest = minPrice !== null && price.cost_usd === minPrice;
                  return (
                    <tr
                      key={price.id}
                      className={`hover:bg-gray-50 transition ${isCheapest ? 'bg-green-50' : ''}`}
                    >
                      <td className="p-4 align-middle">
                        <span className="text-sm md:text-base font-medium text-gray-900">
                          {price.provider_name}
                        </span>
                        {isCheapest && (
                          <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Más barato
                          </span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <span
                          className={`text-lg font-bold ${isCheapest ? 'text-green-600' : 'text-gray-900'}`}
                        >
                          ${price.cost_usd.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right text-gray-600 text-sm">
                        {price.profit_percentage}%
                      </td>
                      <td className="p-4 align-middle text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            price.exempt_from_vat
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {price.exempt_from_vat ? 'Exento' : 'Sí'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!searchTerm && !selectedProduct && !loading && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            Busca un producto para comparar
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Ingresa el nombre de un producto para ver los precios de todos los proveedores que lo ofrecen.
          </p>
        </div>
      )}
    </div>
  );
}
