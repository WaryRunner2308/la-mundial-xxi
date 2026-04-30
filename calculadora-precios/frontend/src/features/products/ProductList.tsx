import React from 'react';
import { useProductStore } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { ProductForm } from './ProductForm';
import { formatAmountWithCurrency } from '../../utils/format';

type Currency = 'Bs' | 'USD';

interface ProductWithDynamicPrices {
  id: number;
  name: string;
  costUSD: number;
  originalCurrency: Currency;
  profitPercentage: number;
  exemptFromVAT: boolean;
  photoUrl: string;
  // Cálculos en tiempo real según tasa
  priceWithVATUSD: number;
  utilityUSD: number;
}

function useProductsWithDynamicPrices(products: ReturnType<typeof useProductStore>['products']) {
  const rate = useCurrencyStore((state) => state.rate);

  return React.useMemo(() => {
    return products.map(product => {
      // Calcular precios base en USD
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

  const productsWithPrices = useProductsWithDynamicPrices(products);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestión de Productos</h1>
          <div className="flex items-center mt-1">
            <p className="text-gray-500">
              {rate > 0 ? `Tasa: 1 USD = ${rate.toFixed(2)} Bs` : '⚠️ Tasa de cambio no configurada'}
            </p>
            {rate > 0 && (
              <button
                onClick={onEditRate}
                className="ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                title="Editar tasa de cambio"
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
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition"
        >
          + Agregar Producto
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-gray-200 p-8 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo/Branding */}
            <div className="flex-1 flex items-center justify-center md:justify-start">
              <div className="flex items-baseline">
                <h2 className="text-4xl md:text-6xl font-black italic tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                    }}>
                  LA MUNDIAL
                </h2>
                <span className="text-2xl md:text-3xl font-bold italic text-gray-700 ml-2">XXI</span>
              </div>
            </div>

            {/* Contador de Productos */}
            <div className="flex flex-col items-center md:items-end">
              <div className="text-6xl md:text-7xl font-black text-blue-600 leading-none">
                {products.length}
              </div>
              <p className="text-sm md:text-base font-semibold text-gray-600 mt-2 uppercase tracking-widest">
                Productos
              </p>
            </div>
          </div>

          {/* Línea decorativa */}
          <div className="mt-6 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full"></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Lista de Productos
            <span className="text-sm font-normal text-gray-500 ml-2">({products.length} productos)</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          {productsWithPrices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">No hay productos</h3>
              <p className="text-gray-500 mb-6">Agrega tu primer producto para comenzar</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Agregar Primer Producto
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Foto</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Nombre</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Moneda</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Costo</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Precio Final</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Ganancia</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Margen</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">IVA</th>
                  <th className="h-12 px-6 text-left text-sm font-semibold text-gray-600 align-middle">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productsWithPrices.map((product) => {
                  // Calcular valores en Bs (principal) y USD (secundario) según tasa actual
                  const costBs = rate > 0 ? product.costUSD * rate : product.costUSD;
                  const priceWithVATBs = rate > 0 ? product.priceWithVATUSD * rate : product.priceWithVATUSD;
                  const utilityBs = rate > 0 ? product.utilityUSD * rate : product.utilityUSD;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="p-6 align-middle">
                        {product.photoUrl ? (
                          <img src={product.photoUrl} className="w-12 h-12 object-cover rounded-lg" alt="" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                            Sin foto
                          </div>
                        )}
                      </td>
                      <td className="p-6 align-middle font-medium text-gray-900">{product.name}</td>
                      <td className="p-6 align-middle text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {product.originalCurrency}
                        </span>
                      </td>
                      <td className="p-6 align-middle">
                        {rate > 0 ? (
                          <>
                            <div className="font-bold text-lg text-gray-900">
                              {costBs.toFixed(2).toLocaleString()} Bs
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.costUSD.toFixed(2).toLocaleString()} USD
                            </div>
                          </>
                        ) : (
                          <div className="font-bold text-lg text-gray-900">
                            {product.costUSD.toFixed(2).toLocaleString()} USD
                          </div>
                        )}
                      </td>
                      <td className="p-6 align-middle">
                        {rate > 0 ? (
                          <>
                            <div className="font-bold text-2xl text-gray-900">
                              {priceWithVATBs.toFixed(2).toLocaleString()} Bs
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.priceWithVATUSD.toFixed(2).toLocaleString()} USD
                            </div>
                          </>
                        ) : (
                          <div className="font-bold text-2xl text-gray-900">
                            {product.priceWithVATUSD.toFixed(2).toLocaleString()} USD
                          </div>
                        )}
                      </td>
                      <td className="p-6 align-middle">
                        {rate > 0 ? (
                          <>
                            <div className="font-bold text-2xl text-green-600">
                              {utilityBs.toFixed(2).toLocaleString()} Bs
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.utilityUSD.toFixed(2).toLocaleString()} USD
                            </div>
                          </>
                        ) : (
                          <div className="font-bold text-2xl text-green-600">
                            {product.utilityUSD.toFixed(2).toLocaleString()} USD
                          </div>
                        )}
                      </td>
                      <td className="p-6 align-middle text-gray-600">{product.profitPercentage}%</td>
                      <td className="p-6 align-middle text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.exemptFromVAT ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {product.exemptFromVAT ? 'Exento' : 'Sí'}
                        </span>
                      </td>
                      <td className="p-6 align-middle space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct({
                              id: product.id,
                              name: product.name,
                              cost: product.costUSD * (rate > 0 ? rate : 1), // estimar en Bs para el formulario
                              currency: product.originalCurrency,
                              profitPercentage: product.profitPercentage,
                              exemptFromVAT: product.exemptFromVAT,
                              photoUrl: product.photoUrl,
                            });
                            setShowForm(true);
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
    </div>
  );
}
