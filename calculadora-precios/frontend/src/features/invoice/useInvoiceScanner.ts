import { useState, useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { useProviderStore } from '@/store/providerStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { uploadProductImage } from '@/lib/supabase';

export type IvaChoice = 'yes' | 'no' | null;

export interface InvoiceProduct {
  nombre: string;
  precio: number;
  precioTotal: number | null;
  // Base sobre la que se aplica el descuento de factura; nunca lleva descuento acumulado
  precioOriginal: number;
  precioTotalOriginal: number | null;
  moneda: 'USD' | 'Bs';
  unidad: string;
  cantidadBulto: number | null;
  seleccionado: boolean;
  estado: 'Nuevo' | 'Actualizar precio' | 'Sin cambios';
  id: number | null;
  precioAnterior: number | null;
  fotoUrl: string | null;
  fotoBlob: Blob | null;
  ganancia: number;
  ivaChoice: IvaChoice;
}

export type ScanStep = 'idle' | 'scanning' | 'review' | 'importing' | 'done';

export const LOADING_MESSAGES = [
  'Leyendo factura...',
  'Identificando productos...',
];


const INVOICE_PROMPT = `Eres un lector de facturas para un negocio venezolano. Tu única tarea es extraer los datos de la factura con precisión absoluta.

REGLAS ESTRICTAS:
1. NOMBRES: Copia el nombre exactamente como aparece en la factura, letra por letra, sin cambiar mayúsculas, sin agregar ni quitar nada.
2. PRECIOS: En Venezuela el separador decimal puede ser punto (.) o coma (,). Interpreta el número correctamente. El precio nunca debe ser 0.
3. MONEDA: Si ves "$", "USD", "US$" o "dólar" → "USD". Si ves "Bs", "BsF", "Bs." o "bolívar" → "Bs". Si no está claro, usa "USD".

4. REGLAS DE BULTOS (MUY IMPORTANTE):
   - "1X12" o "12UND" o "12UNI" = el bulto trae 12 unidades
   - "NXM" significa N bultos de M unidades cada uno (ej: 1X12 = 12 unidades, 2X6 = 12 unidades)
   - "CAJA X24", "x24", "X6" = el bulto trae 24, 6, etc. unidades
   - El precio de la factura es por BULTO COMPLETO
   - precio_unitario = precio_factura / unidades_por_bulto
   - Ejemplo: MENTOS FRESA 1X12 a $5.17 → precio = 5.17/12 = 0.43
   - Ejemplo: NUCITA FLOW PACK X6 a $9.54 → precio = 9.54/6 = 1.59
   - Ejemplo: GALLETA OREO 24UND a $12.00 → precio = 12.00/24 = 0.50
   - En "cantidad_bulto" devuelve las unidades totales del bulto (12, 6, 24, etc)
   - En "precio" devuelve SIEMPRE el precio unitario YA DIVIDIDO

5. NO INVENTES: Si no puedes leer un dato con certeza, usa null. Nunca inventes nombres ni precios.
6. INCLUYE TODOS los productos de la factura, sin omitir ninguno.

RESPONDE ÚNICAMENTE con este JSON (sin texto adicional, sin markdown, sin explicaciones):
{"productos":[{"nombre":"NOMBRE EXACTO","precio":0.00,"moneda":"USD","unidad":"unidad","cantidad_bulto":null}],"proveedor":"nombre o null","fecha":"YYYY-MM-DD o null"}`;

// Modelos de visión en orden de preferencia: si el primero falla se intenta el siguiente.
const VISION_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.2-11b-vision-instruct',
];

const MAX_IMG_SIDE = 2048;

// Redimensiona y comprime la imagen antes de enviarla a la IA.
// Las fotos de celular (12MP+ en PNG) saturan la API y hacen fallar la lectura;
// 2048px JPEG conserva el texto legible con ~10x menos peso.
async function prepararImagen(blob: Blob): Promise<Blob> {
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      image.src = url;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, MAX_IMG_SIDE / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return blob;
    }
    ctx.drawImage(img, 0, 0, w, h);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    URL.revokeObjectURL(url);
    return jpeg ?? blob;
  } catch {
    return blob;
  }
}

