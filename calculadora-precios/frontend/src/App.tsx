import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useCurrencyStore } from '@/store/currencyStore';
import { supabase } from '@/lib/supabase';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';
import { useAuth } from '@/contexts/AuthContext';

import { ProductsPage } from '@/features/products/ProductList';
import { MermaPage } from '@/features/merma/MermaPage';
import { useProductStore } from '@/store/productStore';
import { CalculatorPage } from '@/features/calculator/CalculatorPage';
import { ProvidersPage } from '@/features/providers/ProvidersPage';
import { ComparatorPage } from '@/features/comparator/ComparatorPage';
import { LandingPage } from '@/features/auth/LandingPage';

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

function RateModal({ rate, setRate, onClose }: { rate: number; setRate: (rate: number) => void; onClose: () => void }) {
  const [inputValue, setInputValue] = useState(rate > 0 ? rate.toString() : '');

  const handleSubmit = () => {
    const parsed = parseNumericInput(inputValue);
    if (parsed > 0) {
      setRate(parsed);
    }
    // Cerrar SIEMPRE para desbloquear la app
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={handleSubmit}>
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">¡Bienvenido!</h2>
          <p className="text-gray-600 mt-2 text-sm md:text-base">¿Cuál es la tasa de cambio de hoy?</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">(1 USD = X Bs)</p>
        </div>

        <div className="space-y-6">
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Tasa de Cambio</span>
            <SecureInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              placeholder="Ej: 40.50"
              inputMode="decimal"
              editable
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg transition text-sm md:text-base"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // ========== HOOKS AL INICIO (SIN CONDICIONALES) ==========
  const { rate, setRate } = useCurrencyStore();
  const { loadFromSupabase } = useProductStore();
  const { userRole, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const location = useLocation();

  const isGerencia = userRole === 'gerencia';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (rate === 0) {
      setShowWelcome(true);
    }
  }, [rate]);

  useEffect(() => {
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

  // ========== RENDERIZADO CONDICIONAL (SIN HOOKS DESPUÉS) ==========
  
  // Si no hay rol, mostrar Landing Page
  if (!userRole) {
    return <LandingPage />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile header */}
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Condicional según rol */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r shadow-sm flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex-shrink-0 flex items-center px-4 py-3 md:py-4 border-b">
          <span className="text-lg md:text-xl font-semibold text-gray-900">La Mundial</span>
        </div>

        <nav className="flex-shrink-0 px-2 md:px-3 py-2 space-y-0.5">
          {/* SIEMPRE visible: Productos */}
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-md font-medium transition-colors duration-150 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            Productos
          </NavLink>

          {/* SIEMPRE visible: Calculadora (para ambos roles) */}
          <NavLink
            to="/calculator"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-md font-medium transition-colors duration-150 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            Calculadora
          </NavLink>

          {/* SOLO GERENCIA: Proveedores, Comparador, Merma */}
          {isGerencia && (
            <>
              <NavLink
                to="/providers"
                className={({ isActive }) =>
                  `flex items-center px-3 py-1.5 rounded-md font-medium transition-colors duration-150 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                Proveedores
              </NavLink>
              <NavLink
                to="/comparator"
                className={({ isActive }) =>
                  `flex items-center px-3 py-1.5 rounded-md font-medium transition-colors duration-150 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                Comparador
              </NavLink>
              <NavLink
                to="/merma"
                className={({ isActive }) =>
                  `flex items-center px-3 py-1.5 rounded-md font-medium transition-colors duration-150 text-sm md:text-base ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                Merma
              </NavLink>
            </>
          )}
        </nav>

        {/* Logo centered - se mantiene fijo justo debajo del menú */}
        <div className="flex-shrink-0 px-4 py-4 lg:py-6">
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

        {/* Botón de Cerrar Sesión */}
        {userRole && (
          <div className="flex-shrink-0 px-4 py-3 border-t">
            <button
              onClick={logout}
              className="w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        )}

        <div className="flex-shrink-0 h-4"></div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto lg:pt-6 pt-16">
        {supabaseError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {supabaseError}
          </div>
        )}
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ProductsPage onEditRate={() => setShowEditRate(true)} userRole={userRole} />} />
            <Route path="/products" element={<ProductsPage onEditRate={() => setShowEditRate(true)} userRole={userRole} />} />
            {/* Calculadora disponible para TODOS los roles */}
            <Route path="/calculator" element={<CalculatorPage onEditRate={() => setShowEditRate(true)} />} />
            {isGerencia && (
              <>
                <Route path="/providers" element={<ProvidersPage />} />
                <Route path="/comparator" element={<ComparatorPage />} />
                <Route path="/merma" element={<MermaPage />} />
              </>
            )}
            <Route path="/unauthorized" element={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
                <p>No tienes permiso para esta sección.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/products" replace />} />
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
  );
}

export default App;
