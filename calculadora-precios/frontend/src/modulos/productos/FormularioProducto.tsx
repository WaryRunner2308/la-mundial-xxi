import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, Package, Percent, Store, ChevronDown,
  ImagePlus, Upload, ClipboardPaste, Save, Loader2, Check,
  Camera, Plus, Sparkles, AlertTriangle, Coins,
} from 'lucide-react';
import { useAlmacenProductos } from '../../almacen/almacenProductos';
import { useAlmacenMoneda } from '../../almacen/almacenMoneda';
import { FACTOR_IVA, IVA_PORCENTAJE } from '@/utilidades/iva';
import { useAlmacenProveedores } from '../../almacen/almacenProveedores';
import { ModalConfirmacion } from '../../componentes/ui/ModalConfirmacion';
import { convertirEntradaANumero } from '../../utilidades/decimales';
import { CampoSeguro } from '../../componentes/ui/CampoSeguro';
import { useAlmacenAvisos } from '../../almacen/almacenAvisos';

type Moneda = 'Bs' | 'USD';

interface DatosFormulario {
  nombre: string;
  costo: string;
  moneda: Moneda;
  porcentajeGanancia: string;
  aplicarIVA: boolean;
  photoPreview: string | null;
  idProveedor?: number | null;
  tipoEmpaque: 'unit' | 'bulk';
  unidadesPorBulto: string;
}

interface ResultadosEnVivo {
  precioConIva: number;
  utilidad: number;
  moneda: Moneda;
  precioConIvaConvertido?: number;
  utilidadConvertida?: number;
}

interface PropsFormularioProducto {
  estaAbierto: boolean;
  alCerrar: () => void;
  productoAEditar?: {
    id: number;
    nombre: string;
    costo: number;
    moneda: Moneda;
    porcentajeGanancia: number;
    exentoIva: boolean;
    urlFoto: string;
    idProveedor?: number;
  } | null;
  alGuardar?: () => void;
}

function costoPorUnidad(data: DatosFormulario): number {
  let costo = convertirEntradaANumero(data.costo);
  if (data.tipoEmpaque === 'bulk' && data.unidadesPorBulto) {
    const unidades = convertirEntradaANumero(data.unidadesPorBulto);
    if (unidades > 0) costo = costo / unidades;
  }
  return costo;
}

function calcularEnVivo(
  data: DatosFormulario,
  tasa: number,
  fijarResultadosEnVivo: React.Dispatch<React.SetStateAction<ResultadosEnVivo | null>>
) {
  const costoUnitario = costoPorUnidad(data);
  const profit = convertirEntradaANumero(data.porcentajeGanancia);

  if (costoUnitario <= 0 || profit < 0 || profit >= 100) {
    fijarResultadosEnVivo(null);
    return;
  }

  const divisor = 1 - (profit / 100);
  const precioBase = costoUnitario / divisor;
  const utilidad = precioBase - costoUnitario;
  const precioConIva = data.aplicarIVA ? precioBase * FACTOR_IVA : precioBase;

  let precioConIvaConvertido = precioConIva;
  let utilidadConvertida = utilidad;

  if (tasa > 0) {
    if (data.moneda === 'Bs') {
      precioConIvaConvertido = precioConIva / tasa;
      utilidadConvertida = utilidad / tasa;
    } else {
      precioConIvaConvertido = precioConIva * tasa;
      utilidadConvertida = utilidad * tasa;
    }
  }

  fijarResultadosEnVivo({
    precioConIva: Number(precioConIva.toFixed(2)),
    utilidad: Number(utilidad.toFixed(2)),
    moneda: data.moneda,
    precioConIvaConvertido: Number(precioConIvaConvertido.toFixed(2)),
    utilidadConvertida: Number(utilidadConvertida.toFixed(2)),
  });
}

// ─────────── Helpers de UI ───────────

function blobAPngBase64(blob: Blob, maxWidth = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        else { w = Math.round((w * maxWidth) / h); h = maxWidth; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });
}

function formatearDinero(monto: number, moneda: Moneda): string {
  const simbolo = moneda === 'USD' ? '$' : 'Bs ';
  return `${simbolo}${monto.toFixed(2)}`;
}

// ─────────── Sub-componentes ───────────

interface PropsCampo {
  etiqueta: string;
  required?: boolean;
  icon?: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}

