import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatAmountWithCurrency } from '@/utils/format';
import { supabase } from '@/lib/supabase';

import { ProductsPage } from '@/features/products/ProductList';
import { MermaPage } from '@/features/merma/MermaPage';
import { useProductStore } from '@/store/productStore';
import { CalculatorPage } from '@/features/calculator/CalculatorPage';

type Currency = 'Bs' | 'USD';

function CalculatorPage({ onEditRate }: { onEditRate: () => void }) {
  const rate = useCurrencyStore((state) => state.rate);
  const [formData, setFormData] = useState<CalcFormData>({
    cost: '',
    currency: 'Bs',
    profitPercentage: '',
    aplicarIVA: false,
  });
  const [results, setResults] = useState<CalcResults | null>(null);

  const calculate = (data: CalcFormData) => {
    const cost = parseFloat(data.cost) || 0;
    const profit = parseFloat(data.profitPercentage) || 0;

    if (cost <= 0 || profit < 0 || profit >= 100) {
      setResults(null);
      return;
    }

    const divisor = 1 - (profit / 100);
    const priceBase = cost / divisor;
    const utility = priceBase - cost;
    const priceWithVAT = data.aplicarIVA ? priceBase * 1.16 : priceBase;

    let priceWithVATConverted = priceWithVAT;
    let utilityConverted = utility;

    if (rate > 0) {
      if (data.currency === 'Bs') {
        priceWithVATConverted = priceWithVAT / rate;
        utilityConverted = utility / rate;
      } else {
        priceWithVATConverted = priceWithVAT * rate;
        utilityConverted = utility * rate;
      }
    }

    setResults({
      priceWithVAT: Number(priceWithVAT.toFixed(2)),
      utility: Number(utility.toFixed(2)),
      currency: data.currency,
      priceWithVATConverted: Number(priceWithVATConverted.toFixed(2)),
      utilityConverted: Number(utilityConverted.toFixed(2)),
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    calculate(newData);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...formData, aplicarIVA: e.target.checked };
    setFormData(newData);
    calculate(newData);
  };

  useEffect(() => {
    calculate(formData);
  }, [rate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Calculadora de Precios</h1>
          <div className="flex items-center mt-1">
            <p className="text-sm md:text-base text-gray-500">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de Entrada */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Datos del Producto</h2>
          <div className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
                Costo *
              </label>
              <div className="flex">
                <input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={handleInputChange}
                  required
                  autoComplete="off"
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base md:text-lg"
                />
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-32 md:w-40 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm md:text-base font-medium cursor-pointer"
                >
                  <option value="Bs">Bs</option>
                  <option value="USD">$</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="profitPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                % Ganancia *
              </label>
              <input
                id="profitPercentage"
                name="profitPercentage"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={formData.profitPercentage}
                onChange={handleInputChange}
                required
                autoComplete="off"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base md:text-lg"
              />
            </div>

            <div className="flex items-center p-3 md:p-4 border border-gray-200 rounded-lg bg-gray-50">
              <input
                id="aplicarIVA"
                name="aplicarIVA"
                type="checkbox"
                checked={formData.aplicarIVA}
                onChange={handleCheckboxChange}
                className="w-4 h-4 md:w-5 md:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplicarIVA" className="ml-3 text-xs md:text-sm font-medium text-gray-700 cursor-pointer flex-1">
                Aplicar IVA (16%)
              </label>
            </div>
          </div>
        </div>

        {/* Panel de Resultados */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Resultados</h2>
          {results && rate > 0 ? (
            <div className="space-y-4">
              <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                <span className="block text-gray-600 mb-1 md:mb-2 text-sm md:text-lg">Precio Final</span>
                <span className="block font-bold text-2xl md:text-4xl text-blue-600 mb-1">
                  {formatAmountWithCurrency(results.priceWithVAT, results.currency)}
                </span>
                {rate > 0 && results.priceWithVATConverted !== undefined && (
                  <span className="block text-xs md:text-sm text-gray-500">
                    {formatAmountWithCurrency(results.priceWithVATConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
              <div className="p-4 md:p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-100">
                <span className="block text-gray-600 mb-1 md:mb-2 text-sm md:text-lg">Ganancia</span>
                <span className="block font-bold text-2xl md:text-4xl text-emerald-600 mb-1">
                  {formatAmountWithCurrency(results.utility, results.currency)}
                </span>
                {rate > 0 && results.utilityConverted !== undefined && (
                  <span className="block text-xs md:text-sm text-gray-500">
                    {formatAmountWithCurrency(results.utilityConverted, results.currency === 'Bs' ? 'USD' : 'Bs')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 md:h-64 text-gray-400">
              <div className="text-center">
                <div className="text-4xl md:text-5xl mb-3">🧮</div>
                <p className="text-sm md:text-base">Ingresa datos para ver resultados</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RateModal({ rate, setRate, onClose }: { rate: number; setRate: (rate: number) => void; onClose: () => void }) {
  const [inputValue, setInputValue] = useState(rate > 0 ? rate.toString() : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputValue);
    if (parsed > 0) {
      setRate(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">¡Bienvenido!</h2>
          <p className="text-gray-600 mt-2 text-sm md:text-base">¿Cuál es la tasa de cambio de hoy?</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">(1 USD = X Bs)</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Cambio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ej: 40.50"
              className="w-full px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base md:text-lg text-center"
              autoFocus
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg transition text-sm md:text-base"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}

interface CalcFormData {
  cost: string;
  currency: Currency;
  profitPercentage: string;
  aplicarIVA: boolean;
}

interface CalcResults {
  priceWithVAT: number;
  utility: number;
  currency: Currency;
  priceWithVATConverted?: number;
  utilityConverted?: number;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
            <p className="text-gray-600 mb-4">
              Ha ocurrido un error inesperado. Puedes intentar recargar la página.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              🔄 Reiniciar y Limpiar Datos
            </button>
            {this.state.error && (
              <p className="mt-4 text-xs text-gray-500 text-left">
                Error: {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { rate, setRate } = useCurrencyStore();
  const { loadFromSupabase } = useProductStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const location = useLocation();

  // Cerrar sidebar en móvil al cambiar ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (rate === 0) {
      setShowWelcome(true);
    }
  }, [rate]);

  useEffect(() => {
    // Verificar conexión a Supabase al iniciar
    supabase
      .from('products')
      .select('count')
      .limit(1)
      .then(({ error }) => {
        if (error) {
          console.error('🔴 Error de conexión a Supabase:', error);
          setSupabaseError('Error de conexión a la base de datos. Revisa consola F12.');
        } else {
          console.log('🟢 Conexión a Supabase OK');
          loadFromSupabase().catch(err => {
            console.error('🔴 Error cargando productos:', err);
            setSupabaseError('No se pudieron cargar los productos.');
          });
        }
      });
  }, [loadFromSupabase]);

  const handleRateSave = (newRate: number) => {
    setRate(newRate);
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <span className="ml-3 text-lg font-semibold text-gray-900">La Mundial</span>
        </div>

        {/* Overlay para móvil */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r shadow-sm flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header del Sidebar */}
          <div className="flex-shrink-0 flex items-center px-4 py-4 md:py-6 border-b">
            <span className="text-lg md:text-xl font-semibold text-gray-900">La Mundial</span>
          </div>

          {/* Navegación */}
          <nav className="px-2 md:px-4 py-2 flex-shrink-0 flex-1 overflow-y-auto">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md font-medium transition-colors duration-150 mb-1 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              Productos
            </NavLink>
            <NavLink
              to="/calculator"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md font-medium transition-colors duration-150 mb-1 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              Calculadora
            </NavLink>
            <NavLink
              to="/merma"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md font-medium transition-colors duration-150 mb-1 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              Merma
            </NavLink>
          </nav>

          {/* Logo centrado en el sidebar */}
          <div className="flex-grow flex items-center justify-center px-4 py-4 lg:py-8">
            <img
              src="/logo.png"
              alt="La Mundial XXI"
              className="w-full max-w-[200px] object-contain lg:hidden"
            />
            <img
              src="/logo.png"
              alt="La Mundial XXI"
              className="w-full max-w-[180px] object-contain hidden lg:block"
            />
          </div>

          {/* Espaciador inferior */}
          <div className="h-10 flex-shrink-0"></div>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto lg:pt-6 pt-16">
          {supabaseError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {supabaseError}
            </div>
          )}
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<ProductsPage onEditRate={() => setShowEditRate(true)} />} />
              <Route path="/products" element={<ProductsPage onEditRate={() => setShowEditRate(true)} />} />
              <Route path="/calculator" element={<CalculatorPage onEditRate={() => setShowEditRate(true)} />} />
              <Route path="/merma" element={<MermaPage />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Modales */}
        {showWelcome && (
          <RateModal
            rate={rate}
            setRate={handleRateSave}
            onClose={() => setShowWelcome(false)}
          />
        )}

        {showEditRate && (
          <RateModal
            rate={rate}
            setRate={handleRateSave}
            onClose={() => setShowEditRate(false)}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
