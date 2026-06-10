import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyStore } from '@/store/currencyStore';
import { supabase } from '@/lib/supabase';
import { parseNumericInput } from '@/utils/validateDecimal';
import { SecureInput } from '@/components/ui/SecureInput';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package, Calculator, Truck, BarChart2, TrendingDown,
  LogOut, Menu, X, ChevronLeft, ChevronRight, DollarSign,
} from 'lucide-react';

import { ProductsPage } from '@/features/products/ProductList';
import { MermaPage } from '@/features/merma/MermaPage';
import { useProductStore } from '@/store/productStore';
import { CalculatorPage } from '@/features/calculator/CalculatorPage';
import { ProvidersPage } from '@/features/providers/ProvidersPage';
import { ComparatorPage } from '@/features/comparator/ComparatorPage';
import { LandingPage } from '@/features/auth/LandingPage';

/* ─── Error Boundary ─── */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
          <div
            className="max-w-md p-8 rounded-2xl text-center"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)' }}>
              ⚠️
            </div>
            <h2 className="text-2xl font-black text-[#e6edf3] mb-2 uppercase tracking-widest"
              style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              ALGO SALIÓ MAL
            </h2>
            <p className="text-[#8b949e] mb-6 text-sm">Error inesperado. Intenta recargar.</p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="px-6 py-2.5 text-white rounded-xl font-bold transition text-sm"
              style={{ background: 'linear-gradient(135deg,#C8102E,#a00d25)', boxShadow: '0 4px 16px rgba(200,16,46,0.3)' }}
            >
              Reiniciar
            </button>
            {this.state.error && (
              <p className="mt-4 text-xs text-[#484f58] text-left font-mono">{this.state.error.message}</p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Rate Modal ─── */
function RateModal({ rate, setRate, onClose }: { rate: number; setRate: (r: number) => void; onClose: () => void }) {
  const [inputValue, setInputValue] = useState(rate > 0 ? rate.toString() : '');

  const handleSubmit = () => {
    const parsed = parseNumericInput(inputValue);
    if (parsed > 0) setRate(parsed);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[100] p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={handleSubmit}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="max-w-md w-full rounded-2xl p-6 md:p-8"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.2)' }}>
            <DollarSign className="text-[#009A3A]" size={22} />
          </div>
          <h2 className="text-2xl font-black text-[#e6edf3] uppercase tracking-widest"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
            ¡BIENVENIDO!
          </h2>
          <p className="text-[#8b949e] mt-2 text-sm">¿Cuál es la tasa de cambio de hoy?</p>
          <p className="text-xs text-[#484f58] mt-1">1 USD = X Bs</p>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
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
              displayClassName="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 font-bold rounded-xl text-white transition"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              letterSpacing: '0.08em',
              fontSize: '1.05rem',
              background: 'linear-gradient(135deg,#009A3A,#007b2e)',
              boxShadow: '0 4px 20px rgba(0,154,58,0.35)',
            }}
          >
            CONTINUAR
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Nav items ─── */
const NAV_ITEMS = [
  { path: '/products',   icon: Package,     label: 'Productos',   managerOnly: false },
  { path: '/calculator', icon: Calculator,  label: 'Calculadora', managerOnly: false },
  { path: '/providers',  icon: Truck,       label: 'Proveedores', managerOnly: true  },
  { path: '/comparator', icon: BarChart2,   label: 'Comparador',  managerOnly: true  },
  { path: '/merma',      icon: TrendingDown,label: 'Merma',       managerOnly: true  },
];

/* ─── App ─── */
function App() {
  const { rate, setRate } = useCurrencyStore();
  const { loadFromSupabase } = useProductStore();
  const { userRole, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const location = useLocation();

  const isGerencia = userRole === 'gerencia';

  useEffect(() => { setSidebarOpen(false); }, [location]);
  useEffect(() => { if (rate === 0) setShowWelcome(true); }, [rate]);

  useEffect(() => {
    supabase.from('products').select('count').limit(1).then(({ error }) => {
      if (error) {
        console.error('🔴 Supabase:', error);
        setSupabaseError('Error de conexión a la base de datos.');
      } else {
        console.log('🟢 Supabase OK');
        loadFromSupabase().catch(() => setSupabaseError('No se pudieron cargar los productos.'));
      }
    });
  }, [loadFromSupabase]);

  if (!userRole) return <LandingPage />;

  const visibleNav = NAV_ITEMS.filter(item => !item.managerOnly || isGerencia);

  return (
    <div className="flex min-h-screen bg-[#0d1117] overflow-x-hidden">

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center"
        style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="absolute bottom-0 left-0 right-0 flex h-[2px]">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition"
          style={{ background: sidebarOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="ml-3 font-black text-[#e6edf3] uppercase tracking-widest"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}>
          La <span className="text-[#009A3A]">Mundial</span>
        </span>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Sidebar ─── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-16' : 'lg:w-[220px]'}
          w-[220px]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#161b22',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top gradient strip */}
        <div className="flex-shrink-0 flex h-[3px]">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>

        {/* Logo + collapse toggle */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-4 gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <img src="/logo.png" alt="La Mundial" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className={`min-w-0 transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              <div className="font-black text-[#e6edf3] uppercase leading-none tracking-widest truncate"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem' }}>
                La <span className="text-[#009A3A]">Mundial</span>
              </div>
              <div className="text-[#484f58] uppercase tracking-widest font-semibold truncate" style={{ fontSize: '8px' }}>
                Gestión de Precios
              </div>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex flex-shrink-0 p-1.5 rounded-lg text-[#484f58] hover:text-[#009A3A] transition"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-shrink-0 px-2 py-3 space-y-0.5">
          {visibleNav.map((item, i) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/products' && location.pathname === '/');
            return (
              <NavLink key={item.path} to={item.path} className="block">
                <div
                  className={`
                    nav-btn animate-fade-left relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                    transition-colors duration-150
                    ${collapsed ? 'lg:justify-center' : ''}
                    ${isActive ? 'text-[#009A3A]' : 'text-[#8b949e] hover:text-[#e6edf3]'}
                  `}
                  style={{ animationDelay: `${i * 0.06}s` }}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active background pill — shared layout animation */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg,rgba(0,154,58,0.14) 0%,rgba(0,154,58,0.05) 100%)',
                        border: '1px solid rgba(0,154,58,0.2)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <span
                    className="nav-icon relative z-10 flex-shrink-0"
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(0,154,58,0.6))' } : {}}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </span>

                  <span className={`nav-text text-sm font-semibold relative z-10 transition-all duration-300 overflow-hidden ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
                    {item.label}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Mascot */}
        <div
          className={`flex-1 flex items-center justify-center px-4 relative overflow-hidden transition-opacity duration-300 ${collapsed ? 'lg:opacity-0' : 'opacity-100'}`}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 55%, rgba(0,154,58,0.07) 0%, transparent 70%)' }} />
          <img
            src="/logo.png"
            alt="La Mundial"
            className="mascot-animate w-32 object-contain hidden lg:block select-none relative z-10"
            style={{ opacity: 0.75 }}
          />
        </div>

        {/* Bottom: rate + role + logout */}
        <div className="flex-shrink-0 px-2 py-3 space-y-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {rate > 0 && (
            <button
              onClick={() => setShowEditRate(true)}
              className={`w-full flex items-center px-3 py-2 rounded-xl transition group ${collapsed ? 'lg:justify-center' : 'justify-between'}`}
              style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}
              title={collapsed ? `${rate.toFixed(2)} Bs/USD` : undefined}
            >
              {collapsed ? (
                <DollarSign size={14} className="text-[#009A3A] lg:mx-auto" />
              ) : (
                <>
                  <span className="text-[#484f58] uppercase tracking-wider font-semibold" style={{ fontSize: '8px' }}>USD / Bs</span>
                  <span className="font-bold text-[#009A3A] group-hover:text-[#1ebb60] transition"
                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.68rem' }}>
                    {rate.toFixed(2)}
                  </span>
                </>
              )}
            </button>
          )}

          {!collapsed && userRole && (
            <div className="flex justify-center px-3 py-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isGerencia
                  ? 'text-[#009A3A] border border-[#009A3A]/20'
                  : 'text-[#8b949e] border border-white/10'
              }`} style={{ background: isGerencia ? 'rgba(0,154,58,0.08)' : 'rgba(255,255,255,0.04)' }}>
                <span className={`w-1.5 h-1.5 rounded-full ${isGerencia ? 'bg-[#009A3A]' : 'bg-[#484f58]'}`} />
                {isGerencia ? 'Gerencia' : 'Invitado'}
              </span>
            </div>
          )}

          {userRole && (
            <button
              onClick={logout}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${collapsed ? 'lg:justify-center' : 'justify-center'} text-[#C8102E]/40 hover:text-[#C8102E] hover:bg-[#C8102E]/8`}
              title={collapsed ? 'Cerrar Sesión' : undefined}
            >
              <LogOut size={13} />
              <span className={`${collapsed ? 'lg:hidden' : ''}`}>Cerrar Sesión</span>
            </button>
          )}
        </div>
        <div className="flex-shrink-0 h-1" />
      </aside>

      {/* ─── Main ─── */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto bg-[#0d1117] lg:pt-6 pt-16">
        {supabaseError && (
          <div className="mb-4 p-4 rounded-xl text-sm text-[#C8102E]"
            style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
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
                <Route path="/providers"  element={<ProvidersPage />} />
                <Route path="/comparator" element={<ComparatorPage />} />
                <Route path="/merma"      element={<MermaPage />} />
              </>
            )}
            <Route path="/unauthorized" element={
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-black text-[#C8102E]"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                  ACCESO DENEGADO
                </h2>
                <p className="text-[#8b949e] mt-2">No tienes permiso para esta sección.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showWelcome && (
          <RateModal key="welcome" rate={rate} setRate={setRate} onClose={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEditRate && (
          <RateModal key="edit" rate={rate} setRate={setRate} onClose={() => setShowEditRate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