function Campo({ etiqueta, required, icon: Icon, hint, children }: PropsCampo) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={11} style={{ color: '#484f58' }} />}
        <span className="text-[10px] font-black uppercase tracking-widest text-[#484f58]">
          {etiqueta}{required && <span style={{ color: '#C8102E' }}> *</span>}
        </span>
        {hint && <span className="text-[10px] text-[#484f58] normal-case tracking-normal">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SelectorMoneda({ value, onChange }: { value: Moneda; onChange: (v: Moneda) => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
      {(['Bs', 'USD'] as const).map((cur) => (
        <button
          key={cur}
          type="button"
          onClick={() => onChange(cur)}
          className="px-4 py-2 text-sm font-black uppercase tracking-wider transition min-w-[52px]"
          style={{
            background: value === cur ? 'rgba(0,154,58,0.15)' : 'transparent',
            color: value === cur ? '#1ebb60' : '#6e7681',
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.08em',
          }}
        >
          {cur === 'Bs' ? 'Bs' : '$'}
        </button>
      ))}
    </div>
  );
}

function SelectorEmpaque({ value, onChange }: { value: 'unit' | 'bulk'; onChange: (v: 'unit' | 'bulk') => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      {(['unit', 'bulk'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className="flex-1 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition"
          style={{
            background: value === mode ? 'rgba(0,154,58,0.15)' : 'transparent',
            color: value === mode ? '#1ebb60' : '#6e7681',
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.08em',
          }}
        >
          {mode === 'unit' ? 'Unidad' : 'Bulto'}
        </button>
      ))}
    </div>
  );
}

function TarjetaIva({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition"
      style={{
        background: checked ? 'rgba(0,154,58,0.07)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${checked ? 'rgba(0,154,58,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition"
        style={{
          background: checked ? '#009A3A' : 'transparent',
          border: `1.5px solid ${checked ? '#009A3A' : 'rgba(255,255,255,0.2)'}`,
        }}
      >
        {checked && <Check size={12} color="white" strokeWidth={3} />}
      </div>
      <span className="flex-1 text-left text-sm font-semibold" style={{ color: checked ? '#e6edf3' : '#8b949e' }}>
        Aplicar IVA ({IVA_PORCENTAJE})
      </span>
      <span
        className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full"
        style={{
          color: checked ? '#1ebb60' : '#484f58',
          background: checked ? 'rgba(0,154,58,0.12)' : 'rgba(255,255,255,0.04)',
          fontFamily: '"Barlow Condensed", sans-serif',
        }}
      >
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

// ─── Provider Selector (estilo dropdown del InvoicePage) ───

interface PropsSelectorProveedor {
  idProveedor: number | null | undefined;
  alSeleccionar: (id: number | null) => void;
}

function SelectorProveedor({ idProveedor, alSeleccionar }: PropsSelectorProveedor) {
  const { proveedores, agregarProveedor } = useAlmacenProveedores();
  const [abierto, fijarAbierto] = useState(false);
  const [nuevoNombre, fijarNuevoNombre] = useState('');
  const [creando, fijarCreando] = useState(false);
  const [mostrarNuevo, fijarMostrarNuevo] = useState(false);
  const refDesplegable = useRef<HTMLDivElement | null>(null);
  const refInput = useRef<HTMLInputElement | null>(null);

  const marcado = proveedores.find((p) => p.id === idProveedor) ?? null;

  useEffect(() => {
    const alHacerClic = (e: MouseEvent) => {
      if (refDesplegable.current && !refDesplegable.current.contains(e.target as Node)) {
        fijarAbierto(false);
        fijarMostrarNuevo(false);
      }
    };
    if (abierto) document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
  }, [abierto]);

  const alCrearProveedor = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    fijarCreando(true);
    try {
      const nuevo = await agregarProveedor(nombre);
      alSeleccionar(nuevo.id);
      fijarNuevoNombre('');
      fijarMostrarNuevo(false);
      fijarAbierto(false);
    } catch {
      useAlmacenAvisos.getState().mostrar('No se pudo crear el proveedor. Inténtalo de nuevo.', 'error');
    } finally {
      fijarCreando(false);
    }
  };

  return (
    <div ref={refDesplegable} className="relative">
      <button
        type="button"
        onClick={() => fijarAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm transition"
        style={{
          background: '#1c2128',
          border: '1px solid rgba(255,255,255,0.1)',
          color: marcado ? '#e6edf3' : '#6e7681',
          minHeight: '48px',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {marcado ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase"
                style={{ background: 'rgba(0,154,58,0.15)', color: '#1ebb60' }}
              >
                {marcado.name.charAt(0)}
              </div>
              <span className="truncate font-semibold" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                {marcado.name}
              </span>
            </>
          ) : (
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
              Seleccionar proveedor
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className="transition-transform flex-shrink-0"
          style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', color: '#484f58' }}
        />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden"
            style={{
              background: '#1c2128',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            }}
          >
            <button
              type="button"
              onClick={() => { alSeleccionar(null); fijarAbierto(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
              style={{ color: idProveedor == null ? '#1ebb60' : '#8b949e' }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={10} />
              </div>
              <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>Sin proveedor</span>
              {idProveedor == null && <span className="ml-auto text-[#1ebb60] text-xs">✓</span>}
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            <div className="max-h-52 overflow-y-auto py-1">
              {proveedores.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#484f58]">No hay proveedores registrados</p>
              ) : (
                proveedores.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { alSeleccionar(p.id); fijarAbierto(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
                    style={{ color: idProveedor === p.id ? '#1ebb60' : '#e6edf3' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black uppercase"
                      style={{
                        background: idProveedor === p.id ? 'rgba(0,154,58,0.2)' : 'rgba(255,255,255,0.08)',
                        color: idProveedor === p.id ? '#1ebb60' : '#484f58',
                      }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <span className="flex-1 truncate" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                      {p.name}
                    </span>
                    {idProveedor === p.id && <span className="ml-auto text-[#1ebb60] text-xs">✓</span>}
                  </button>
                ))
              )}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {!mostrarNuevo ? (
              <button
                type="button"
                onClick={() => { fijarMostrarNuevo(true); setTimeout(() => refInput.current?.focus(), 50); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
                style={{ color: '#1ebb60' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,154,58,0.12)', border: '1px solid rgba(0,154,58,0.2)' }}>
                  <Plus size={10} style={{ color: '#1ebb60' }} />
                </div>
                <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                  Agregar nuevo proveedor
                </span>
              </button>
            ) : (
              <div className="px-3 py-2.5 flex items-center gap-2">
                <input
                  ref={refInput}
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => fijarNuevoNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') alCrearProveedor(); if (e.key === 'Escape') { fijarMostrarNuevo(false); fijarNuevoNombre(''); } }}
                  placeholder="Nombre del proveedor"
                  className="flex-1 bg-transparent text-sm text-[#e6edf3] outline-none placeholder-[#484f58]"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                />
                <button
                  type="button"
                  onClick={alCrearProveedor}
                  disabled={!nuevoNombre.trim() || creando}
                  className="px-2.5 py-1 rounded-lg text-xs font-black uppercase transition disabled:opacity-40"
                  style={{
                    background: 'rgba(0,154,58,0.15)',
                    color: '#1ebb60',
                    border: '1px solid rgba(0,154,58,0.2)',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.05em',
                  }}
                >
                  {creando ? '...' : 'Crear'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Photo Uploader (subir o pegar) ───

interface PropsSubidorFoto {
  vistaPrevia: string | null;
  onChange: (base64: string) => void;
  onClear: () => void;
}

function SubidorFoto({ vistaPrevia, onChange, onClear }: PropsSubidorFoto) {
  const refSelector = useRef<HTMLInputElement>(null);
  const refPegado = useRef<HTMLDivElement>(null);
  const [ocupado, fijarOcupado] = useState(false);
  const [pegadoEncima, fijarPegadoEncima] = useState(false);

  const procesar = async (blob: Blob) => {
    fijarOcupado(true);
    try {
      const base64 = await blobAPngBase64(blob, 500);
      onChange(base64);
    } catch (err) {
      console.error('Error procesando imagen:', err);
      useAlmacenAvisos.getState().mostrar('Error al procesar la imagen. Intenta con otra.', 'error');
    } finally {
      fijarOcupado(false);
    }
  };

  const alElegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) procesar(f);
  };

  const alPegar = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const elementos = e.clipboardData?.items;
    if (!elementos) return;
    for (const elemento of elementos) {
      if (elemento.type.startsWith('image/')) {
        const blob = elemento.getAsFile();
        if (blob) { e.preventDefault(); procesar(blob); return; }
      }
    }
  };

  return (
    <div className="flex gap-3 items-stretch">
      {/* Preview */}
      <div className="flex-shrink-0">
        {vistaPrevia ? (
          <div className="relative w-[104px] h-[104px]">
            <img
              src={vistaPrevia}
              alt=""
              className="w-full h-full rounded-2xl object-cover"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition"
              style={{ background: '#C8102E', color: 'white', boxShadow: '0 2px 8px rgba(200,16,46,0.5)' }}
            >
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <div
            className="w-[104px] h-[104px] rounded-2xl flex items-center justify-center"
            style={{
              background: '#0d1117',
              border: '1px dashed rgba(255,255,255,0.15)',
              color: '#484f58',
            }}
          >
            <Camera size={28} />
          </div>
        )}
      </div>

      {/* Opciones */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <button
          type="button"
          onClick={() => refSelector.current?.click()}
          disabled={ocupado}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black transition disabled:opacity-50"
          style={{
            background: 'rgba(0,154,58,0.1)',
            border: '1px solid rgba(0,154,58,0.2)',
            color: '#1ebb60',
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.08em',
          }}
        >
          <Upload size={13} />
          SUBIR ARCHIVO
        </button>

        <div
          ref={refPegado}
          tabIndex={0}
          onPaste={alPegar}
          onMouseEnter={() => fijarPegadoEncima(true)}
          onMouseLeave={() => fijarPegadoEncima(false)}
          className="flex-1 w-full flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl cursor-text outline-none transition"
          style={{
            border: `1.5px dashed ${pegadoEncima ? '#1ebb60' : 'rgba(255,255,255,0.15)'}`,
            background: pegadoEncima ? 'rgba(0,154,58,0.05)' : 'transparent',
            color: pegadoEncima ? '#1ebb60' : '#8b949e',
            minHeight: '52px',
          }}
        >
          <ClipboardPaste size={14} />
          <span
            className="text-[10px] font-black uppercase"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.07em' }}
          >
            Pegar (Ctrl+V)
          </span>
        </div>
        {ocupado && (
          <span className="text-[10px] text-[#8b949e] text-center">Procesando…</span>
        )}
      </div>

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

// ─── Live Preview ───

interface PropsVistaPreviaEnVivo {
  resultados: ResultadosEnVivo;
  tasa: number;
}

function VistaPreviaEnVivo({ resultados, tasa }: PropsVistaPreviaEnVivo) {
  const otraMoneda: Moneda = resultados.moneda === 'USD' ? 'Bs' : 'USD';
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,154,58,0.08), rgba(30,187,96,0.03))',
        border: '1px solid rgba(0,154,58,0.18)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #009A3A, #1ebb60, transparent)' }}
      />
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={13} style={{ color: '#1ebb60' }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#1ebb60', fontFamily: '"Barlow Condensed", sans-serif' }}
        >
          Cálculo en vivo
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#6e7681]">Precio Final</p>
          <p
            className="font-black leading-none"
            style={{ color: '#1ebb60', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.55rem' }}
          >
            {formatearDinero(resultados.precioConIva, resultados.moneda)}
          </p>
          {tasa > 0 && resultados.precioConIvaConvertido !== undefined && (
            <p
              className="text-[11px]"
              style={{ color: '#6e7681', fontFamily: '"JetBrains Mono", monospace' }}
            >
              ≈ {formatearDinero(resultados.precioConIvaConvertido, otraMoneda)}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#6e7681]">Ganancia</p>
          <p
            className="font-black leading-none"
            style={{ color: '#fbbf24', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.55rem' }}
          >
            {formatearDinero(resultados.utilidad, resultados.moneda)}
          </p>
          {tasa > 0 && resultados.utilidadConvertida !== undefined && (
            <p
              className="text-[11px]"
              style={{ color: '#6e7681', fontFamily: '"JetBrains Mono", monospace' }}
            >
              ≈ {formatearDinero(resultados.utilidadConvertida, otraMoneda)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── Componente Principal ───────────

export function FormularioProducto({ estaAbierto, alCerrar, productoAEditar, alGuardar }: PropsFormularioProducto) {
  const { cargarProveedores } = useAlmacenProveedores();
  const [datosFormulario, fijarDatosFormulario] = useState<DatosFormulario>({
    nombre: '',
    costo: '',
    moneda: 'Bs',
    porcentajeGanancia: '',
    aplicarIVA: false,
    photoPreview: null,
    idProveedor: undefined,
    tipoEmpaque: 'unit',
    unidadesPorBulto: '',
  });
  const [resultadosEnVivo, fijarResultadosEnVivo] = useState<ResultadosEnVivo | null>(null);
  const [enviando, fijarEnviando] = useState(false);
  const [mostrarConfirmacion, fijarMostrarConfirmacion] = useState(false);

  const tasa = useAlmacenMoneda((estado) => estado.tasa);
  const agregarProducto = useAlmacenProductos((estado) => estado.agregarProducto);
  const actualizarProducto = useAlmacenProductos((estado) => estado.actualizarProducto);

  const limpiarFormulario = () => {
    fijarDatosFormulario({
      nombre: '',
      costo: '',
      moneda: 'Bs',
      porcentajeGanancia: '',
      aplicarIVA: false,
      photoPreview: null,
      idProveedor: undefined,
      tipoEmpaque: 'unit',
      unidadesPorBulto: '',
    });
    fijarResultadosEnVivo(null);
  };

  useEffect(() => {
    if (estaAbierto) {
      cargarProveedores().catch(() => {
        console.warn('No se pudieron cargar proveedores');
      });
    }
  }, [estaAbierto, cargarProveedores]);

  useEffect(() => {
    if (estaAbierto && productoAEditar) {
      const datosAAplicar: DatosFormulario = {
        nombre: productoAEditar.nombre,
        costo: productoAEditar.costo.toString(),
        moneda: productoAEditar.moneda,
        porcentajeGanancia: productoAEditar.porcentajeGanancia.toString(),
        aplicarIVA: !productoAEditar.exentoIva,
        photoPreview: productoAEditar.urlFoto || null,
        idProveedor: productoAEditar.idProveedor,
        tipoEmpaque: 'unit',
        unidadesPorBulto: '',
      };
      fijarDatosFormulario(datosAAplicar);
      calcularEnVivo(datosAAplicar, tasa, fijarResultadosEnVivo);
    } else if (estaAbierto) {
      limpiarFormulario();
    }
  }, [estaAbierto, productoAEditar, tasa]);

  const alCambiarNombre = (value: string) => {
    fijarDatosFormulario(prev => ({ ...prev, nombre: value }));
    calcularEnVivo({ ...datosFormulario, nombre: value }, tasa, fijarResultadosEnVivo);
  };

  const alCambiarCosto = (value: string) => {
    fijarDatosFormulario(prev => ({ ...prev, costo: value }));
    calcularEnVivo({ ...datosFormulario, costo: value }, tasa, fijarResultadosEnVivo);
  };

  const alCambiarGanancia = (value: string) => {
    fijarDatosFormulario(prev => ({ ...prev, porcentajeGanancia: value }));
    calcularEnVivo({ ...datosFormulario, porcentajeGanancia: value }, tasa, fijarResultadosEnVivo);
  };

  const alCambiarUnidades = (value: string) => {
    fijarDatosFormulario(prev => ({ ...prev, unidadesPorBulto: value }));
    calcularEnVivo({ ...datosFormulario, unidadesPorBulto: value }, tasa, fijarResultadosEnVivo);
  };

  const alCambiarMoneda = (newCurrency: Moneda) => {
    fijarDatosFormulario(prev => ({ ...prev, moneda: newCurrency }));
    calcularEnVivo({ ...datosFormulario, moneda: newCurrency }, tasa, fijarResultadosEnVivo);
  };

  const alCambiarEmpaque = (value: 'unit' | 'bulk') => {
    fijarDatosFormulario(prev => ({
      ...prev,
      tipoEmpaque: value,
      unidadesPorBulto: value === 'unit' ? '' : prev.unidadesPorBulto,
    }));
  };

  const alAlternarIva = (valorNuevo: boolean) => {
    fijarDatosFormulario(prev => ({ ...prev, aplicarIVA: valorNuevo }));
    calcularEnVivo({ ...datosFormulario, aplicarIVA: valorNuevo }, tasa, fijarResultadosEnVivo);
  };

  const alRecibirFotoBase64 = (base64: string) => {
    fijarDatosFormulario(prev => ({ ...prev, photoPreview: base64 }));
  };

  const alQuitarFoto = () => {
    fijarDatosFormulario(prev => ({ ...prev, photoPreview: null }));
  };

  const alCancelar = () => {
    const hayDatos = datosFormulario.nombre.trim() !== '' || datosFormulario.costo !== '' || datosFormulario.porcentajeGanancia !== '';
    if (!hayDatos) {
      alCerrar();
    } else {
      fijarMostrarConfirmacion(true);
    }
  };

  const alConfirmarCancelar = () => {
    limpiarFormulario();
    fijarMostrarConfirmacion(false);
    alCerrar();
  };

  const alSeguirEditando = () => {
    fijarMostrarConfirmacion(false);
  };

  const enviarFormulario = async () => {
    const faltantes: string[] = [];
    if (!datosFormulario.nombre) faltantes.push('Nombre');
    if (!datosFormulario.costo) faltantes.push('Costo');
    if (!datosFormulario.porcentajeGanancia) faltantes.push('% de ganancia');
    if (faltantes.length > 0) {
      useAlmacenAvisos.getState().mostrar(`Falta completar: ${faltantes.join(', ')}`, 'error');
      return;
    }

    const costoUnitario = costoPorUnidad(datosFormulario);
    const profit = convertirEntradaANumero(datosFormulario.porcentajeGanancia);

    fijarEnviando(true);
    try {
      if (productoAEditar) {
        await actualizarProducto(productoAEditar.id, {
          nombre: datosFormulario.nombre,
          costo: costoUnitario,
          moneda: datosFormulario.moneda,
          porcentajeGanancia: profit,
          exentoIva: !datosFormulario.aplicarIVA,
          urlFoto: datosFormulario.photoPreview || null,
          idProveedor: datosFormulario.idProveedor,
        });
      } else {
        await agregarProducto({
          nombre: datosFormulario.nombre,
          costo: costoUnitario,
          moneda: datosFormulario.moneda,
          porcentajeGanancia: profit,
          exentoIva: !datosFormulario.aplicarIVA,
          urlFoto: datosFormulario.photoPreview || null,
          idProveedor: datosFormulario.idProveedor,
        });
      }
      alGuardar?.();
      alCerrar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido.';
      console.error('Error al guardar producto:', error);
      useAlmacenAvisos.getState().mostrar(`No se pudo guardar el producto: ${mensaje}`, 'error');
    } finally {
      fijarEnviando(false);
    }
  };

  const hintCostoUnitario =
    datosFormulario.tipoEmpaque === 'bulk' &&
    datosFormulario.costo &&
    datosFormulario.unidadesPorBulto &&
    convertirEntradaANumero(datosFormulario.unidadesPorBulto) > 0
      ? costoPorUnidad(datosFormulario)
      : null;

  return (
    <>
      <AnimatePresence>
        {estaAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={alCancelar}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
              style={{
                background: '#161b22',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Strip Portugal */}
              <div className="flex h-[2px] flex-shrink-0">
                <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
                <div style={{ flex: 3, background: '#C8102E' }} />
              </div>

              {/* Header */}
              <div
                className="px-6 py-5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#484f58]">
                    {productoAEditar ? 'Modificar' : 'Crear nuevo'}
                  </p>
                  <h2
                    className="font-black uppercase text-[#e6edf3] leading-none mt-1"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '1.75rem',
                      letterSpacing: '0.07em',
                    }}
                  >
                    {productoAEditar ? 'Editar' : 'Nuevo'}{' '}
                    <span style={{ color: '#009A3A' }}>Producto</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={alCancelar}
                  className="p-2 rounded-xl transition flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#e6edf3';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#8b949e';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <Campo icon={Tag} etiqueta="Nombre del producto" required>
                  <CampoSeguro
                    value={datosFormulario.nombre}
                    onChange={alCambiarNombre}
                    alEnviar={enviarFormulario}
                    placeholder="Ej: Malta 1.5L"
                    inputMode="text"
                    editable
                    claseTextoVisible="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                  />
                </Campo>

                <Campo icon={Coins} etiqueta="Costo" required>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CampoSeguro
                        value={datosFormulario.costo}
                        onChange={alCambiarCosto}
                        alEnviar={enviarFormulario}
                        placeholder="0.00"
                        inputMode="decimal"
                        editable
                        claseTextoVisible="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                      />
                    </div>
                    <SelectorMoneda value={datosFormulario.moneda} onChange={alCambiarMoneda} />
                  </div>
                </Campo>

                <Campo icon={Package} etiqueta="Tipo de empaque">
                  <SelectorEmpaque value={datosFormulario.tipoEmpaque} onChange={alCambiarEmpaque} />
                  <AnimatePresence>
                    {datosFormulario.tipoEmpaque === 'bulk' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <CampoSeguro
                          value={datosFormulario.unidadesPorBulto}
                          onChange={alCambiarUnidades}
                          alEnviar={enviarFormulario}
                          placeholder="Unidades por bulto (ej: 12)"
                          inputMode="numeric"
                          editable
                          claseTextoVisible="!min-h-[42px] !py-2 !rounded-xl !text-sm"
                        />
                        {hintCostoUnitario !== null && (
                          <p
                            className="mt-2 text-[11px] flex items-center gap-1.5"
                            style={{ color: '#1ebb60', fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            <span>↳</span> Costo unitario: {formatearDinero(hintCostoUnitario, datosFormulario.moneda)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Campo>

                <Campo icon={Percent} etiqueta="% Ganancia" required>
                  <CampoSeguro
                    value={datosFormulario.porcentajeGanancia}
                    onChange={alCambiarGanancia}
                    alEnviar={enviarFormulario}
                    placeholder="Ej: 30"
                    inputMode="decimal"
                    editable
                    claseTextoVisible="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                  />
                </Campo>

                <Campo icon={Store} etiqueta="Proveedor">
                  <SelectorProveedor
                    idProveedor={datosFormulario.idProveedor ?? null}
                    alSeleccionar={(id) => fijarDatosFormulario(prev => ({ ...prev, idProveedor: id }))}
                  />
                </Campo>

                <TarjetaIva checked={datosFormulario.aplicarIVA} onChange={alAlternarIva} />

                <Campo icon={ImagePlus} etiqueta="Foto del producto" hint="opcional">
                  <SubidorFoto
                    vistaPrevia={datosFormulario.photoPreview}
                    onChange={alRecibirFotoBase64}
                    onClear={alQuitarFoto}
                  />
                </Campo>

                {resultadosEnVivo && tasa > 0 && <VistaPreviaEnVivo resultados={resultadosEnVivo} tasa={tasa} />}

                {resultadosEnVivo && tasa === 0 && (
                  <div
                    className="flex gap-2.5 p-3 rounded-xl"
                    style={{
                      background: 'rgba(251,191,36,0.06)',
                      border: '1px solid rgba(251,191,36,0.18)',
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-[11px]" style={{ color: '#fbbf24' }}>
                      Tasa de cambio no configurada — solo se muestran valores en la moneda original.
                    </p>
                  </div>
                )}

                {/* Padding inferior para que el scroll no quede pegado al borde */}
                <div className="h-2" />
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex gap-3 flex-shrink-0"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.25)',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={alCancelar}
                  disabled={enviando}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    color: '#8b949e',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  CANCELAR
                </motion.button>

                <motion.button
                  whileHover={!enviando ? { scale: 1.02, y: -1 } : undefined}
                  whileTap={!enviando ? { scale: 0.97 } : undefined}
                  type="button"
                  onClick={enviarFormulario}
                  disabled={enviando}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition disabled:cursor-wait"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                    boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                    opacity: enviando ? 0.85 : 1,
                  }}
                >
                  {enviando ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      GUARDANDO...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      {productoAEditar ? 'ACTUALIZAR' : 'GUARDAR'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalConfirmacion
        estaAbierto={mostrarConfirmacion}
        titulo="Confirmar cancelación"
        mensaje="¿Estás seguro de cancelar? Se perderán los datos ingresados."
        textoConfirmar="Sí, cancelar"
        textoCancelar="Continuar editando"
        alConfirmar={alConfirmarCancelar}
        alCancelar={alSeguirEditando}
      />
    </>
  );
}
