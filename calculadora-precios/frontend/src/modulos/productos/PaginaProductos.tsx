import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlmacenProductos, Producto } from '../../almacen/almacenProductos';
import { useAlmacenMoneda } from '../../almacen/almacenMoneda';
import { useAlmacenProveedores } from '../../almacen/almacenProveedores';
import { FormularioProducto } from './FormularioProducto';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ModalConfirmacion } from '../../componentes/ui/ModalConfirmacion';
import { useNavegacionTeclado } from '../../hooks/useNavegacionTeclado';
import { CampoSeguro } from '@/componentes/ui/CampoSeguro';
import { Search, X, Pencil, Trash2, Plus, FilterX, LogOut, ScanLine } from 'lucide-react';
import { useAuth } from '@/contextos/ContextoAuth';
import { useAlmacenAvisos } from '@/almacen/almacenAvisos';

type Moneda = 'Bs' | 'USD';

interface ProductoConPrecios {
  id: number;
  nombre: string;
  costoUSD: number;
  monedaOriginal: Moneda;
  porcentajeGanancia: number;
  exentoIva: boolean;
  urlFoto: string;
  precioConIvaUSD: number;
  utilidadUSD: number;
}

function useProductosConPrecios(productos: Producto[]) {
  const tasa = useAlmacenMoneda((estado) => estado.tasa);
  return React.useMemo(() => {
    return productos.map((producto) => {
      const divisor = 1 - producto.porcentajeGanancia / 100;
      const precioBaseUSD = divisor <= 0 ? producto.costoUSD : producto.costoUSD / divisor;
      const utilidadUSD = precioBaseUSD - producto.costoUSD;
      const precioConIvaUSD = producto.exentoIva ? precioBaseUSD : precioBaseUSD * 1.16;
      return {
        ...producto,
        precioConIvaUSD: Math.round(precioConIvaUSD * 100) / 100,
        utilidadUSD: Math.round(utilidadUSD * 100) / 100,
      } as ProductoConPrecios;
    });
  }, [productos, tasa]);
}

