import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, Package, Percent, Store, ChevronDown,
  ImagePlus, Upload, ClipboardPaste, Save, Loader2, Check,
  Camera, Plus, Sparkles, AlertTriangle, Coins,
} from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useProviderStore } from '../../store/providerStore';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { parseNumericInput } from '../../utils/validateDecimal';
import { SecureInput } from '../../components/ui/SecureInput';

type Currency = 'Bs' | 'USD';

interface FormData {
  name: string;
  cost: string;
  currency: Currency;
  profitPercentage: string;
  aplicarIVA: boolean;
  photoPreview: string | null;
  providerId?: number | null;
  packageType: 'unit' | 'bulk';
  unitsPerBulk: string;
}

interface LiveResults {
  priceWithVAT: number;
  utility: number;
  currency: Currency;
  priceWithVATConverted?: number;
  utilityConverted?: number;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: {
    id: number;
    name: string;
    cost: number;
    currency: Currency;
    profitPercentage: number;
    exemptFromVAT: boolean;
    photoUrl: string;
    providerId?: number;
  } | null;
  onSave?: () => void;
}

function getCostPerUnit(data: FormData): number {
  let cost = parseNumericInput(data.cost);
  if (data.packageType === 'bulk' && data.unitsPerBulk) {
    const units = parseNumericInput(data.unitsPerBulk);
    if (units > 0) cost = cost / units;
  }
  return cost;
}

function calculateLive(
  data: FormData,
  rate: number,
  setLiveResults: React.Dispatch<React.SetStateAction<LiveResults | null>>
) {
  const costPerUnit = getCostPerUnit(data);
  const profit = parseNumericInput(data.profitPercentage);

  if (costPerUnit <= 0 || profit < 0 || profit >= 100) {
    setLiveResults(null);
    return;
  }

  const divisor = 1 - (profit / 100);
  const priceBase = costPerUnit / divisor;
  const utility = priceBase - costPerUnit;
  const priceWithVAT = data.aplicarIVA ? priceBase * 1.16 : priceBase;

  let priceWithVATConverted = priceWithVAT;
  let utilityConverted = utility;

  if (rate > 0) {
    if (data.currency === 'Bs') {
      priceWithVATConverted = priceWithVAT / rate;
      utilityConverted = utility / rate;
    } else {
      priceWithVATConverted = priceWithVAT * rate;
      utilityConverted = utility * rate;
    }
  }

  setLiveResults({
    priceWithVAT: Number(priceWithVAT.toFixed(2)),
    utility: Number(utility.toFixed(2)),
    currency: data.currency,
    priceWithVATConverted: Number(priceWithVATConverted.toFixed(2)),
    utilityConverted: Number(utilityConverted.toFixed(2)),
  });
}

// ─────────── Helpers de UI ───────────

