import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ClipboardPaste, X, ImagePlus, HelpCircle } from 'lucide-react';
import { CampoSeguro } from '@/componentes/ui/CampoSeguro';
import { useAlmacenMoneda } from '@/almacen/almacenMoneda';
import type { ProductoFactura, OpcionIva } from './useEscanerFacturas';
import { calcularFila } from './precioVenta';

// Convierte cualquier blob de imagen a PNG redimensionado a 500px máximo.
function blobAPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const tamanoMaximo = 500;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > tamanoMaximo || h > tamanoMaximo) {
        if (w >= h) { h = Math.round((h * tamanoMaximo) / w); w = tamanoMaximo; }
        else { w = Math.round((w * tamanoMaximo) / h); h = tamanoMaximo; }
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

interface PropsTablaRevisionFactura {
  productos: ProductoFactura[];
  alActualizarFila: (indice: number, cambios: Partial<ProductoFactura>) => void;
  /** Costo corregido a mano: recalcula venta, bulto, descuento y estado */
  alCambiarPrecio: (indice: number, valorCrudo: string) => void;
  alAlternarTodos: (marcado: boolean) => void;
  alFijarIvaTodos: (choice: OpcionIva) => void;
  gananciaGeneral: string;
  onGlobalGananciaChange: (v: string) => void;
  modoGanancia: 'global' | 'individual';
  onGananciaModeChange: (mode: 'global' | 'individual') => void;
  conDescuento: boolean;
  onConDescuentoChange: (on: boolean) => void;
  descuento: string;
  onDescuentoChange: (v: string) => void;
}

// Toggle SÍ / NO para IVA por fila
function SelectorIva({ value, onChange }: { value: OpcionIva; onChange: (v: OpcionIva) => void }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <button
        type="button"
        onClick={() => onChange(value === 'yes' ? null : 'yes')}
        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition"
        style={{
          background: value === 'yes' ? 'rgba(0,154,58,0.18)' : 'transparent',
          color: value === 'yes' ? '#1ebb60' : '#6e7681',
          fontFamily: '"Barlow Condensed", sans-serif',
          letterSpacing: '0.08em',
        }}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'no' ? null : 'no')}
        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition"
        style={{
          background: value === 'no' ? 'rgba(200,16,46,0.18)' : 'transparent',
          color: value === 'no' ? '#ef4444' : '#6e7681',
          fontFamily: '"Barlow Condensed", sans-serif',
          letterSpacing: '0.08em',
        }}
      >
        No
      </button>
    </div>
  );
}

function InsigniaEstado({ estado, precioAnterior, precio, moneda, nombreExistente, matchAproximado }: {
  estado: ProductoFactura['estado'];
  precioAnterior: number | null;
  precio: number;
  moneda: string;
  nombreExistente: string | null;
  matchAproximado: boolean;
}) {
  // Cuando el nombre de la factura no era idéntico al nuestro, se muestra con
  // qué producto se cruzó para poder desmarcar la fila si se equivocó.
  const avisoMatch = matchAproximado && nombreExistente
    ? (
      <span className="text-[9px] whitespace-nowrap" style={{ color: '#fbbf24' }} title={nombreExistente}>
        ≈ {nombreExistente}
      </span>
    )
    : null;

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
        {avisoMatch}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
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
      {avisoMatch}
    </div>
  );
}

interface PropsCeldaFoto {
  fotoUrl: string | null;
  indice: number;
  alCambiarFoto: (indice: number, url: string, blob: Blob) => void;
  alQuitarFoto: (indice: number) => void;
}

