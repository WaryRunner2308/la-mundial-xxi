import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useCurrencyStore } from '@/store/currencyStore';
import { supabase } from '@/lib/supabase';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Calculator, Truck, BarChart2, TrendingDown, LogOut, Menu, X } from 'lucide-react';

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
        <div className="flex items-center justify-center min-h-screen bg-[#070e0b]">
          <div className="max-w-md p-8 bg-[#0d1612] border border-[#1a2e22] rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#C8102E]/10 border border-[#C8102E]/20 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <h2 className="text-2xl font-black text-[#e8f0eb] mb-2" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em' }}>
              ALGO SALIÓ MAL
            </h2>
            <p className="text-[#8aad95] mb-6 text-sm">
              Ha ocurrido un error inesperado. Puedes intentar recargar la página.
            </p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#a00d25] text-white rounded-xl font-bold transition text-sm"
            >
              Reiniciar y Limpiar Datos
            </button>
            {this.state.error && (
              <p className="mt-4 text-xs text-[#4d6b58] text-left font-mono">
                {this.state.error.message}
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
    if (parsed > 0) setRate(parsed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      onClick={handleSubmit}
    >
      <div
        className="bg-[#0d1612] border border-[#1a2e22] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Portugal flag strip */}
        <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
          <div className="bg-[#009A3A]" style={{ flex: 2 }} />
          <div className="bg-[#C8102E]" style={{ flex: 3 }} />
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#009A3A]/10 border border-[#009A3A]/20 flex items-center justify-center text-2xl">
            💱
          </div>
          <h2
            className="text-2xl font-black text-[#e8f0eb]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}
          >
            ¡BIENVENIDO!
          </h2>
          <p className="text-[#8aad95] mt-2 text-sm">¿Cuál es la tasa de cambio de hoy?</p>
          <p className="text-xs text-[#4d6b58] mt-1">1 USD = X Bs</p>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-[#8aad95] mb-2 uppercase tracking-wider">
              Tasa de Cambio
            </span>
            <SecureInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              placeholder="Ej: 40.50"
              inputMode="decimal"
              editable
              noRing
              displayClassName="!bg-[#112016] !border-[#1a2e22] !text-[#e8f0eb] !rounded-xl"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 bg-[#009A3A] hover:bg-[#007b2e] text-white font-bold rounded-xl shadow-lg transition text-base"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em', fontSize: '1.05rem' }}
          >
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { rate, setRate } = useCurrencyStore();
  const { loadFromSupabase } = useProductStore();
  const { userRole, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const location = useLocation();

  const isGerencia = userRole === 'gerencia';

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    if (rate === 0) setShowWelcome(true);
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

  const handleRateSave = (newRate: number) => setRate(newRate);

  if (!userRole) return <LandingPage />;

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-150 text-sm border ${
      isActive
        ? 'bg-[#009A3A]/12 text-[#009A3A] border-[#009A3A]/25'
        : 'text-[#4d6b58] hover:bg-[#0d1612] hover:text-[#c8e0d0] border-transparent'
    }`;

  return (
    <div className="flex min-h-screen bg-[#070e0b] overflow-x-hidden">

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#070e0b] border-b border-[#1a2e22] px-4 py-3 flex items-center">
        {/* Portugal flag strip */}
        <div className="absolute bottom-0 left-0 right-0 flex h-[2px]">
          <div className="bg-[#009A3A]" style={{ flex: 2 }} />
          <div className="bg-[#C8102E]" style={{ flex: 3 }} />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-[#4d6b58] hover:text-[#e8f0eb] hover:bg-[#0d1612] transition"
          aria-label="Abrir menú"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span
          className="ml-3 font-black text-[#e8f0eb] tracking-widest"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.2rem', letterSpacing: '0.12em' }}
        >
          LA MUNDIAL
        </span>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#070e0b] border-r border-[#1a2e22] flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Portugal Flag Strip */}
        <div className="flex flex-shrink-0 h-[3px]">
          <div className="bg-[#009A3A]" style={{ flex: 2 }} />
          <div className="bg-[#C8102E]" style={{ flex: 3 }} />
        </div>

        {/* Logo Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 border-b border-[#1a2e22]">
          <img
            src="/logo.png"
            alt="La Mundial"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <div>
            <div
              className="text-[#e8f0eb] font-black uppercase leading-none tracking-widest"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.05rem' }}
            >
              La Mundial
            </div>
            <div className="text-[#4d6b58] uppercase tracking-widest font-semibold" style={{ fontSize: '9px' }}>
              Gestión de Precios
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-shrink-0 px-3 py-3 space-y-1">
          <NavLink
            to="/products"
            className={({ isActive }) => `animate-fade-left ${navLinkClass(isActive)}`}
          >
            <Package size={15} strokeWidth={2.5} />
            <span>Productos</span>
          </NavLink>

          <NavLink
            to="/calculator"
            className={({ isActive }) => `animate-fade-left-1 ${navLinkClass(isActive)}`}
          >
            <Calculator size={15} strokeWidth={2.5} />
            <span>Calculadora</span>
          </NavLink>

          {isGerencia && (
            <>
              <NavLink
                to="/providers"
                className={({ isActive }) => `animate-fade-left-2 ${navLinkClass(isActive)}`}
              >
                <Truck size={15} strokeWidth={2.5} />
                <span>Proveedores</span>
              </NavLink>
              <NavLink
                to="/comparator"
                className={({ isActive }) => `animate-fade-left-3 ${navLinkClass(isActive)}`}
              >
                <BarChart2 size={15} strokeWidth={2.5} />
                <span>Comparador</span>
              </NavLink>
              <NavLink
                to="/merma"
                className={({ isActive }) => `animate-fade-left-4 ${navLinkClass(isActive)}`}
              >
                <TrendingDown size={15} strokeWidth={2.5} />
                <span>Merma</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Logo watermark */}
        <div className="flex-1 flex items-center justify-center px-6">
          <img
            src="/logo.png"
            alt=""
            className="w-28 object-contain hidden lg:block select-none pointer-events-none"
            style={{ opacity: 0.04 }}
          />
        </div>

        {/* Rate display + Logout */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-[#1a2e22] space-y-2">
          {rate > 0 && (
            <button
              onClick={() => setShowEditRate(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#0d1612] border border-[#1a2e22] hover:border-[#009A3A]/30 transition group"
            >
              <span className="text-[#4d6b58] uppercase tracking-wider font-semibold" style={{ fontSize: '9px' }}>
                USD / Bs
              </span>
              <span
                className="font-bold text-[#009A3A] group-hover:text-[#00c44b] transition"
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}
              >
                {rate.toFixed(2)}
              </span>
            </button>
          )}

          {userRole && (
            <button
              onClick={logout}
              className="w-full px-3 py-2 text-sm font-semibold text-[#C8102E]/50 hover:bg-[#C8102E]/10 hover:text-[#C8102E] rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={13} />
              Cerrar Sesión
            </button>
          )}
        </div>

        <div className="flex-shrink-0 h-3" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#070e0b] lg:pt-6 pt-16">
        {supabaseError && (
          <div className="mb-4 p-4 bg-[#C8102E]/10 border border-[#C8102E]/25 rounded-xl text-[#e05070] text-sm">
            ⚠️ {supabaseError}
          </div>
        )}
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ProductsPage onEditRate={() => setShowEditRate(true)} userRole={userRole} />} />
            <Route path="/products" element={<ProductsPage onEditRate={() => setShowEditRate(true)} userRole={userRole} />} />
            <Route path="/calculator" element={<CalculatorPage onEditRate={() => setShowEditRate(true)} />} />
            {isGerencia && (
              <>
                <Route path="/providers" element={<ProvidersPage />} />
                <Route path="/comparator" element={<ComparatorPage />} />
                <Route path="/merma" element={<MermaPage />} />
              </>
            )}
            <Route path="/unauthorized" element={
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-black text-[#C8102E]" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                  ACCESO DENEGADO
                </h2>
                <p className="text-[#8aad95] mt-2">No tienes permiso para esta sección.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Modals */}
      {showWelcome && (
        <RateModal rate={rate} setRate={handleRateSave} onClose={() => setShowWelcome(false)} />
      )}
      {showEditRate && (
        <RateModal rate={rate} setRate={handleRateSave} onClose={() => setShowEditRate(false)} />
      )}
    </div>
  );
}

export default App;
