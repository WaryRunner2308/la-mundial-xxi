import React from 'react';
import { useProductStore } from '@/store/productStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatAmountWithCurrency } from '@/utils/format';
import { X } from 'lucide-react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

interface ProviderProductsModalProps {
  providerId: number | null;
  onClose: () => void;
}

export function ProviderProductsModal({ providerId, onClose }: ProviderProductsModalProps) {
  const { products } = useProductStore();
  const rate = useCurrencyStore((state) => state.rate);

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

  // Navegación por teclado en tabla de productos (highlight visual, sin acción)
  const { highlightedIndex, setHighlightedIndex, handleKeyDown } = useKeyboardNavigation({
    items: productsWithPrices,
    onSelect: () => {}, // Solo lectura
    enabled: true,
  });

  if (!providerId) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop con desenfoque */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Productos del Proveedor
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {productsWithPrices.length} producto{productsWithPrices.length !== 1 ? 's' : ''} encontrado{productsWithPrices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            title="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">
          {productsWithPrices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg font-medium">No hay productos registrados</p>
              <p className="text-sm mt-2">Este proveedor aún no tiene productos asociados</p>
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
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Precio Final
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Margen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productsWithPrices.map((product, index) => {
                    const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                    const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                    const isHighlighted = highlightedIndex === index;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 transition-colors ${isHighlighted ? 'bg-blue-50' : ''}`}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.photoUrl ? (
                              <img src={product.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                                📷
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {rate > 0 ? (
                            <>
                              <div className="font-semibold text-gray-900">
                                {costBs.toFixed(2).toLocaleString()} Bs
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.costUSD.toFixed(2)} USD
                              </div>
                            </>
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {product.costUSD.toFixed(2)} USD
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {rate > 0 ? (
                            <>
                              <div className="font-bold text-lg text-blue-600">
                                {priceWithVATBs.toFixed(2).toLocaleString()} Bs
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.priceWithVATUSD.toFixed(2)} USD
                              </div>
                            </>
                          ) : (
                            <div className="font-bold text-lg text-blue-600">
                              {product.priceWithVATUSD.toFixed(2)} USD
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {product.profitPercentage}%
                          </span>
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
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
