import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlmacenMoneda } from '@/almacen/almacenMoneda';
import { supabase } from '@/lib/supabase';
import { convertirEntradaANumero } from '@/utilidades/decimales';
import { CampoSeguro } from '@/componentes/ui/CampoSeguro';
import { useAuth } from '@/contextos/ContextoAuth';
import { obtenerTasaBcv, formatearFechaBcv, type TasaBcv } from '@/servicios/tasaBcv';
import {
  Package, Calculator, Truck, BarChart2, TrendingDown,
  Menu, X, DollarSign, ScanLine, Loader2, Landmark, FileText, LogOut,
} from 'lucide-react';

import { PaginaProductos } from '@/modulos/productos/PaginaProductos';
import { PaginaMerma } from '@/modulos/merma/PaginaMerma';
import { useAlmacenProductos } from '@/almacen/almacenProductos';
import { PaginaCalculadora } from '@/modulos/calculadora/PaginaCalculadora';
import { PaginaProveedores } from '@/modulos/proveedores/PaginaProveedores';
import { PaginaComparador } from '@/modulos/comparador/PaginaComparador';
import { PaginaInicio } from '@/modulos/acceso/PaginaInicio';
import { MarqueeDiagonal } from '@/modulos/acceso/MarqueeDiagonal';
import { PaginaFactura } from '@/modulos/facturas/PaginaFactura';
import { PaginaHistorialFacturas } from '@/modulos/facturas/PaginaHistorialFacturas';
import { ContenedorAvisos } from '@/componentes/ui/Avisos';

