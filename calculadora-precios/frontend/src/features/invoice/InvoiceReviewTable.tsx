import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SecureInput } from '@/components/ui/SecureInput';
import type { InvoiceProduct } from './useInvoiceScanner';

interface InvoiceReviewTableProps {
  productos: InvoiceProduct[];
  onUpdateProducto: (index: number, changes: Partial<InvoiceProduct>) => void;
  onToggleAll: (selected: boolean) => void;
  globalGanancia: string;
  onGlobalGananciaChange: (v: string) => void;
  gananciaMode: 'global' | 'individual';
  onGananciaModeChange: (mode: 'global' | 'individual') => void;
}

function EstadoBadge({ estado, precioAnterior, precio, moneda }: {
  estado: InvoiceProduct['estado'];
  precioAnterior: number | null;
  precio: number;
  moneda: string;
}) {
  if (estado === 'Nuevo') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider whitespace-nowrap"
        style={{
          color: '#60a5fa',
          background: 'rgba(96,165,250,0.08)',
          borderColor: 'rgba(96,165,250,0.25)',
        }}
      >
        Nuevo
      </span>
    );
  }
  if (estado === 'Actualizar precio') {
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider"
          style={{
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.08)',
            borderColor: 'rgba(251,191,36,0.25)',
          }}
        >
          Actualizar
        </span>
        {precioAnterior !== null && (
          <span className="text-[9px] text-[#484f58] whitespace-nowrap"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            ${precioAnterior.toFixed(2)} → ${precio.toFixed(2)} {moneda}
          </span>
        )}
      </div>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider whitespace-nowrap"
      style={{
        color: '#009A3A',
        background: 'rgba(0,154,58,0.08)',
        borderColor: 'rgba(0,154,58,0.25)',
      }}
    >
      Sin cambios
    </span>
  );
}

function PhotoCell({ fotoUrl, index, onChangeFoto }: {
  fotoUrl: string | null;
  index: number;
  onChangeFoto: (index: number, url: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChangeFoto(index, url);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt=""
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.07)', color: '#484f58' }}
        >
          📷
        </div>
      )}
      <button
        type="button"
        onClick={() => pickerRef.current?.click()}
        className="text-[9px] font-semibold uppercase tracking-wider transition"
        style={{ color: '#484f58' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#009A3A'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#484f58'; }}
      >
        Cambiar
      </button>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        onChange={handlePick}
        className="hidden"
      />
    </div>
  );
}

