import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ClipboardPaste, X, ImagePlus } from 'lucide-react';
import { SecureInput } from '@/components/ui/SecureInput';
import { useCurrencyStore } from '@/store/currencyStore';
import type { InvoiceProduct } from './useInvoiceScanner';

const IVA = 0.16;

// Convierte cualquier blob de imagen a PNG redimensionado a 500px máximo.
function blobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const maxSize = 500;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxSize || h > maxSize) {
        if (w >= h) { h = Math.round((h * maxSize) / w); w = maxSize; }
        else { w = Math.round((w * maxSize) / h); h = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo obtener canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((png) => {
        URL.revokeObjectURL(url);
        if (png) resolve(png);
        else reject(new Error('Conversión a PNG falló'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}

// (costo / (1 - ganancia/100)) * (1 + IVA si no exento)
function calcularPrecioVenta(costo: number, ganancia: number, exento: boolean): number {
  if (costo <= 0) return 0;
  const margen = 1 - (ganancia || 0) / 100;
  if (margen <= 0) return 0;
  const base = costo / margen;
  return exento ? base : base * (1 + IVA);
}

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

interface PhotoCellProps {
  fotoUrl: string | null;
  index: number;
  onChangeFoto: (index: number, url: string, blob: Blob) => void;
  onClearFoto: (index: number) => void;
}

function PhotoCell({ fotoUrl, index, onChangeFoto, onClearFoto }: PhotoCellProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pasteHover, setPasteHover] = useState(false);

  // Cierra el popover al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Foco automático del área de pegado al abrir, para que Ctrl+V funcione enseguida
  useEffect(() => {
    if (open) pasteAreaRef.current?.focus();
  }, [open]);

  const procesar = async (raw: Blob) => {
    setBusy(true);
    try {
      const png = await blobToPng(raw);
      const url = URL.createObjectURL(png);
      onChangeFoto(index, url, png);
      setOpen(false);
    } catch (err) {
      console.error('Error procesando imagen:', err);
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) procesar(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          procesar(blob);
          return;
        }
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt=""
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition"
          style={{
            background: open ? 'rgba(0,154,58,0.12)' : '#1c2128',
            border: `1px dashed ${open ? 'rgba(0,154,58,0.4)' : 'rgba(255,255,255,0.15)'}`,
            color: open ? '#1ebb60' : '#6e7681',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#1ebb60';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,154,58,0.4)';
          }}
          onMouseLeave={(e) => {
            if (!open) {
              (e.currentTarget as HTMLElement).style.color = '#6e7681';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
            }
          }}
          title="Agregar foto"
        >
          <ImagePlus size={16} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[9px] font-semibold uppercase tracking-wider transition"
        style={{ color: open ? '#009A3A' : '#484f58' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#009A3A'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.color = '#484f58'; }}
      >
        {fotoUrl ? 'Cambiar' : 'Agregar foto'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 w-64 rounded-xl overflow-hidden p-3 space-y-2"
            style={{
              background: '#1c2128',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              onClick={() => pickerRef.current?.click()}
              disabled={busy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              style={{
                background: 'rgba(0,154,58,0.1)',
                border: '1px solid rgba(0,154,58,0.2)',
                color: '#1ebb60',
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              <Upload size={14} />
              SUBIR ARCHIVO
            </button>

            <div
              ref={pasteAreaRef}
              tabIndex={0}
              onPaste={handlePaste}
              onMouseEnter={() => setPasteHover(true)}
              onMouseLeave={() => setPasteHover(false)}
              className="w-full flex flex-col items-center gap-1 px-3 py-4 rounded-lg cursor-text outline-none transition"
              style={{
                border: `1.5px dashed ${pasteHover ? '#1ebb60' : 'rgba(255,255,255,0.18)'}`,
                background: pasteHover ? 'rgba(0,154,58,0.06)' : 'transparent',
                color: pasteHover ? '#1ebb60' : '#8b949e',
              }}
            >
              <ClipboardPaste size={16} />
              <span
                className="text-[11px] font-bold uppercase text-center"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em' }}
              >
                Pega la imagen aquí
              </span>
              <span className="text-[10px] text-[#484f58]">(Ctrl+V)</span>
            </div>

            {fotoUrl && (
              <button
                type="button"
                onClick={() => { onClearFoto(index); setOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition"
                style={{
                  color: '#C8102E',
                  background: 'rgba(200,16,46,0.07)',
                  border: '1px solid rgba(200,16,46,0.15)',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.05em',
                }}
              >
                <X size={12} />
                QUITAR FOTO
              </button>
            )}

            {busy && (
              <p className="text-[10px] text-center text-[#8b949e]">Procesando...</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={pickerRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
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
  const rate = useCurrencyStore((s) => s.rate);

  // Estado local de strings para no romper la escritura decimal ("30." → no colapsar a "30")
  const [gananciaStrs, setGananciaStrs] = React.useState<string[]>(
    () => productos.map((p) => p.ganancia.toString())
  );
  const [precioStrs, setPrecioStrs] = React.useState<string[]>(
    () => productos.map((p) => p.precio.toFixed(2))
  );
  // Sincroniza cuando la lista de productos cambia (nuevo escaneo)
  const prevLenRef = React.useRef(productos.length);
  React.useEffect(() => {
    if (productos.length !== prevLenRef.current) {
      setGananciaStrs(productos.map((p) => p.ganancia.toString()));
      setPrecioStrs(productos.map((p) => p.precio.toFixed(2)));
      prevLenRef.current = productos.length;
    }
  }, [productos]);

  const gananciaGlobalNum = parseFloat(globalGanancia) || 0;

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
          <table className="w-full min-w-[820px]">
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
                <th className="h-10 px-3 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Precio Costo</th>
                <th className="h-10 px-3 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Precio Venta</th>
                <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Moneda</th>
                <th className="h-10 px-3 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Estado</th>
                {gananciaMode === 'individual' && (
                  <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">% Gan.</th>
                )}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence initial={false}>
                {productos.map((producto, index) => {
                  const gananciaUsada = gananciaMode === 'global' ? gananciaGlobalNum : producto.ganancia;
                  const precioVenta = calcularPrecioVenta(producto.precio, gananciaUsada, producto.exemptFromVAT);
                  const monedaSimbolo = producto.moneda === 'USD' ? '$' : 'Bs';
                  const otroMonedaSimbolo = producto.moneda === 'USD' ? 'Bs' : '$';
                  let precioVentaOtra: number | null = null;
                  if (rate > 0) {
                    precioVentaOtra = producto.moneda === 'USD' ? precioVenta * rate : precioVenta / rate;
                  }
                  const tieneBulto = producto.cantidadBulto !== null && producto.cantidadBulto > 1;

                  return (
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
                        onChangeFoto={(i, url, blob) => onUpdateProducto(i, { fotoUrl: url, fotoBlob: blob })}
                        onClearFoto={(i) => onUpdateProducto(i, { fotoUrl: null, fotoBlob: null })}
                      />
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center flex-wrap gap-x-1.5">
                        <span className="font-semibold text-[#e6edf3] text-sm">{producto.nombre}</span>
                        {producto.unidad && (
                          <span className="text-[10px] text-[#484f58] font-medium">
                            ({producto.unidad})
                          </span>
                        )}
                      </div>
                      {tieneBulto && (
                        <div
                          className="mt-1 text-[10px] font-semibold flex items-center gap-1 flex-wrap"
                          style={{ color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          <span className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-[9px]"
                            style={{ background: 'rgba(167,139,250,0.1)' }}>
                            Bulto de {producto.cantidadBulto}
                          </span>
                          {producto.precioTotal !== null && (
                            <span className="text-[#8b949e]">
                              — {monedaSimbolo}{producto.precioTotal.toFixed(2)} total → {monedaSimbolo}{producto.precio.toFixed(2)} c/u
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Precio Costo (editable) */}
                    <td className="px-3 py-2 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[#484f58] text-[11px] font-bold">{monedaSimbolo}</span>
                        <div className="w-20">
                          <SecureInput
                            value={precioStrs[index] ?? producto.precio.toFixed(2)}
                            onChange={(v) => {
                              setPrecioStrs((prev) => {
                                const next = [...prev];
                                next[index] = v;
                                return next;
                              });
                              const num = parseFloat(v);
                              if (!isNaN(num) && num >= 0) {
                                onUpdateProducto(index, { precio: num });
                              }
                            }}
                            inputMode="decimal"
                            editable
                            noRing
                            placeholder="0.00"
                            displayClassName="!min-h-[30px] !py-1 !px-2 !text-sm !rounded-lg !border-white/10 !text-right"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Precio Venta (calculado, verde, JetBrains Mono) */}
                    <td className="px-3 py-3 align-middle text-right">
                      <div className="flex flex-col items-end leading-tight">
                        <span
                          className="font-black"
                          style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem', color: '#1ebb60' }}
                        >
                          {monedaSimbolo}{precioVenta.toFixed(2)}
                        </span>
                        {precioVentaOtra !== null && (
                          <span
                            className="text-[10px] mt-0.5"
                            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#6e7681' }}
                          >
                            {otroMonedaSimbolo}{precioVentaOtra.toFixed(2)}
                          </span>
                        )}
                      </div>
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
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