// Extrae el primer objeto JSON aunque el modelo agregue texto o fences alrededor.
function extraerJson(text: string): string {
  const sinFences = text.replace(/```json|```/g, '').trim();
  const start = sinFences.indexOf('{');
  const end = sinFences.lastIndexOf('}');
  if (start >= 0 && end > start) return sinFences.slice(start, end + 1);
  return sinFences;
}

// Detecta unidades por bulto a partir del nombre del producto.
// Convención venezolana: "1X12" = 12 unidades; "2X6" = 12; "X6" = 6; "12UND" = 12.
function detectarBultoEnNombre(nombre: string): number | null {
  const mXY = nombre.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (mXY) {
    const a = parseInt(mXY[1], 10);
    const b = parseInt(mXY[2], 10);
    if (a > 0 && b > 0) return a === 1 ? b : a * b;
  }
  const mX = nombre.match(/(?:^|\s)[xX]\s*(\d+)/);
  if (mX) {
    const n = parseInt(mX[1], 10);
    if (n > 1) return n;
  }
  const mUN = nombre.match(/(\d+)\s*UN[DI]?/i);
  if (mUN) {
    const n = parseInt(mUN[1], 10);
    if (n > 1) return n;
  }
  return null;
}

// Normaliza precio/cantidad_bulto cruzando lo que dijo la IA con el patrón del nombre.
// Si el nombre indica bulto y la IA no dividió (cantidad_bulto null/1), divide en código.
function normalizarBulto(precioIA: number, cantidadIA: number | null, nombre: string): {
  precio: number;
  cantidadBulto: number | null;
  precioTotal: number | null;
} {
  const detectado = detectarBultoEnNombre(nombre);
  const cantidadIAValida = cantidadIA && cantidadIA > 1 ? cantidadIA : null;

  if (detectado && detectado > 1) {
    if (!cantidadIAValida) {
      return { precio: precioIA / detectado, cantidadBulto: detectado, precioTotal: precioIA };
    }
    return { precio: precioIA, cantidadBulto: cantidadIAValida, precioTotal: precioIA * cantidadIAValida };
  }
  if (cantidadIAValida) {
    return { precio: precioIA, cantidadBulto: cantidadIAValida, precioTotal: precioIA * cantidadIAValida };
  }
  return { precio: precioIA, cantidadBulto: null, precioTotal: null };
}