function CeldaFoto({ fotoUrl, indice, alCambiarFoto, alQuitarFoto }: PropsCeldaFoto) {
  const refSelector = useRef<HTMLInputElement>(null);
  const refFlotante = useRef<HTMLDivElement>(null);
  const refAreaPegado = useRef<HTMLDivElement>(null);
  const [abierto, fijarAbierto] = useState(false);
  const [ocupado, fijarOcupado] = useState(false);
  const [pegadoEncima, fijarPegadoEncima] = useState(false);

  // Cierra el popover al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const onMouseDown = (e: MouseEvent) => {
      if (refFlotante.current && !refFlotante.current.contains(e.target as Node)) {
        fijarAbierto(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [abierto]);

  // Foco automático del área de pegado al abrir, para que Ctrl+V funcione enseguida
  useEffect(() => {
    if (abierto) refAreaPegado.current?.focus();
  }, [abierto]);

  const procesar = async (raw: Blob) => {
    fijarOcupado(true);
    try {
      const png = await blobAPng(raw);
      const url = URL.createObjectURL(png);
      alCambiarFoto(indice, url, png);
      fijarAbierto(false);
    } catch (err) {
      console.error('Error procesando imagen:', err);
    } finally {
      fijarOcupado(false);
    }
  };

  const alElegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) procesar(file);
  };

  const alPegar = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const elementos = e.clipboardData?.items;
    if (!elementos) return;
    for (const elemento of elementos) {
      if (elemento.type.startsWith('image/')) {
        const blob = elemento.getAsFile();
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
          onClick={() => fijarAbierto((v) => !v)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition"
          style={{
            background: abierto ? 'rgba(0,154,58,0.12)' : '#1c2128',
            border: `1px dashed ${abierto ? 'rgba(0,154,58,0.4)' : 'rgba(255,255,255,0.15)'}`,
            color: abierto ? '#1ebb60' : '#6e7681',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#1ebb60';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,154,58,0.4)';
          }}
          onMouseLeave={(e) => {
            if (!abierto) {
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
        onClick={() => fijarAbierto((v) => !v)}
        className="text-[9px] font-semibold uppercase tracking-wider transition"
        style={{ color: abierto ? '#009A3A' : '#484f58' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#009A3A'; }}
        onMouseLeave={(e) => { if (!abierto) (e.currentTarget as HTMLElement).style.color = '#484f58'; }}
      >
        {fotoUrl ? 'Cambiar' : 'Agregar foto'}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            ref={refFlotante}
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
              onClick={() => refSelector.current?.click()}
              disabled={ocupado}
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
              ref={refAreaPegado}
              tabIndex={0}
              onPaste={alPegar}
              onMouseEnter={() => fijarPegadoEncima(true)}
              onMouseLeave={() => fijarPegadoEncima(false)}
              className="w-full flex flex-col items-center gap-1 px-3 py-4 rounded-lg cursor-text outline-none transition"
              style={{
                border: `1.5px dashed ${pegadoEncima ? '#1ebb60' : 'rgba(255,255,255,0.18)'}`,
                background: pegadoEncima ? 'rgba(0,154,58,0.06)' : 'transparent',
                color: pegadoEncima ? '#1ebb60' : '#8b949e',
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
                onClick={() => { alQuitarFoto(indice); fijarAbierto(false); }}
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

            {ocupado && (
              <p className="text-[10px] text-center text-[#8b949e]">Procesando...</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={refSelector}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={alElegirFoto}
        className="hidden"
      />
    </div>
  );
}

export function TablaRevisionFactura({
  productos,
  alActualizarFila,
  alCambiarPrecio,
  alAlternarTodos,
  alFijarIvaTodos,
  gananciaGeneral,
  onGlobalGananciaChange,
  modoGanancia,
  onGananciaModeChange,
  conDescuento,
  onConDescuentoChange,
  descuento,
  onDescuentoChange,
}: PropsTablaRevisionFactura) {
  const todosMarcados = productos.length > 0 && productos.every((p) => p.seleccionado);
  const algunosMarcados = productos.some((p) => p.seleccionado);
  const cantidadMarcados = productos.filter((p) => p.seleccionado).length;
  const tasa = useAlmacenMoneda((s) => s.tasa);

  // Estado local de strings para no romper la escritura decimal ("30." → no colapsar a "30")
  const [gananciaTexto, fijarGananciaTexto] = React.useState<string[]>(
    () => productos.map((p) => p.ganancia.toString())
  );
  const [precioTexto, fijarPrecioTexto] = React.useState<string[]>(
    () => productos.map((p) => p.precio.toFixed(2))
  );
  // Sincroniza cuando la lista de productos cambia (nuevo escaneo)
  const refLargoPrevio = React.useRef(productos.length);
  React.useEffect(() => {
    if (productos.length !== refLargoPrevio.current) {
      fijarGananciaTexto(productos.map((p) => p.ganancia.toString()));
      fijarPrecioTexto(productos.map((p) => p.precio.toFixed(2)));
      refLargoPrevio.current = productos.length;
    }
  }, [productos]);

  // Re-sincroniza los strings de costo cuando cambia el descuento aplicado
  // (los precios de todas las filas se recalculan en el hook)
  const refProductos = React.useRef(productos);
  refProductos.current = productos;
  const descuentoAplicado = conDescuento ? parseFloat(descuento) || 0 : 0;
  React.useEffect(() => {
    fijarPrecioTexto(refProductos.current.map((p) => p.precio.toFixed(2)));
  }, [descuentoAplicado]);

  const gananciaGlobalNumerica = parseFloat(gananciaGeneral) || 0;

  return (
    <div className="space-y-3">
      {/* Descuento de factura */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <span className="text-[10px] font-black text-[#484f58] uppercase tracking-widest">
          ¿La factura tiene descuento?
        </span>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {([true, false] as const).map((opt) => (
            <button
              key={String(opt)}
              onClick={() => onConDescuentoChange(opt)}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition"
              style={{
                background: conDescuento === opt ? 'rgba(251,191,36,0.15)' : 'transparent',
                color: conDescuento === opt ? '#fbbf24' : '#484f58',
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.08em',
              }}
            >
              {opt ? 'Sí' : 'No'}
            </button>
          ))}
        </div>

        {conDescuento && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            className="flex items-center gap-1.5"
          >
            <div className="w-20">
              <CampoSeguro
                value={descuento}
                onChange={onDescuentoChange}
                inputMode="decimal"
                editable
                sinAnillo
                placeholder="0"
                claseTextoVisible="!min-h-[32px] !py-1 !px-2 !text-sm !rounded-lg !border-white/10"
              />
            </div>
            <span className="text-[#8b949e] text-sm font-bold">%</span>
            {descuentoAplicado > 0 && descuentoAplicado < 100 && (
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}
              >
                Costos rebajados {descuentoAplicado}%
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#8b949e]">
            <span className="font-black text-[#e6edf3]">{cantidadMarcados}</span> de {productos.length} seleccionados
          </span>
          {productos.length > 0 && (
            <button
              onClick={() => alAlternarTodos(!todosMarcados)}
              className="text-xs font-semibold transition px-2 py-1 rounded-lg"
              style={{
                color: algunosMarcados ? '#C8102E' : '#009A3A',
                background: algunosMarcados ? 'rgba(200,16,46,0.07)' : 'rgba(0,154,58,0.07)',
              }}
            >
              {todosMarcados ? 'Desmarcar todo' : 'Seleccionar todo'}
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
                  background: modoGanancia === mode ? 'rgba(0,154,58,0.15)' : 'transparent',
                  color: modoGanancia === mode ? '#009A3A' : '#484f58',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                {mode === 'global' ? 'Global' : 'Individual'}
              </button>
            ))}
          </div>

          {modoGanancia === 'global' && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1"
            >
              <div className="w-20">
                <CampoSeguro
                  value={gananciaGeneral}
                  onChange={onGlobalGananciaChange}
                  inputMode="decimal"
                  editable
                  sinAnillo
                  placeholder="30"
                  claseTextoVisible="!min-h-[32px] !py-1 !px-2 !text-sm !rounded-lg !border-white/10"
                />
              </div>
              <span className="text-[#8b949e] text-sm font-bold">%</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* IVA masivo */}
      {productos.length > 0 && (
        <div className="flex items-center gap-2 px-1 flex-wrap">
          <span className="text-[10px] font-black text-[#484f58] uppercase tracking-widest">IVA:</span>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => alFijarIvaTodos('yes')}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition"
            style={{
              background: 'rgba(0,154,58,0.08)',
              color: '#1ebb60',
              fontFamily: '"Barlow Condensed", sans-serif',
              letterSpacing: '0.08em',
            }}
          >
            Todos con IVA
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => alFijarIvaTodos('no')}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition"
            style={{
              background: 'rgba(200,16,46,0.08)',
              color: '#ef4444',
              fontFamily: '"Barlow Condensed", sans-serif',
              letterSpacing: '0.08em',
            }}
          >
            Todos sin IVA
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => alFijarIvaTodos(null)}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#6e7681',
              fontFamily: '"Barlow Condensed", sans-serif',
              letterSpacing: '0.08em',
            }}
          >
            Limpiar
          </motion.button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead style={{ background: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <tr>
                <th className="h-10 w-10 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={todosMarcados}
                    onChange={(e) => alAlternarTodos(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#009A3A] cursor-pointer"
                  />
                </th>
                <th className="h-10 px-3 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Foto</th>
                <th className="h-10 px-4 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Nombre</th>
                <th className="h-10 px-3 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Precio Costo</th>
                <th className="h-10 px-3 text-right text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">Precio Venta</th>
                <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Moneda</th>
                <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">IVA</th>
                <th className="h-10 px-3 text-left text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle">Estado</th>
                {modoGanancia === 'individual' && (
                  <th className="h-10 px-3 text-center text-[10px] font-black text-[#484f58] uppercase tracking-widest align-middle whitespace-nowrap">% Gan.</th>
                )}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence initial={false}>
                {productos.map((producto, indice) => {
                  const gananciaUsada = modoGanancia === 'global' ? gananciaGlobalNumerica : producto.ganancia;
                  const { precioVenta, costoAGuardar, eligePv, mantienePv, extraPct } =
                    calcularFila(producto, gananciaUsada, descuentoAplicado, tasa);
                  const monedaSimbolo = producto.moneda === 'USD' ? '$' : 'Bs';
                  const otroMonedaSimbolo = producto.moneda === 'USD' ? 'Bs' : '$';
                  let precioVentaOtra: number | null = null;
                  if (tasa > 0) {
                    precioVentaOtra = producto.moneda === 'USD' ? precioVenta * tasa : precioVenta / tasa;
                  }
                  const tieneBulto = producto.cantidadBulto !== null && producto.cantidadBulto > 1;
                  const ivaSinDefinir = producto.opcionIva === null;

                  return (
                  <motion.tr
                    key={`${producto.nombre}-${indice}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: indice * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: !producto.seleccionado
                        ? 'rgba(255,255,255,0.01)'
                        : indice % 2 === 0
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
                        onChange={(e) => alActualizarFila(indice, { seleccionado: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#009A3A] cursor-pointer"
                      />
                    </td>

                    {/* Foto */}
                    <td className="px-3 py-2 align-middle">
                      <CeldaFoto
                        fotoUrl={producto.fotoUrl}
                        indice={indice}
                        alCambiarFoto={(i, url, blob) => alActualizarFila(i, { fotoUrl: url, fotoBlob: blob })}
                        alQuitarFoto={(i) => alActualizarFila(i, { fotoUrl: null, fotoBlob: null })}
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
                          <CampoSeguro
                            value={precioTexto[indice] ?? producto.precio.toFixed(2)}
                            onChange={(v) => {
                              fijarPrecioTexto((prev) => {
                                const next = [...prev];
                                next[indice] = v;
                                return next;
                              });
                              // Recalcula precio de venta, total del bulto,
                              // descuento y estado a partir del valor escrito.
                              // Entiende la coma decimal y no rompe el cálculo
                              // mientras el campo está a medio escribir.
                              alCambiarPrecio(indice, v);
                            }}
                            inputMode="decimal"
                            editable
                            sinAnillo
                            placeholder="0.00"
                            claseTextoVisible="!min-h-[30px] !py-1 !px-2 !text-sm !rounded-lg !border-white/10 !text-right"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Precio Venta (calculado, verde si IVA definido, gris+? si no) */}
                    <td className="px-3 py-3 align-middle text-right">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={producto.opcionIva ?? 'pending'}
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 3 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col items-end leading-tight"
                        >
                          <span
                            className="font-black flex items-center gap-1"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.95rem',
                              color: ivaSinDefinir ? '#6e7681' : '#1ebb60',
                            }}
                            title={ivaSinDefinir ? 'Define el IVA para confirmar el precio final' : undefined}
                          >
                            {monedaSimbolo}{precioVenta.toFixed(2)}
                            {ivaSinDefinir && <HelpCircle size={11} style={{ color: '#fbbf24' }} />}
                          </span>
                          {precioVentaOtra !== null && (
                            <span
                              className="text-[10px] mt-0.5"
                              style={{ fontFamily: '"JetBrains Mono", monospace', color: '#6e7681' }}
                            >
                              {otroMonedaSimbolo}{precioVentaOtra.toFixed(2)}
                            </span>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      {/* Con descuento: elegir si mantener el PV anterior o bajarlo */}
                      {eligePv && (
                        <div className="flex flex-col items-end gap-1 mt-1.5">
                          <div className="inline-flex rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <button
                              type="button"
                              onClick={() => alActualizarFila(indice, { descuentoPv: 'mantener' })}
                              title="Mantener el precio de venta anterior y ganar más en esta factura"
                              className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition"
                              style={{
                                background: mantienePv ? 'rgba(251,191,36,0.18)' : 'transparent',
                                color: mantienePv ? '#fbbf24' : '#6e7681',
                                fontFamily: '"Barlow Condensed", sans-serif',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Mantener
                            </button>
                            <button
                              type="button"
                              onClick={() => alActualizarFila(indice, { descuentoPv: 'bajar' })}
                              title="Bajar el precio de venta con el costo descontado"
                              className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition"
                              style={{
                                background: !mantienePv ? 'rgba(0,154,58,0.18)' : 'transparent',
                                color: !mantienePv ? '#1ebb60' : '#6e7681',
                                fontFamily: '"Barlow Condensed", sans-serif',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Bajar
                            </button>
                          </div>
                          {mantienePv && extraPct > 0 && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}
                            >
                              +{extraPct.toFixed(0)}% extra en esta factura
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Moneda */}
                    <td className="px-3 py-3 align-middle text-center">
                      <span
                        className="inline-flex px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider"
                        style={
                          producto.moneda === 'USD'
                            ? { color: '#60a5fa', background: 'rgba(96,165,250,0.08)' }
                            : { color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }
                        }
                      >
                        {producto.moneda}
                      </span>
                    </td>

                    {/* IVA */}
                    <td className="px-3 py-3 align-middle text-center">
                      <SelectorIva
                        value={producto.opcionIva}
                        onChange={(choice) => alActualizarFila(indice, { opcionIva: choice })}
                      />
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
                          <InsigniaEstado
                            estado={producto.estado}
                            precioAnterior={producto.precioAnterior}
                            precio={costoAGuardar}
                            moneda={producto.moneda}
                            nombreExistente={producto.nombreExistente}
                            matchAproximado={producto.matchAproximado}
                          />
                        </motion.div>
                      </AnimatePresence>
                    </td>

                    {/* Ganancia individual */}
                    {modoGanancia === 'individual' && (
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-16">
                            <CampoSeguro
                              value={gananciaTexto[indice] ?? producto.ganancia.toString()}
                              onChange={(v) => {
                                // Actualiza el string local siempre (mantiene "30." mientras escribe)
                                fijarGananciaTexto((prev) => {
                                  const next = [...prev];
                                  next[indice] = v;
                                  return next;
                                });
                                // Propaga al store solo cuando es un número válido
                                const num = parseFloat(v);
                                if (!isNaN(num) && num >= 0) {
                                  alActualizarFila(indice, { ganancia: num });
                                }
                              }}
                              inputMode="decimal"
                              editable
                              sinAnillo
                              placeholder="30"
                              claseTextoVisible="!min-h-[30px] !py-1 !px-2 !text-xs !rounded-lg !border-white/10 !text-center"
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
