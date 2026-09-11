import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlmacenProductos } from '../../almacen/almacenProductos';
import { useAlmacenProveedores } from '../../almacen/almacenProveedores';
import { ComparacionPrecios } from '../../tipos/proveedor';
import { CampoSeguro } from '../../componentes/ui/CampoSeguro';
import { Search, X, Trophy } from 'lucide-react';

export function PaginaComparador() {
  const { productos } = useAlmacenProductos();
  const { proveedores } = useAlmacenProveedores();
  const [terminoBusqueda, fijarTerminoBusqueda] = useState('');
  const [productoSeleccionado, fijarProductoSeleccionado] = useState<ComparacionPrecios | null>(null);
  const [cargando, fijarCargando] = useState(false);
  const [error, fijarError] = useState<string | null>(null);
  const [indiceResaltado, fijarIndiceResaltado] = useState(-1);

  const nombresUnicos = Array.from(new Set(productos.map((p) => p.nombre))).sort();
  const nombresFiltrados = nombresUnicos.filter((nombre) =>
    nombre.toLowerCase().includes(terminoBusqueda.toLowerCase())
  );

  useEffect(() => { fijarIndiceResaltado(-1); }, [terminoBusqueda]);

  const alSeleccionarProducto = (nombreProducto: string) => {
    fijarCargando(true);
    fijarError(null);
    fijarIndiceResaltado(-1);
    try {
      const variantesProducto = productos.filter((p) => p.nombre === nombreProducto);
      const comparacion: ComparacionPrecios = {
        producto: { id: 0, name: nombreProducto, category: '' },
        precios: variantesProducto
          .filter((p) => p.idProveedor !== undefined)
          .map((p) => {
            const proveedor = proveedores.find((prov) => prov.id === p.idProveedor);
            return {
              id: p.id, product_id: p.id, provider_id: p.idProveedor!,
              cost_usd: p.costoUSD, profit_percentage: p.porcentajeGanancia,
              exempt_from_vat: p.exentoIva, photo_url: p.urlFoto,
              updated_at: p.actualizadoEn ?? undefined,
              provider_name: proveedor?.name || 'Desconocido',
            };
          })
          .sort((a, b) => a.cost_usd - b.cost_usd),
      };
      fijarProductoSeleccionado(comparacion);
    } catch {
      fijarError('Error al cargar datos del producto');
    } finally {
      fijarCargando(false);
    }
  };

  const alPresionarTecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (nombresFiltrados.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        fijarIndiceResaltado((prev) => prev < nombresFiltrados.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        fijarIndiceResaltado((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (indiceResaltado >= 0 && indiceResaltado < nombresFiltrados.length) {
          const nombre = nombresFiltrados[indiceResaltado];
          fijarTerminoBusqueda(nombre);
          alSeleccionarProducto(nombre);
        }
        break;
      case 'Escape':
        e.preventDefault();
        fijarTerminoBusqueda('');
        fijarProductoSeleccionado(null);
        fijarIndiceResaltado(-1);
        break;
    }
  };

  useEffect(() => {
    if (indiceResaltado >= 0) {
      const listaOpciones = document.querySelector('[role="listbox"]');
      if (listaOpciones) {
        const opciones = listaOpciones.querySelectorAll('[role="option"]');
        (opciones[indiceResaltado] as HTMLElement)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [indiceResaltado]);

  useEffect(() => {
    if (terminoBusqueda === '') { fijarProductoSeleccionado(null); fijarError(null); fijarIndiceResaltado(-1); }
  }, [terminoBusqueda]);

  const precioMinimo = productoSeleccionado?.precios.length
    ? Math.min(...productoSeleccionado.precios.map((p) => p.cost_usd))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h1 className="font-black text-[#e6edf3] uppercase tracking-wide"
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 'clamp(1.7rem,4vw,2.4rem)', letterSpacing: '0.06em' }}>
          Comparador de Precios
        </h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Busca un producto y compara precios entre proveedores
        </p>
      </div>

      {/* Search Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{
          background: '#161b22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
          Buscar Producto
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={15} className="text-[#8b949e]" />
          </div>
          <CampoSeguro
            value={terminoBusqueda}
            onChange={(value) => { fijarTerminoBusqueda(value); fijarIndiceResaltado(-1); }}
            onKeyDown={alPresionarTecla}
            placeholder="Ej: Malta 1.5L"
            inputMode="text"
            editable
            sinAnillo
            claseTextoVisible={`!bg-[#1c2128] !border-white/10 !text-[#e6edf3] !rounded-xl pl-9 ${
              indiceResaltado === -1 ? '' : '!border-white/5'
            }`}
          />
          <AnimatePresence>
            {terminoBusqueda && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => { fijarTerminoBusqueda(''); fijarProductoSeleccionado(null); fijarIndiceResaltado(-1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] z-10 transition p-1 rounded"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {terminoBusqueda && nombresFiltrados.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="listbox"
              className="mt-2 rounded-xl max-h-60 overflow-y-auto"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#1c2128' }}
            >
              {nombresFiltrados.map((nombreProducto, indice) => (
                <li
                  key={nombreProducto}
                  onClick={() => { fijarTerminoBusqueda(nombreProducto); alSeleccionarProducto(nombreProducto); fijarIndiceResaltado(-1); }}
                  onMouseEnter={() => fijarIndiceResaltado(indice)}
                  role="option"
                  aria-marcado={indice === indiceResaltado}
                  className="px-4 py-3 cursor-pointer transition-colors text-sm"
                  style={{
                    background: indice === indiceResaltado ? 'rgba(0,154,58,0.1)' : 'transparent',
                    color: indice === indiceResaltado ? '#009A3A' : '#8b949e',
                    borderBottom: indice < nombresFiltrados.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    fontWeight: indice === indiceResaltado ? 700 : 400,
                    outline: indice === indiceResaltado ? '1px solid rgba(0,154,58,0.25)' : 'none',
                    outlineOffset: '-1px',
                  }}
                >
                  {nombreProducto}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading */}
      {cargando && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-[#009A3A]/30 border-t-[#009A3A] animate-spin" />
          <p className="text-[#8b949e] text-sm">Cargando comparación...</p>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}
          >
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-[#C8102E] text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No prices */}
      <AnimatePresence>
        {!cargando && productoSeleccionado && productoSeleccionado.precios.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-8 text-center"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-[#e6edf3] mb-2">No hay precios registrados</h3>
            <p className="text-[#8b949e] text-sm">
              Este producto no tiene precios asociados a proveedores. Agrega proveedores desde el formulario de productos.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results table */}
      <AnimatePresence>
        {!cargando && productoSeleccionado && productoSeleccionado.precios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#161b22',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1c2128' }}>
              <h2 className="font-black text-[#e6edf3] uppercase tracking-wide"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem', letterSpacing: '0.06em' }}>
                {productoSeleccionado.producto.name}
              </h2>
              <p className="text-xs text-[#8b949e] mt-0.5">
                {productoSeleccionado.precios.length} proveedor(es) · ordenado por precio
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead style={{ background: '#21262d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <tr>
                    <th className="h-11 px-5 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Proveedor</th>
                    <th className="h-11 px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Precio USD</th>
                    <th className="h-11 px-5 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Margen</th>
                    <th className="h-11 px-5 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {productoSeleccionado.precios.map((precio, indice) => {
                    const esElMasBarato = precioMinimo !== null && precio.cost_usd === precioMinimo;
                    return (
                      <motion.tr
                        key={precio.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: indice * 0.05 }}
                        style={{
                          background: esElMasBarato
                            ? 'rgba(0,154,58,0.06)'
                            : indice % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          borderLeft: esElMasBarato ? '3px solid #009A3A' : '3px solid transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#e6edf3]">{precio.provider_name}</span>
                            {esElMasBarato && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider"
                                style={{
                                  background: 'rgba(0,154,58,0.15)',
                                  border: '1px solid rgba(0,154,58,0.25)',
                                  color: '#009A3A',
                                }}
                              >
                                <Trophy size={9} /> Más barato
                              </motion.span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className="font-black"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '1.1rem',
                              color: esElMasBarato ? '#009A3A' : '#e6edf3',
                            }}>
                            ${precio.cost_usd.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right text-[#8b949e] text-sm"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          {precio.profit_percentage}%
                        </td>
                        <td className="p-4 align-middle text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                            precio.exempt_from_vat
                              ? 'text-[#C8102E] border-[#C8102E]/25'
                              : 'text-[#009A3A] border-[#009A3A]/25'
                          }`}
                            style={{ background: precio.exempt_from_vat ? 'rgba(200,16,46,0.08)' : 'rgba(0,154,58,0.08)', border: '1px solid' }}>
                            {precio.exempt_from_vat ? 'Exento' : 'Sí'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial empty estado */}
      {!terminoBusqueda && !productoSeleccionado && !cargando && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-16 rounded-2xl"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-base font-bold text-[#e6edf3] mb-2">Busca un producto para comparar</h3>
          <p className="text-[#8b949e] text-sm max-w-md mx-auto">
            Ingresa el nombre de un producto para ver los precios de todos los proveedores que lo ofrecen.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