/* ─── Error Boundary ─── */
class BarreraDeErrores extends React.Component<
  { children: React.ReactNode },
  { huboError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { huboError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { huboError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.huboError) {
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
function ModalTasa({ tasa, fijarTasa, alCerrar, obligatorio = false }: {
  tasa: number;
  fijarTasa: (r: number) => void;
  alCerrar: () => void;
  obligatorio?: boolean;
}) {
  const [valorCampo, fijarValorCampo] = useState(tasa > 0 ? tasa.toString() : '');
  const [errorTasa, fijarErrorTasa] = useState('');
  const [bcv, fijarBcv] = useState<TasaBcv | null>(null);
  const [estadoBcv, fijarEstadoBcv] = useState<'loading' | 'ok' | 'error'>('loading');
  const usuarioEscribio = useRef(false);

  // Al abrir, consulta la tasa oficial BCV y pre-llena el campo si está vacío.
  // Si la API falla o no hay internet, el modal sigue funcionando en modo manual.
  useEffect(() => {
    let activo = true;
    obtenerTasaBcv().then((resultado) => {
      if (!activo) return;
      if (resultado) {
        fijarBcv(resultado);
        fijarEstadoBcv('ok');
        if (!usuarioEscribio.current) {
          fijarValorCampo((prev) => (prev === '' ? resultado.tasa.toFixed(2) : prev));
        }
      } else {
        fijarEstadoBcv('error');
      }
    });
    return () => { activo = false; };
  }, []);

  const alConfirmar = () => {
    const valorNumerico = convertirEntradaANumero(valorCampo);
    if (valorNumerico > 0) {
      fijarTasa(valorNumerico);
      alCerrar();
      return;
    }
    // Obligatorio: sin tasa válida no se cierra ni se puede usar la app
    if (obligatorio) {
      fijarErrorTasa('Debes ingresar la tasa del día para continuar.');
      return;
    }
    alCerrar();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[100] p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      // Clic afuera = descartar, NO guardar. Antes llamaba a alConfirmar: si el
      // usuario empezaba a escribir "36,50", alcanzaba a teclear "3" y hacia
      // clic afuera para arrepentirse, la tasa quedaba en 3 y TODOS los precios
      // de la app se calculaban con esa tasa.
      onClick={obligatorio ? undefined : alCerrar}
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
            <CampoSeguro
              value={valorCampo}
              onChange={(v) => { usuarioEscribio.current = true; fijarValorCampo(v); fijarErrorTasa(''); }}
              alEnviar={alConfirmar}
              placeholder="Ej: 582.69"
              inputMode="decimal"
              editable
              sinAnillo
              claseTextoVisible="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
            />
          </div>

          {/* Tasa oficial BCV (DolarApi) — informativa, siempre editable a mano */}
          {estadoBcv === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-[#8b949e]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Loader2 size={13} className="animate-spin text-[#009A3A]" />
              Consultando tasa oficial BCV…
            </div>
          )}
          {estadoBcv === 'ok' && bcv && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(0,154,58,0.07)', border: '1px solid rgba(0,154,58,0.2)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Landmark size={13} className="text-[#009A3A] flex-shrink-0" />
                <span className="text-xs text-[#8b949e] truncate">
                  BCV{formatearFechaBcv(bcv.actualizadoEn) ? ` (${formatearFechaBcv(bcv.actualizadoEn)})` : ''}:{' '}
                  <span className="font-bold text-[#009A3A]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {bcv.tasa.toFixed(2)} Bs
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => { fijarTasa(bcv.tasa); alCerrar(); }}
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg text-[#009A3A] transition hover:text-white flex-shrink-0"
                style={{ background: 'rgba(0,154,58,0.12)', border: '1px solid rgba(0,154,58,0.3)' }}
              >
                Usar
              </button>
            </div>
          )}
          {estadoBcv === 'error' && (
            <p className="text-[11px] text-[#484f58] px-1">
              No se pudo consultar la tasa BCV automáticamente. Ingrésala manualmente.
            </p>
          )}

          {errorTasa && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2 text-[#C8102E]"
              style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
              <span>⚠️</span> {errorTasa}
            </div>
          )}
          <button
            type="button"
            onClick={alConfirmar}
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

/* ─── Nav elementos ─── */
const ENLACES_MENU = [
  { path: '/products',        icon: Package,     etiqueta: 'Productos',      soloGerencia: false },
  { path: '/calculator',      icon: Calculator,  etiqueta: 'Calculadora',    soloGerencia: false },
  { path: '/providers',       icon: Truck,       etiqueta: 'Proveedores',    soloGerencia: true  },
  { path: '/comparator',      icon: BarChart2,   etiqueta: 'Comparador',     soloGerencia: true  },
  { path: '/merma',           icon: TrendingDown,etiqueta: 'Merma',          soloGerencia: true  },
  { path: '/import-invoice',  icon: ScanLine,    etiqueta: 'Import. Factura',soloGerencia: true  },
  { path: '/invoices',        icon: FileText,    etiqueta: 'Facturas Import.',soloGerencia: true },
];

/* ─── App ─── */
function App() {
  const { tasa, fijarTasa } = useAlmacenMoneda();
  const { cargarDesdeSupabase } = useAlmacenProductos();
  const { rolUsuario, cerrarSesion } = useAuth();
  const [mostrarBienvenida, fijarMostrarBienvenida] = useState(false);
  const [mostrarEditarTasa, fijarMostrarEditarTasa] = useState(false);
  const [menuAbierto, fijarMenuAbierto] = useState(false);
  const [errorSupabase, fijarErrorSupabase] = useState<string | null>(null);
  const location = useLocation();

  const esGerencia = rolUsuario === 'gerencia';

  useEffect(() => { fijarMenuAbierto(false); }, [location]);

  // Al abrir el menú en móvil se suelta el foco de cualquier campo. Si no, el
  // buscador que quedó enfocado sigue con el caret parpadeando y el teclado del
  // teléfono abierto detrás del menú.
  useEffect(() => {
    if (menuAbierto && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [menuAbierto]);
  // La tasa del día es obligatoria: el aviso sale al entrar a un modo (invitado
  // o gerencia) solo si todavia no se cargo una tasa hoy (currencyStore la
  // persiste con fecha), y no se puede cerrar sin ingresar una tasa válida.
  useEffect(() => { if (rolUsuario && tasa === 0) fijarMostrarBienvenida(true); }, [rolUsuario, tasa]);

  useEffect(() => {
    supabase.from('products').select('count').limit(1).then(({ error }) => {
      if (error) {
        console.error('Supabase:', error);
        fijarErrorSupabase('Error de conexión a la base de datos.');
      } else {
        cargarDesdeSupabase().catch(() => fijarErrorSupabase('No se pudieron cargar los productos.'));
      }
    });
  }, [cargarDesdeSupabase]);

  if (!rolUsuario) return <PaginaInicio />;

  const enlacesVisibles = ENLACES_MENU.filter(enlace => !enlace.soloGerencia || esGerencia);

  return (
    <div className="flex min-h-screen bg-[#0d1117] overflow-x-hidden">

      {/* Fondo animado: la palabra del modo activo en marquee horizontal */}
      <MarqueeDiagonal palabra={esGerencia ? 'GERENCIA' : 'INVITADO'} angulo={0} fijo />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center"
        style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="absolute bottom-0 left-0 right-0 flex h-[2px]">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>
        <button
          onClick={() => fijarMenuAbierto(!menuAbierto)}
          className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition"
          style={{ background: menuAbierto ? 'rgba(255,255,255,0.05)' : 'transparent' }}
        >
          {menuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="ml-3 font-black text-[#e6edf3] uppercase tracking-widest"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}>
          La <span className="text-[#009A3A]">Mundial</span>
        </span>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => fijarMenuAbierto(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Sidebar ─── */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 flex flex-col
          w-[200px] flex-shrink-0 self-start mt-3
          rounded-r-2xl overflow-hidden
          transition-transform duration-300 ease-in-out
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
            {enlacesVisibles.map((enlace) => {
              const Icono = enlace.icon;
              const isActive =
                location.pathname === enlace.path ||
                (enlace.path === '/products' && location.pathname === '/');
              return (
                <NavLink key={enlace.path} to={enlace.path} className="block">
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
                      <Icono size={15} strokeWidth={2.2} />
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
                      {enlace.etiqueta}
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
        {tasa > 0 && (
          <div className="px-3 pt-1 pb-3">
            <button
              onClick={() => fijarMostrarEditarTasa(true)}
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
                    {tasa.toFixed(2)} Bs
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
        <div className="flex justify-center pb-4 pt-2">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="w-24 object-contain select-none"
            style={{ opacity: 0.55 }}
          />
        </div>

        {/* Salir — lo último del sidebar. Discreto: sin relleno de fondo y en
            letra chica, para que no compita con el menú. */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-colors"
            style={{
              color: '#C8102E',
              background: 'transparent',
              border: '1px solid rgba(200,16,46,0.16)',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(200,16,46,0.1)';
              el.style.borderColor = 'rgba(200,16,46,0.35)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'transparent';
              el.style.borderColor = 'rgba(200,16,46,0.16)';
            }}
          >
            <LogOut size={12} strokeWidth={2.4} />
            Salir
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="relative flex-1 min-w-0 p-4 md:p-6 overflow-y-auto lg:pt-6 pt-16">
        {errorSupabase && (
          <div className="mb-4 p-4 rounded-xl text-sm text-[#C8102E]"
            style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}>
            ⚠️ {errorSupabase}
          </div>
        )}
        <BarreraDeErrores>
          <Routes>
            <Route path="/" element={<PaginaProductos alEditarTasa={() => fijarMostrarEditarTasa(true)} rolUsuario={rolUsuario} />} />
            <Route path="/products" element={<PaginaProductos alEditarTasa={() => fijarMostrarEditarTasa(true)} rolUsuario={rolUsuario} />} />
            <Route path="/calculator" element={<PaginaCalculadora alEditarTasa={() => fijarMostrarEditarTasa(true)} />} />
            {esGerencia ? (
              <>
                <Route path="/providers"       element={<PaginaProveedores />} />
                <Route path="/comparator"      element={<PaginaComparador />} />
                <Route path="/merma"           element={<PaginaMerma />} />
                <Route path="/import-invoice"  element={<PaginaFactura />} />
                <Route path="/invoices"        element={<PaginaHistorialFacturas />} />
              </>
            ) : (
              <>
                <Route path="/providers"       element={<Navigate to="/unauthorized" replace />} />
                <Route path="/comparator"      element={<Navigate to="/unauthorized" replace />} />
                <Route path="/merma"           element={<Navigate to="/unauthorized" replace />} />
                <Route path="/import-invoice"  element={<Navigate to="/unauthorized" replace />} />
                <Route path="/invoices"        element={<Navigate to="/unauthorized" replace />} />
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
        </BarreraDeErrores>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {mostrarBienvenida && (
          <ModalTasa key="welcome" tasa={tasa} fijarTasa={fijarTasa} obligatorio alCerrar={() => fijarMostrarBienvenida(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mostrarEditarTasa && (
          <ModalTasa key="edit" tasa={tasa} fijarTasa={fijarTasa} alCerrar={() => fijarMostrarEditarTasa(false)} />
        )}
      </AnimatePresence>
      <ContenedorAvisos />
    </div>
  );
}

export default App;
