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
  Menu, X, DollarSign, ScanLine,
} from 'lucide-react';

import { ProductsPage } from '@/features/products/ProductList';
import { MermaPage } from '@/features/merma/MermaPage';
import { useProductStore } from '@/store/productStore';
import { CalculatorPage } from '@/features/calculator/CalculatorPage';
import { ProvidersPage } from '@/features/providers/ProvidersPage';
import { ComparatorPage } from '@/features/comparator/ComparatorPage';
import { LandingPage } from '@/features/auth/LandingPage';
import { InvoicePage } from '@/features/invoice/InvoicePage';

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
function RateModal({ rate, setRate, onClose, mandatory = false }: {
  rate: number;
  setRate: (r: number) => void;
  onClose: () => void;
  mandatory?: boolean;
}) {
  const [inputValue, setInputValue] = useState(rate > 0 ? rate.toString() : '');
  const [rateError, setRateError] = useState('');

  const handleSubmit = () => {
    const parsed = parseNumericInput(inputValue);
    if (parsed > 0) {
      setRate(parsed);
      onClose();
      return;
    }
    // Obligatorio: sin tasa válida no se cierra ni se puede usar la app
    if (mandatory) {
      setRateError('Debes ingresar la tasa del día para continuar.');
      return;
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[100] p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={mandatory ? undefined : handleSubmit}
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
              onChange={(v) => { setInputValue(v); setRateError(''); }}
              onSubmit={handleSubmit}
              placeholder="Ej: 40.50"
              inputMode="decimal"
              editable
              noRing
              displayClassName="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
            />
          </div>
          {rateError && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2 text-[#C8102E]"
              style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
              <span>⚠️</span> {rateError}
            </div>
          )}
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
  { path: '/products',        icon: Package,     label: 'Productos',      managerOnly: false },
  { path: '/calculator',      icon: Calculator,  label: 'Calculadora',    managerOnly: false },
  { path: '/providers',       icon: Truck,       label: 'Proveedores',    managerOnly: true  },
  { path: '/comparator',      icon: BarChart2,   label: 'Comparador',     managerOnly: true  },
  { path: '/merma',           icon: TrendingDown,label: 'Merma',          managerOnly: true  },
  { path: '/import-invoice',  icon: ScanLine,    label: 'Import. Factura',managerOnly: true  },
];

/* ─── App ─── */
function App() {
  const { rate, setRate } = useCurrencyStore();
  const { loadFromSupabase } = useProductStore();
  const { userRole } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const location = useLocation();

  const isGerencia = userRole === 'gerencia';

  useEffect(() => { setSidebarOpen(false); }, [location]);
  // La tasa del día es obligatoria: el aviso sale SIEMPRE al entrar a un modo
  // (invitado o gerencia) y no se puede cerrar sin ingresar una tasa válida.
  useEffect(() => { if (userRole) setShowWelcome(true); }, [userRole]);
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
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          w-[200px] flex-shrink-0 self-start
          rounded-r-2xl lg:rounded-none overflow-hidden
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#161b22',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Portugal flag strip */}
        <div className="flex h-[2px]">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>

        {/* Logo — solo texto, sin imagen */}
        <div
          className="flex items-center px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="min-w-0">
            <div
              className="font-black text-[#e6edf3] uppercase leading-none"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', letterSpacing: '0.08em' }}
            >
              La <span className="text-[#009A3A]">Mundial</span>
            </div>
            <div className="text-[#484f58] uppercase tracking-[0.15em] font-semibold mt-0.5" style={{ fontSize: '7px' }}>
              Gestión de Precios
            </div>
          </div>
        </div>

        {/* Nav group */}
        <div className="px-3 pt-4 pb-2">
          <p className="text-[9px] font-black text-[#484f58] uppercase tracking-[0.16em] mb-2 px-2">Menú</p>
          <nav className="space-y-0.5">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/products' && location.pathname === '/');
              return (
                <NavLink key={item.path} to={item.path} className="block">
                  <div
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 group"
                    style={{ color: isActive ? '#009A3A' : '#8b949e' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg,rgba(0,154,58,0.13) 0%,rgba(0,154,58,0.04) 100%)',
                          borderTop: '1px solid rgba(0,154,58,0.18)',
                          borderRight: '1px solid rgba(0,154,58,0.1)',
                          borderBottom: '1px solid rgba(0,154,58,0.1)',
                          borderLeft: '2px solid #009A3A',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {!isActive && (
                      <span
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      />
                    )}
                    <span
                      className="relative z-10 flex-shrink-0"
                      style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(0,154,58,0.55))' } : {}}
                    >
                      <Icon size={15} strokeWidth={2.2} />
                    </span>
                    <span
                      className="relative z-10 font-semibold flex-1 truncate"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontSize: '0.9rem',
                        letterSpacing: '0.05em',
                        color: isActive ? '#009A3A' : 'inherit',
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#009A3A', boxShadow: '0 0 5px rgba(0,154,58,0.7)' }}
                      />
                    )}
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Tasa hoy — pegado debajo del menú */}
        {rate > 0 && (
          <div className="px-3 pt-1 pb-3">
            <button
              onClick={() => setShowEditRate(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group"
              style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,154,58,0.25)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.1)' }}>
                  <DollarSign size={12} style={{ color: '#009A3A' }} />
                </div>
                <div className="text-left">
                  <div className="text-[9px] text-[#484f58] uppercase tracking-widest font-semibold leading-none">Tasa hoy</div>
                  <div
                    className="font-bold text-[#009A3A] group-hover:text-[#1ebb60] transition leading-none mt-0.5"
                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                  >
                    {rate.toFixed(2)} Bs
                  </div>
                </div>
              </div>
              <span className="text-[9px] text-[#484f58] uppercase tracking-wider font-semibold group-hover:text-[#8b949e] transition">
                Editar
              </span>
            </button>
          </div>
        )}

        {/* Imagen decorativa — al pie del sidebar */}
        <div className="flex justify-center pb-5 pt-2">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="w-24 object-contain select-none"
            style={{ opacity: 0.55 }}
          />
        </div>
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
                <Route path="/providers"       element={<ProvidersPage />} />
                <Route path="/comparator"      element={<ComparatorPage />} />
                <Route path="/merma"           element={<MermaPage />} />
                <Route path="/import-invoice"  element={<InvoicePage />} />
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
          <RateModal key="welcome" rate={rate} setRate={setRate} mandatory onClose={() => setShowWelcome(false)} />
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