export function InvoiceReviewTable({
  productos,
  onUpdateProducto,
  onToggleAll,
  globalGanancia,
  onGlobalGananciaChange,
  gananciaMode,
  onGananciaModeChange,
}: InvoiceReviewTableProps) {
  const allSelected = productos.length > 0 && productos.every((p) => p.seleccionado);
  const someSelected = productos.some((p) => p.seleccionado);
  const selectedCount = productos.filter((p) => p.seleccionado).length;

  // Estado local de strings para no romper la escritura decimal ("30." → no colapsar a "30")
  const [gananciaStrs, setGananciaStrs] = React.useState<string[]>(
    () => productos.map((p) => p.ganancia.toString())
  );
  // Sincroniza cuando la lista de productos cambia (nuevo escaneo)
  const prevLenRef = React.useRef(productos.length);
  React.useEffect(() => {
    if (productos.length !== prevLenRef.current) {
      setGananciaStrs(productos.map((p) => p.ganancia.toString()));
      prevLenRef.current = productos.length;
    }
  }, [productos]);

  return (
    <div className="space-y-3">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#8b949e]">
            <span className="font-black text-[#e6edf3]">{selectedCount}</span> de {productos.length} seleccionados
          </span>
          {productos.length > 0 && (
            <button
              onClick={() => onToggleAll(!allSelected)}
              className="text-xs font-semibold transition px-2 py-1 rounded-lg"
              style={{
                color: someSelected ? '#C8102E' : '#009A3A',
                background: someSelected ? 'rgba(200,16,46,0.07)' : 'rgba(0,154,58,0.07)',
              }}
            >
              {allSelected ? 'Desmarcar todo' : 'Seleccionar todo'}
            </button>
          )}
        </div>

        {/* Ganancia toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-[#484f58] uppercase tracking-widest">% Ganancia:</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['global', 'individual'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onGananciaModeChange(mode)}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition"
                style={{
                  background: gananciaMode === mode ? 'rgba(0,154,58,0.15)' : 'transparent',
                  color: gananciaMode === mode ? '#009A3A' : '#484f58',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                {mode === 'global' ? 'Global' : 'Individual'}
              </button>
            ))}
          </div>

          {gananciaMode === 'global' && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1"
            >
              <div className="w-20">
                <SecureInput
                  value={globalGanancia}
                  onChange={onGlobalGananciaChange}
                  inputMode="decimal"
                  editable
                  noRing
                  placeholder="30"
                  displayClassName="!min-h-[32px] !py-1 !px-2 !text-sm !rounded-lg !border-white/10"
                />
              </div>
              <span className="text-[#8b949e] text-sm font-bold">%</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <tr>
                <th className="h-10 w-10 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#009A3A] cursor-pointer"
                  />
                </th>
                <th className="h-10 px-3 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Foto</th>
                <th className="h-10 px-4 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Nombre</th>
                <th className="h-10 px-3 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Precio</th>
                <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Moneda</th>
                <th className="h-10 px-3 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Estado</th>
                {gananciaMode === 'individual' && (
                  <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">% Gan.</th>
                )}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence initial={false}>
                {productos.map((producto, index) => (
                  <motion.tr
                    key={`${producto.nombre}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: !producto.seleccionado
                        ? 'rgba(255,255,255,0.01)'
                        : index % 2 === 0
                        ? 'transparent'
                        : 'rgba(255,255,255,0.015)',
                      borderLeft: producto.seleccionado ? '2px solid rgba(0,154,58,0.3)' : '2px solid transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      opacity: producto.seleccionado ? 1 : 0.55,
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={producto.seleccionado}
                        onChange={(e) => onUpdateProducto(index, { seleccionado: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#009A3A] cursor-pointer"
                      />
                    </td>

                    {/* Foto */}
                    <td className="px-3 py-2 align-middle">
                      <PhotoCell
                        fotoUrl={producto.fotoUrl}
                        index={index}
                        onChangeFoto={(i, url) => onUpdateProducto(i, { fotoUrl: url })}
                      />
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3 align-middle">
                      <span className="font-semibold text-[#e6edf3] text-sm">{producto.nombre}</span>
                      {producto.unidad && (
                        <span className="ml-1.5 text-[10px] text-[#484f58] font-medium">
                          ({producto.unidad})
                        </span>
                      )}
                    </td>

                    {/* Precio */}
                    <td className="px-3 py-3 align-middle text-right">
                      <span className="font-black text-[#e6edf3]"
                        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem' }}>
                        {Number(producto.precio).toFixed(2)}
                      </span>
                    </td>

                    {/* Moneda */}
                    <td className="px-3 py-3 align-middle text-center">
                      <span
                        className="inline-flex px-2 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider"
                        style={
                          producto.moneda === 'USD'
                            ? { color: '#60a5fa', background: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.2)' }
                            : { color: '#fbbf24', background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.2)' }
                        }
                      >
                        {producto.moneda}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3 align-middle">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={producto.estado}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <EstadoBadge
                            estado={producto.estado}
                            precioAnterior={producto.precioAnterior}
                            precio={producto.precio}
                            moneda={producto.moneda}
                          />
                        </motion.div>
                      </AnimatePresence>
                    </td>

                    {/* Ganancia individual */}
                    {gananciaMode === 'individual' && (
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-16">
                            <SecureInput
                              value={gananciaStrs[index] ?? producto.ganancia.toString()}
                              onChange={(v) => {
                                // Actualiza el string local siempre (mantiene "30." mientras escribe)
                                setGananciaStrs((prev) => {
                                  const next = [...prev];
                                  next[index] = v;
                                  return next;
                                });
                                // Propaga al store solo cuando es un número válido
                                const num = parseFloat(v);
                                if (!isNaN(num) && num >= 0) {
                                  onUpdateProducto(index, { ganancia: num });
                                }
                              }}
                              inputMode="decimal"
                              editable
                              noRing
                              placeholder="30"
                              displayClassName="!min-h-[30px] !py-1 !px-2 !text-xs !rounded-lg !border-white/10 !text-center"
                            />
                          </div>
                          <span className="text-[#8b949e] text-xs font-bold">%</span>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