function blobToPngBase64(blob: Blob, maxWidth = 500): Promise<string> {
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

function formatMoney(amount: number, currency: Currency): string {
  const symbol = currency === 'USD' ? '$' : 'Bs ';
  return `${symbol}${amount.toFixed(2)}`;
}

// ─────────── Sub-componentes ───────────

interface FieldProps {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, icon: Icon, hint, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={11} style={{ color: '#484f58' }} />}
        <span className="text-[10px] font-black uppercase tracking-widest text-[#484f58]">
          {label}{required && <span style={{ color: '#C8102E' }}> *</span>}
        </span>
        {hint && <span className="text-[10px] text-[#484f58] normal-case tracking-normal">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (v: Currency) => void }) {
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

function PackageToggle({ value, onChange }: { value: 'unit' | 'bulk'; onChange: (v: 'unit' | 'bulk') => void }) {
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

function IvaCard({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
        Aplicar IVA (16%)
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

interface ProviderPickerProps {
  providerId: number | null | undefined;
  onSelect: (id: number | null) => void;
}

function ProviderPicker({ providerId, onSelect }: ProviderPickerProps) {
  const { providers, addProvider } = useProviderStore();
  const [open, setOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = providers.find((p) => p.id === providerId) ?? null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNew(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleCrear = async () => {
    const name = nuevoNombre.trim();
    if (!name) return;
    setCreando(true);
    try {
      const nuevo = await addProvider(name);
      onSelect(nuevo.id);
      setNuevoNombre('');
      setShowNew(false);
      setOpen(false);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm transition"
        style={{
          background: '#1c2128',
          border: '1px solid rgba(255,255,255,0.1)',
          color: selected ? '#e6edf3' : '#6e7681',
          minHeight: '48px',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {selected ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase"
                style={{ background: 'rgba(0,154,58,0.15)', color: '#1ebb60' }}
              >
                {selected.name.charAt(0)}
              </div>
              <span className="truncate font-semibold" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                {selected.name}
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
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#484f58' }}
        />
      </button>

      <AnimatePresence>
        {open && (
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
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
              style={{ color: providerId == null ? '#1ebb60' : '#8b949e' }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={10} />
              </div>
              <span style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>Sin proveedor</span>
              {providerId == null && <span className="ml-auto text-[#1ebb60] text-xs">✓</span>}
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            <div className="max-h-52 overflow-y-auto py-1">
              {providers.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#484f58]">No hay proveedores registrados</p>
              ) : (
                providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSelect(p.id); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition hover:bg-white/5"
                    style={{ color: providerId === p.id ? '#1ebb60' : '#e6edf3' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black uppercase"
                      style={{
                        background: providerId === p.id ? 'rgba(0,154,58,0.2)' : 'rgba(255,255,255,0.08)',
                        color: providerId === p.id ? '#1ebb60' : '#484f58',
                      }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <span className="flex-1 truncate" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.03em' }}>
                      {p.name}
                    </span>
                    {providerId === p.id && <span className="ml-auto text-[#1ebb60] text-xs">✓</span>}
                  </button>
                ))
              )}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

            {!showNew ? (
              <button
                type="button"
                onClick={() => { setShowNew(true); setTimeout(() => inputRef.current?.focus(), 50); }}
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
                  ref={inputRef}
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCrear(); if (e.key === 'Escape') { setShowNew(false); setNuevoNombre(''); } }}
                  placeholder="Nombre del proveedor"
                  className="flex-1 bg-transparent text-sm text-[#e6edf3] outline-none placeholder-[#484f58]"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                />
                <button
                  type="button"
                  onClick={handleCrear}
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

interface PhotoUploaderProps {
  preview: string | null;
  onChange: (base64: string) => void;
  onClear: () => void;
}

function PhotoUploader({ preview, onChange, onClear }: PhotoUploaderProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [pasteHover, setPasteHover] = useState(false);

  const procesar = async (blob: Blob) => {
    setBusy(true);
    try {
      const base64 = await blobToPngBase64(blob, 500);
      onChange(base64);
    } catch (err) {
      console.error('Error procesando imagen:', err);
      alert('Error al procesar la imagen. Intenta con otra.');
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) procesar(f);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) { e.preventDefault(); procesar(blob); return; }
      }
    }
  };

  return (
    <div className="flex gap-3 items-stretch">
      {/* Preview */}
      <div className="flex-shrink-0">
        {preview ? (
          <div className="relative w-[104px] h-[104px]">
            <img
              src={preview}
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
          onClick={() => pickerRef.current?.click()}
          disabled={busy}
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
          ref={pasteRef}
          tabIndex={0}
          onPaste={handlePaste}
          onMouseEnter={() => setPasteHover(true)}
          onMouseLeave={() => setPasteHover(false)}
          className="flex-1 w-full flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl cursor-text outline-none transition"
          style={{
            border: `1.5px dashed ${pasteHover ? '#1ebb60' : 'rgba(255,255,255,0.15)'}`,
            background: pasteHover ? 'rgba(0,154,58,0.05)' : 'transparent',
            color: pasteHover ? '#1ebb60' : '#8b949e',
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
        {busy && (
          <span className="text-[10px] text-[#8b949e] text-center">Procesando…</span>
        )}
      </div>

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

// ─── Live Preview ───

interface LivePreviewProps {
  results: LiveResults;
  rate: number;
}

function LivePreview({ results, rate }: LivePreviewProps) {
  const otraCurrency: Currency = results.currency === 'USD' ? 'Bs' : 'USD';
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
            {formatMoney(results.priceWithVAT, results.currency)}
          </p>
          {rate > 0 && results.priceWithVATConverted !== undefined && (
            <p
              className="text-[11px]"
              style={{ color: '#6e7681', fontFamily: '"JetBrains Mono", monospace' }}
            >
              ≈ {formatMoney(results.priceWithVATConverted, otraCurrency)}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#6e7681]">Ganancia</p>
          <p
            className="font-black leading-none"
            style={{ color: '#fbbf24', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.55rem' }}
          >
            {formatMoney(results.utility, results.currency)}
          </p>
          {rate > 0 && results.utilityConverted !== undefined && (
            <p
              className="text-[11px]"
              style={{ color: '#6e7681', fontFamily: '"JetBrains Mono", monospace' }}
            >
              ≈ {formatMoney(results.utilityConverted, otraCurrency)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── Componente Principal ───────────

export function ProductForm({ isOpen, onClose, productToEdit, onSave }: ProductFormProps) {
  const { providers, fetchProviders } = useProviderStore();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cost: '',
    currency: 'Bs',
    profitPercentage: '',
    aplicarIVA: false,
    photoPreview: null,
    providerId: undefined,
    packageType: 'unit',
    unitsPerBulk: '',
  });
  const [liveResults, setLiveResults] = useState<LiveResults | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const rate = useCurrencyStore((state) => state.rate);
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      currency: 'Bs',
      profitPercentage: '',
      aplicarIVA: false,
      photoPreview: null,
      providerId: undefined,
      packageType: 'unit',
      unitsPerBulk: '',
    });
    setLiveResults(null);
  };

  useEffect(() => {
    if (isOpen) {
      fetchProviders().catch(() => {
        console.warn('No se pudieron cargar proveedores');
      });
    }
  }, [isOpen, fetchProviders]);

  useEffect(() => {
    if (isOpen && productToEdit) {
      const formDataToSet: FormData = {
        name: productToEdit.name,
        cost: productToEdit.cost.toString(),
        currency: productToEdit.currency,
        profitPercentage: productToEdit.profitPercentage.toString(),
        aplicarIVA: !productToEdit.exemptFromVAT,
        photoPreview: productToEdit.photoUrl || null,
        providerId: productToEdit.providerId,
        packageType: 'unit',
        unitsPerBulk: '',
      };
      setFormData(formDataToSet);
      calculateLive(formDataToSet, rate, setLiveResults);
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, productToEdit, rate]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    calculateLive({ ...formData, name: value }, rate, setLiveResults);
  };

  const handleCostChange = (value: string) => {
    setFormData(prev => ({ ...prev, cost: value }));
    calculateLive({ ...formData, cost: value }, rate, setLiveResults);
  };

  const handleProfitChange = (value: string) => {
    setFormData(prev => ({ ...prev, profitPercentage: value }));
    calculateLive({ ...formData, profitPercentage: value }, rate, setLiveResults);
  };

  const handleUnitsChange = (value: string) => {
    setFormData(prev => ({ ...prev, unitsPerBulk: value }));
    calculateLive({ ...formData, unitsPerBulk: value }, rate, setLiveResults);
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    calculateLive({ ...formData, currency: newCurrency }, rate, setLiveResults);
  };

  const handlePackageTypeChange = (value: 'unit' | 'bulk') => {
    setFormData(prev => ({
      ...prev,
      packageType: value,
      unitsPerBulk: value === 'unit' ? '' : prev.unitsPerBulk,
    }));
  };

  const handleIvaToggle = (newValue: boolean) => {
    setFormData(prev => ({ ...prev, aplicarIVA: newValue }));
    calculateLive({ ...formData, aplicarIVA: newValue }, rate, setLiveResults);
  };

  const handlePhotoBase64 = (base64: string) => {
    setFormData(prev => ({ ...prev, photoPreview: base64 }));
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoPreview: null }));
  };

  const handleCancel = () => {
    const hasData = formData.name.trim() !== '' || formData.cost !== '' || formData.profitPercentage !== '';
    if (!hasData) {
      onClose();
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmCancel = () => {
    resetForm();
    setShowConfirm(false);
    onClose();
  };

  const handleContinueEdit = () => {
    setShowConfirm(false);
  };

  const submitForm = async () => {
    if (!formData.name || !formData.cost || !formData.profitPercentage) {
      alert('Complete todos los campos requeridos');
      return;
    }

    const costPerUnit = getCostPerUnit(formData);
    const profit = parseNumericInput(formData.profitPercentage);

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: formData.name,
          cost: costPerUnit,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || null,
          providerId: formData.providerId,
        });
      } else {
        await addProduct({
          name: formData.name,
          cost: costPerUnit,
          currency: formData.currency,
          profitPercentage: profit,
          exemptFromVAT: !formData.aplicarIVA,
          photoUrl: formData.photoPreview || null,
          providerId: formData.providerId,
        });
      }
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Error completo al guardar:', error);
      alert(`Error al guardar: ${error.message}\n\nRevisa la consola (F12) para detalles.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hintCostoUnitario =
    formData.packageType === 'bulk' &&
    formData.cost &&
    formData.unitsPerBulk &&
    parseNumericInput(formData.unitsPerBulk) > 0
      ? getCostPerUnit(formData)
      : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={handleCancel}
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
                    {productToEdit ? 'Modificar' : 'Crear nuevo'}
                  </p>
                  <h2
                    className="font-black uppercase text-[#e6edf3] leading-none mt-1"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '1.75rem',
                      letterSpacing: '0.07em',
                    }}
                  >
                    {productToEdit ? 'Editar' : 'Nuevo'}{' '}
                    <span style={{ color: '#009A3A' }}>Producto</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
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
                <Field icon={Tag} label="Nombre del producto" required>
                  <SecureInput
                    value={formData.name}
                    onChange={handleNameChange}
                    onSubmit={submitForm}
                    placeholder="Ej: Malta 1.5L"
                    inputMode="text"
                    editable
                    displayClassName="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                  />
                </Field>

                <Field icon={Coins} label="Costo" required>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SecureInput
                        value={formData.cost}
                        onChange={handleCostChange}
                        onSubmit={submitForm}
                        placeholder="0.00"
                        inputMode="decimal"
                        editable
                        displayClassName="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                      />
                    </div>
                    <CurrencyToggle value={formData.currency} onChange={handleCurrencyChange} />
                  </div>
                </Field>

                <Field icon={Package} label="Tipo de empaque">
                  <PackageToggle value={formData.packageType} onChange={handlePackageTypeChange} />
                  <AnimatePresence>
                    {formData.packageType === 'bulk' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <SecureInput
                          value={formData.unitsPerBulk}
                          onChange={handleUnitsChange}
                          onSubmit={submitForm}
                          placeholder="Unidades por bulto (ej: 12)"
                          inputMode="numeric"
                          editable
                          displayClassName="!min-h-[42px] !py-2 !rounded-xl !text-sm"
                        />
                        {hintCostoUnitario !== null && (
                          <p
                            className="mt-2 text-[11px] flex items-center gap-1.5"
                            style={{ color: '#1ebb60', fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            <span>↳</span> Costo unitario: {formatMoney(hintCostoUnitario, formData.currency)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Field>

                <Field icon={Percent} label="% Ganancia" required>
                  <SecureInput
                    value={formData.profitPercentage}
                    onChange={handleProfitChange}
                    onSubmit={submitForm}
                    placeholder="Ej: 30"
                    inputMode="decimal"
                    editable
                    displayClassName="!min-h-[46px] !py-2.5 !rounded-xl !text-sm"
                  />
                </Field>

                <Field icon={Store} label="Proveedor">
                  <ProviderPicker
                    providerId={formData.providerId ?? null}
                    onSelect={(id) => setFormData(prev => ({ ...prev, providerId: id }))}
                  />
                </Field>

                <IvaCard checked={formData.aplicarIVA} onChange={handleIvaToggle} />

                <Field icon={ImagePlus} label="Foto del producto" hint="opcional">
                  <PhotoUploader
                    preview={formData.photoPreview}
                    onChange={handlePhotoBase64}
                    onClear={handleRemovePhoto}
                  />
                </Field>

                {liveResults && rate > 0 && <LivePreview results={liveResults} rate={rate} />}

                {liveResults && rate === 0 && (
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
                  onClick={handleCancel}
                  disabled={isSubmitting}
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
                  whileHover={!isSubmitting ? { scale: 1.02, y: -1 } : undefined}
                  whileTap={!isSubmitting ? { scale: 0.97 } : undefined}
                  type="button"
                  onClick={submitForm}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition disabled:cursor-wait"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                    boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                    opacity: isSubmitting ? 0.85 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      GUARDANDO...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      {productToEdit ? 'ACTUALIZAR' : 'GUARDAR'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showConfirm}
        title="Confirmar cancelación"
        message="¿Estás seguro de cancelar? Se perderán los datos ingresados."
        confirmText="Sí, cancelar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmCancel}
        onCancel={handleContinueEdit}
      />
    </>
  );
}