export function useInvoiceScanner() {
  const { products, addProduct, updateProduct } = useProductStore();
  const { providers } = useProviderStore();
  const { rate } = useCurrencyStore();

  const [step, setStep] = useState<ScanStep>('idle');
  const [productos, setProductos] = useState<InvoiceProduct[]>([]);
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [globalGanancia, setGlobalGanancia] = useState('30');
  const [gananciaMode, setGananciaMode] = useState<'global' | 'individual'>('global');
  const [importResult, setImportResult] = useState<{ creados: number; actualizados: number } | null>(null);
  const [conDescuento, setConDescuento] = useState(false);
  const [descuento, setDescuentoStr] = useState('');

  const callGeminiVision = useCallback(async (imageBlob: Blob) => {
    const prepared = await prepararImagen(imageBlob);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(prepared);
    });
    const mimeType = prepared.type || 'image/jpeg';

    const intentarConModelo = async (model: string) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://la-mundial-xxi.vercel.app',
          'X-Title': 'La Mundial',
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: 'text', text: INVOICE_PROMPT },
            ],
          }],
          max_tokens: 8000,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errData?.error?.message ?? `Error OpenRouter: ${response.status}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      };
      const choice = data.choices?.[0];
      if (choice?.finish_reason === 'length') {
        throw new Error('La respuesta quedó incompleta: la factura es muy larga.');
      }
      const text = choice?.message?.content ?? '';

      const parsed = JSON.parse(extraerJson(text)) as {
        productos: Array<{ nombre: string; precio: number | string; moneda: string; unidad: string; cantidad_bulto?: number | string | null }>;
        proveedor: string | null;
        fecha: string | null;
      };
      if (!Array.isArray(parsed.productos)) {
        throw new Error('La respuesta no contiene productos.');
      }
      return {
        ...parsed,
        productos: parsed.productos.map((p) => ({
          ...p,
          precio: Number(p.precio),
          cantidad_bulto: p.cantidad_bulto != null ? Number(p.cantidad_bulto) || null : null,
        })),
      };
    };

    // 2 intentos por modelo, en orden de preferencia, antes de rendirse
    let lastError: Error | null = null;
    for (const model of VISION_MODELS) {
      for (let intento = 0; intento < 2; intento++) {
        try {
          return await intentarConModelo(model);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    throw new Error(
      `No se pudo leer la factura (${lastError?.message ?? 'error desconocido'}). Intenta con una foto más clara y bien iluminada.`
    );
  }, []);

  const determinarEstado = useCallback(
    (nombre: string, precio: number, moneda: string): Pick<InvoiceProduct, 'estado' | 'id' | 'precioAnterior'> => {
      const existente = products.find(
        (p) => p.name.toLowerCase().trim() === nombre.toLowerCase().trim()
      );
      if (!existente) return { estado: 'Nuevo', id: null, precioAnterior: null };

      const precioNuevo = moneda === 'Bs' ? precio / (rate > 0 ? rate : 1) : precio;
      const diff = Math.abs(existente.costUSD - precioNuevo);

      if (diff < 0.001) return { estado: 'Sin cambios', id: existente.id, precioAnterior: existente.costUSD };
      return { estado: 'Actualizar precio', id: existente.id, precioAnterior: existente.costUSD };
    },
    [products, rate]
  );

  // Aplica el % de descuento sobre el costo ORIGINAL de cada fila (nunca acumula)
  // y recalcula el estado Nuevo/Actualizar/Sin cambios con el costo resultante.
  const recalcularConDescuento = useCallback(
    (pctRaw: string) => {
      const pct = parseFloat(pctRaw);
      const factor = !isNaN(pct) && pct > 0 && pct < 100 ? 1 - pct / 100 : 1;
      setProductos((prev) =>
        prev.map((p) => {
          const precio = p.precioOriginal * factor;
          const precioTotal = p.precioTotalOriginal !== null ? p.precioTotalOriginal * factor : null;
          const { estado, id, precioAnterior } = determinarEstado(p.nombre, precio, p.moneda);
          return { ...p, precio, precioTotal, estado, id, precioAnterior };
        })
      );
    },
    [determinarEstado]
  );

  const setDescuento = useCallback(
    (v: string) => {
      setDescuentoStr(v);
      recalcularConDescuento(v);
    },
    [recalcularConDescuento]
  );

  const toggleDescuento = useCallback(
    (on: boolean) => {
      setConDescuento(on);
      if (on) {
        recalcularConDescuento(descuento);
      } else {
        setDescuentoStr('');
        recalcularConDescuento('');
      }
    },
    [descuento, recalcularConDescuento]
  );

  const scanImage = useCallback(
    async (imageBlob: Blob) => {
      setError(null);
      setStep('scanning');
      setLoadingMessageIdx(0);

      const msgInterval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);

      try {
        const result = await callGeminiVision(imageBlob);

        if (!result?.productos || result.productos.length === 0) {
          throw new Error('No se detectaron productos en la imagen. Intenta con una foto más clara.');
        }

        const rawProveedor = result.proveedor;
        const detectedName =
          typeof rawProveedor === 'string' && rawProveedor.trim() && rawProveedor.trim().toLowerCase() !== 'null'
            ? rawProveedor.trim()
            : null;
        setProveedor(detectedName);
        if (detectedName) {
          const match = providers.find((p) =>
            p.name.toLowerCase().includes(detectedName.toLowerCase()) ||
            detectedName.toLowerCase().includes(p.name.toLowerCase())
          );
          setProveedorId(match?.id ?? null);
        }

        const mapped: InvoiceProduct[] = result.productos.map((p) => {
          const moneda: 'USD' | 'Bs' = p.moneda === 'USD' ? 'USD' : 'Bs';
          const { precio, cantidadBulto, precioTotal } = normalizarBulto(
            Number(p.precio),
            p.cantidad_bulto ?? null,
            p.nombre
          );
          const { estado, id, precioAnterior } = determinarEstado(p.nombre, precio, moneda);
          return {
            nombre: p.nombre,
            precio,
            precioTotal,
            precioOriginal: precio,
            precioTotalOriginal: precioTotal,
            moneda,
            unidad: p.unidad,
            cantidadBulto,
            seleccionado: estado !== 'Sin cambios',
            estado,
            id,
            precioAnterior,
            fotoUrl: null,
            fotoBlob: null,
            ganancia: 30,
            ivaChoice: null,
          };
        });

        setConDescuento(false);
        setDescuentoStr('');
        setProductos(mapped);
        setStep('review');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido al analizar la factura.';
        setError(message);
        setStep('idle');
      } finally {
        clearInterval(msgInterval);
      }
    },
    [callGeminiVision, determinarEstado, providers]
  );

  const ejecutarImportacion = useCallback(async () => {
    const seleccionados = productos.filter((p) => p.seleccionado);
    if (seleccionados.length === 0) return { creados: 0, actualizados: 0 };

    setStep('importing');
    setImportProgress(0);
    setImportTotal(seleccionados.length);

    let creados = 0;
    let actualizados = 0;
    const gananciaGlobal = parseFloat(globalGanancia) || 30;

    for (let i = 0; i < seleccionados.length; i++) {
      const producto = seleccionados[i];
      const costUsd =
        producto.moneda === 'Bs'
          ? producto.precio / (rate > 0 ? rate : 1)
          : producto.precio;

      const ganancia = gananciaMode === 'global' ? gananciaGlobal : producto.ganancia;

      // ivaChoice 'no' → exento; cualquier otra cosa (yes o null) → con IVA por defecto
      const exemptFromVAT = producto.ivaChoice === 'no';

      try {
        if (producto.estado === 'Nuevo') {
          const newId = await addProduct({
            name: producto.nombre,
            cost: costUsd,
            currency: 'USD',
            profitPercentage: ganancia,
            exemptFromVAT,
            photoUrl: null,
            providerId: proveedorId ?? null,
          });
          if (producto.fotoBlob && newId) {
            try {
              const file = new File([producto.fotoBlob], `product_${newId}.png`, { type: 'image/png' });
              const url = await uploadProductImage(file, newId);
              await updateProduct(newId, { photoUrl: url });
            } catch (uploadErr) {
              console.error(`Error subiendo foto de "${producto.nombre}":`, uploadErr);
            }
          }
          creados++;
        } else if (producto.estado === 'Actualizar precio' && producto.id !== null) {
          const updates: { cost: number; currency: 'USD'; exemptFromVAT?: boolean } = {
            cost: costUsd,
            currency: 'USD',
          };
          if (producto.ivaChoice !== null) updates.exemptFromVAT = exemptFromVAT;
          await updateProduct(producto.id, updates);
          if (producto.fotoBlob) {
            try {
              const file = new File([producto.fotoBlob], `product_${producto.id}.png`, { type: 'image/png' });
              const url = await uploadProductImage(file, producto.id);
              await updateProduct(producto.id, { photoUrl: url });
            } catch (uploadErr) {
              console.error(`Error subiendo foto de "${producto.nombre}":`, uploadErr);
            }
          }
          actualizados++;
        }
      } catch (err) {
        console.error(`Error importando "${producto.nombre}":`, err);
      }

      setImportProgress(i + 1);
    }

    const result = { creados, actualizados };
    setImportResult(result);
    return result;
  }, [productos, proveedorId, rate, addProduct, updateProduct, globalGanancia, gananciaMode]);

  const updateProducto = useCallback((index: number, changes: Partial<InvoiceProduct>) => {
    setProductos((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }, []);

  const toggleAll = useCallback((selected: boolean) => {
    setProductos((prev) => prev.map((p) => ({ ...p, seleccionado: selected })));
  }, []);

  const setIvaAll = useCallback((choice: IvaChoice) => {
    setProductos((prev) => prev.map((p) => ({ ...p, ivaChoice: choice })));
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setProductos([]);
    setProveedor(null);
    setProveedorId(null);
    setError(null);
    setImportProgress(0);
    setImportTotal(0);
    setImportResult(null);
    setConDescuento(false);
    setDescuentoStr('');
  }, []);

  return {
    step,
    setStep,
    productos,
    proveedor,
    proveedorId,
    setProveedorId,
    error,
    setError,
    importProgress,
    importTotal,
    importResult,
    loadingMessageIdx,
    globalGanancia,
    setGlobalGanancia,
    gananciaMode,
    setGananciaMode,
    conDescuento,
    toggleDescuento,
    descuento,
    setDescuento,
    scanImage,
    ejecutarImportacion,
    updateProducto,
    toggleAll,
    setIvaAll,
    reset,
  };
}