export function PaginaProductos({
  alEditarTasa,
  rolUsuario,
}: {
  alEditarTasa: () => void;
  rolUsuario: 'gerencia' | 'invitado' | null;
}) {
  const { productos, eliminarProducto } = useAlmacenProductos((estado) => estado);
  const { proveedores } = useAlmacenProveedores();
  const tasa = useAlmacenMoneda((estado) => estado.tasa);
  const [mostrarFormulario, fijarMostrarFormulario] = React.useState(false);
  const [productoEnEdicion, fijarProductoEnEdicion] = React.useState<{
    id: number; nombre: string; costo: number; moneda: Moneda;
    porcentajeGanancia: number; exentoIva: boolean; urlFoto: string;
  } | null>(null);
  const [productoAEliminar, fijarProductoAEliminar] = React.useState<{ id: number; nombre: string } | null>(null);
  const [parametrosUrl] = useSearchParams();
  const navigate = useNavigate();
  const providerFilterId = parametrosUrl.get('providerId');
  const [textoBusqueda, fijarTextoBusqueda] = React.useState('');

  const isGerencia = rolUsuario === 'gerencia';
  const { cerrarSesion } = useAuth();

  const filteredProducts = productos
    .filter((p) => {
      const matchesProvider = providerFilterId ? p.idProveedor?.toString() === providerFilterId : true;
      const matchesSearch = textoBusqueda ? p.nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) : true;
      return matchesProvider && matchesSearch;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const currentProvider = providerFilterId ? proveedores.find((p) => p.id.toString() === providerFilterId) : null;
  const productosConPrecios = useProductosConPrecios(filteredProducts);

  const { indiceResaltado, alPresionarTecla, fijarIndiceResaltado, refContenedor } = useNavegacionTeclado({
    elementos: productosConPrecios,
    alSeleccionar: (producto) => {
      fijarProductoEnEdicion({
        id: producto.id, nombre: producto.nombre,
        costo: producto.costoUSD * (tasa > 0 ? tasa : 1),
        moneda: producto.monedaOriginal,
        porcentajeGanancia: producto.porcentajeGanancia,
        exentoIva: producto.exentoIva,
        urlFoto: producto.urlFoto,
      });
      fijarMostrarFormulario(true);
    },
    enfocarAlMontar: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 md:space-y-5"
    >
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-black text-[#e6edf3] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.6rem,4vw,2.3rem)', letterSpacing: '0.06em' }}>
            Gestión de Productos
          </h1>
          <div className="flex items-center mt-1 gap-2">
            <p className="text-sm text-[#8b949e]">
              {tasa > 0
                ? <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>1 USD = {tasa.toFixed(2)} Bs</span>
                : '⚠️ Tasa no configurada'}
            </p>
            {tasa > 0 && (
              <button onClick={alEditarTasa}
                className="p-1 rounded-lg text-[#8b949e] hover:text-[#009A3A] transition"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                title="Editar tasa">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {isGerencia && (
            <>
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/import-invoice')}
                className="flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition text-sm flex-1 md:flex-none justify-center"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  color: '#009A3A',
                  background: 'rgba(0,154,58,0.08)',
                  border: '1px solid rgba(0,154,58,0.22)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.14)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.08)'; }}
              >
                <ScanLine size={15} strokeWidth={2} />
                IMPORTAR FACTURA
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { fijarProductoEnEdicion(null); fijarMostrarFormulario(true); }}
                className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition text-sm flex-1 md:flex-none justify-center"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                  boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                AGREGAR PRODUCTO
              </motion.button>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={cerrarSesion}
            className="flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition text-sm justify-center"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              letterSpacing: '0.06em',
              color: '#C8102E',
              background: 'rgba(200,16,46,0.08)',
              border: '1px solid rgba(200,16,46,0.18)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,16,46,0.15)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,16,46,0.08)'; }}
          >
            <LogOut size={15} strokeWidth={2} />
            SALIR
          </motion.button>
        </div>
      </div>

      {/* ─── Stats Banner ─── */}
      <div className="rounded-2xl p-5 md:p-7 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg,#161b22 0%,#1c2128 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 40% 70% at 5% 50%, rgba(0,154,58,0.06) 0%, transparent 60%)' }} />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-[#e6edf3] uppercase tracking-widest leading-none"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.6rem,4vw,2.6rem)', letterSpacing: '0.12em' }}>
              <span style={{ color: '#009A3A' }}>LA</span>{' '}MUNDIAL
            </h2>
            <span className="text-[#484f58] uppercase tracking-[0.2em] font-semibold" style={{ fontSize: '0.6rem' }}>
              XXI · Gestión de Precios
            </span>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <div className="animate-number-pop font-black leading-none"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 'clamp(3rem,8vw,5rem)',
                color: '#009A3A',
                textShadow: '0 0 40px rgba(0,154,58,0.4)',
              }}>
              {filteredProducts.length}
            </div>
            <p className="text-[11px] font-semibold text-[#8b949e] mt-1 uppercase tracking-widest">
              {currentProvider ? `Productos de ${currentProvider.name}` : 'Productos'}
            </p>
          </div>
        </div>
        <div className="animate-pulse-bar mt-4 flex h-[2px] rounded-full overflow-hidden">
          <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
          <div style={{ flex: 3, background: '#C8102E' }} />
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="rounded-xl p-3"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={15} className="text-[#8b949e]" />
          </div>
          <CampoSeguro
            value={textoBusqueda}
            onChange={fijarTextoBusqueda}
            placeholder="Buscar producto por nombre..."
            inputMode="text"
            editable
            sinAnillo
            claseTextoVisible="!bg-transparent !border-transparent !text-[#e6edf3] pl-9 !rounded-lg !min-h-[40px]"
          />
          <AnimatePresence>
            {textoBusqueda && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => fijarTextoBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#8b949e] hover:text-[#e6edf3] z-10 transition"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <X size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Products Table ─── */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
        {/* Table header row */}
        <div className="px-4 md:px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-black text-[#e6edf3] uppercase tracking-wide"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', letterSpacing: '0.06em' }}>
            Lista de Productos{' '}
            <span className="text-[#8b949e] font-semibold text-xs normal-case tracking-normal" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ({filteredProducts.length} de {productos.length})
            </span>
          </h2>
          {currentProvider && isGerencia && (
            <button
              onClick={() => navigate('/products')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
              style={{
                color: '#009A3A',
                border: '1px solid rgba(0,154,58,0.25)',
                background: 'rgba(0,154,58,0.06)',
              }}
            >
              <FilterX size={12} /> Limpiar Filtro
            </button>
          )}
        </div>

        <div
          ref={refContenedor}
          tabIndex={0}
          onKeyDown={alPresionarTecla}
          onMouseLeave={() => fijarIndiceResaltado(-1)}
          aria-etiqueta="Lista de productos"
          role="grid"
          className="outline-none"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <tr>
                  <th className="h-11 px-3 md:px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap min-w-[70px]">Foto</th>
                  <th className="h-11 px-3 md:px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Nombre</th>
                  <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Precio Final</th>
                  {isGerencia && (
                    <>
                      <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Costo</th>
                      <th className="h-11 px-3 md:px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Ganancia</th>
                      <th className="h-11 px-3 md:px-5 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Margen</th>
                      <th className="h-11 px-3 md:px-5 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">IVA</th>
                      <th className="h-11 px-3 md:px-5 align-middle whitespace-nowrap" />
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                <AnimatePresence>
                  {productosConPrecios.map((producto, indice) => {
                    const costBs = tasa > 0 ? producto.costoUSD * tasa : producto.costoUSD;
                    const priceWithVATBs = tasa > 0 ? producto.precioConIvaUSD * tasa : producto.precioConIvaUSD;
                    const utilityBs = tasa > 0 ? producto.utilidadUSD * tasa : producto.utilidadUSD;
                    const estaResaltado = indiceResaltado === indice;
                    const isEven = indice % 2 === 0;

                    return (
                      <motion.tr
                        key={producto.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        transition={{ delay: indice * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          background: estaResaltado
                            ? 'rgba(0,154,58,0.08)'
                            : isEven
                            ? 'transparent'
                            : 'rgba(255,255,255,0.015)',
                          borderLeft: estaResaltado ? '3px solid #009A3A' : '3px solid transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                        role="row"
                        aria-marcado={estaResaltado}
                        onMouseEnter={() => fijarIndiceResaltado(indice)}
                      >
                        {/* Foto */}
                        <td className="px-3 md:px-5 py-3 md:py-4 align-middle">
                          {producto.urlFoto ? (
                            <img src={producto.urlFoto}
                              className="w-10 h-10 object-cover rounded-xl"
                              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                              alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs text-[#484f58]"
                              style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                              📷
                            </div>
                          )}
                        </td>

                        {/* Nombre */}
                        <td className="px-3 md:px-5 py-3 md:py-4 align-middle font-semibold text-[#e6edf3] text-sm md:text-base">
                          {producto.nombre}
                        </td>

                        {/* Precio Final */}
                        <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                          {tasa > 0 ? (
                            <>
                              <div className="font-black text-[#e6edf3]"
                                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(0.9rem,2vw,1.2rem)' }}>
                                {priceWithVATBs.toFixed(2)}
                                <span className="text-[#484f58] text-xs font-bold"> Bs</span>
                              </div>
                              <div className="text-xs text-[#8b949e]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {producto.precioConIvaUSD.toFixed(2)} USD
                              </div>
                            </>
                          ) : (
                            <div className="font-black text-[#e6edf3]"
                              style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>
                              {producto.precioConIvaUSD.toFixed(2)} USD
                            </div>
                          )}
                        </td>

                        {isGerencia && (
                          <>
                            {/* Costo */}
                            <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                              {tasa > 0 ? (
                                <>
                                  <div className="font-bold text-[#8b949e] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                    {costBs.toFixed(2)} <span className="text-[#484f58] text-xs">Bs</span>
                                  </div>
                                  <div className="text-xs text-[#484f58]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                    {producto.costoUSD.toFixed(2)} USD
                                  </div>
                                </>
                              ) : (
                                <div className="font-bold text-[#8b949e] text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {producto.costoUSD.toFixed(2)} USD
                                </div>
                              )}
                            </td>

                            {/* Ganancia */}
                            <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-right">
                              {tasa > 0 ? (
                                <>
                                  <div className="font-black"
                                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(0.85rem,2vw,1.1rem)', color: '#009A3A' }}>
                                    {utilityBs.toFixed(2)} <span className="text-xs" style={{ color: '#1ebb60' }}>Bs</span>
                                  </div>
                                  <div className="text-xs text-[#8b949e]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                    {producto.utilidadUSD.toFixed(2)} USD
                                  </div>
                                </>
                              ) : (
                                <div className="font-black text-[#009A3A] text-lg" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {producto.utilidadUSD.toFixed(2)} USD
                                </div>
                              )}
                            </td>

                            {/* Margen */}
                            <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-center">
                              <span className="text-[#8b949e] font-bold text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {producto.porcentajeGanancia}%
                              </span>
                            </td>

                            {/* IVA */}
                            <td className="px-3 md:px-5 py-3 md:py-4 align-middle text-center">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider ${
                                producto.exentoIva
                                  ? 'text-[#C8102E] border-[#C8102E]/25'
                                  : 'text-[#009A3A] border-[#009A3A]/25'
                              }`}
                                style={{ background: producto.exentoIva ? 'rgba(200,16,46,0.08)' : 'rgba(0,154,58,0.08)' }}>
                                {producto.exentoIva ? 'Exento' : 'Sí'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 md:px-5 py-3 md:py-4 align-middle">
                              <div className="flex items-center gap-1">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fijarProductoEnEdicion({
                                      id: producto.id, nombre: producto.nombre,
                                      costo: producto.costoUSD * (tasa > 0 ? tasa : 1),
                                      moneda: producto.monedaOriginal,
                                      porcentajeGanancia: producto.porcentajeGanancia,
                                      exentoIva: producto.exentoIva,
                                      urlFoto: producto.urlFoto,
                                    });
                                    fijarMostrarFormulario(true);
                                  }}
                                  className="p-2 rounded-lg text-[#8b949e] hover:text-[#009A3A] transition-colors"
                                  style={{ background: 'transparent' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.1)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                  title="Editar"
                                >
                                  <Pencil size={13} strokeWidth={2} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => fijarProductoAEliminar({ id: producto.id, nombre: producto.nombre })}
                                  className="p-2 rounded-lg text-[#8b949e] hover:text-[#C8102E] transition-colors"
                                  style={{ background: 'transparent' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,16,46,0.1)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} strokeWidth={2} />
                                </motion.button>
                              </div>
                            </td>
                          </>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty estado */}
          <AnimatePresence>
            {productosConPrecios.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-14"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)' }}>
                  📦
                </div>
                <h3 className="font-black text-[#8b949e] mb-2 uppercase tracking-wide"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.2rem' }}>
                  No hay productos
                </h3>
                <p className="text-sm text-[#484f58] mb-6">
                  {textoBusqueda ? 'No se encontraron resultados.' : 'Agrega tu primer producto para comenzar.'}
                </p>
                {isGerencia && !textoBusqueda && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fijarMostrarFormulario(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition text-sm"
                    style={{ background: 'linear-gradient(135deg,#009A3A,#007b2e)', boxShadow: '0 4px 16px rgba(0,154,58,0.3)' }}
                  >
                    <Plus size={15} /> Agregar Primer Producto
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <FormularioProducto
        estaAbierto={mostrarFormulario}
        alCerrar={() => { fijarMostrarFormulario(false); fijarProductoEnEdicion(null); }}
        productoAEditar={productoEnEdicion}
        alGuardar={() => { fijarMostrarFormulario(false); fijarProductoEnEdicion(null); }}
      />

      <ModalConfirmacion
        estaAbierto={productoAEliminar !== null}
        titulo="¿Eliminar producto?"
        mensaje={`¿Estás seguro de que deseas eliminar "${productoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        alConfirmar={async () => {
          if (productoAEliminar) {
            try { await eliminarProducto(productoAEliminar.id); }
            catch { useAlmacenAvisos.getState().mostrar('Error al eliminar el producto. Inténtalo de nuevo.', 'error'); }
            finally { fijarProductoAEliminar(null); }
          }
        }}
        alCancelar={() => fijarProductoAEliminar(null)}
      />
    </motion.div>
  );
}
