import { useState, useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { useProviderStore } from '@/store/providerStore';
import { useCurrencyStore } from '@/store/currencyStore';

export interface InvoiceProduct {
  nombre: string;
  precio: number;
  precioTotal: number | null;
  moneda: 'USD' | 'Bs';
  unidad: string;
  cantidadBulto: number | null;
  seleccionado: boolean;
  estado: 'Nuevo' | 'Actualizar precio' | 'Sin cambios';
  id: number | null;
  precioAnterior: number | null;
  fotoUrl: string | null;
  ganancia: number;
  exemptFromVAT: boolean;
}

export type ScanStep = 'idle' | 'scanning' | 'fetching-images' | 'review' | 'importing' | 'done';

export const LOADING_MESSAGES = [
  'Leyendo factura...',
  'Identificando productos...',
  'Buscando imágenes...',
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

  const callGeminiVision = useCallback(async (imageBlob: Blob) => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(imageBlob);
    });
    const mimeType = imageBlob.type || 'image/png';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://la-mundial-xxi.vercel.app',
        'X-Title': 'La Mundial',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-11b-vision-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: INVOICE_PROMPT },
          ],
        }],
        max_tokens: 1500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errData?.error?.message ?? `Error OpenRouter: ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean) as {
        productos: Array<{ nombre: string; precio: number | string; moneda: string; unidad: string; cantidad_bulto?: number | string | null }>;
        proveedor: string | null;
        fecha: string | null;
      };
      return {
        ...parsed,
        productos: parsed.productos.map((p) => ({
          ...p,
          precio: Number(p.precio),
          cantidad_bulto: p.cantidad_bulto != null ? Number(p.cantidad_bulto) || null : null,
        })),
      };
    } catch {
      throw new Error('El modelo no pudo estructurar la respuesta. Intenta con una imagen más clara.');
    }
  }, []);

  const searchProductImage = useCallback(async (productName: string): Promise<string | null> => {
    try {
      const query = encodeURIComponent(`${productName} producto`);
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${import.meta.env.VITE_GOOGLE_SEARCH_API_KEY}&cx=${import.meta.env.VITE_GOOGLE_SEARCH_CX}&q=${query}&searchType=image&num=1&imgSize=medium`
      );
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        console.error('Google Search error:', errorBody.error?.message);
        return null;
      }
      const data = await res.json() as { items?: Array<{ link: string }> };
      return data.items?.[0]?.link ?? null;
    } catch {
      return null;
    }
  }, []);

  const determinarEstado = useCallback(
    (nombre: string, precio: number, moneda: string): Pick<InvoiceProduct, 'estado' | 'id' | 'precioAnterior' | 'exemptFromVAT'> => {
      const existente = products.find(
        (p) => p.name.toLowerCase().trim() === nombre.toLowerCase().trim()
      );
      if (!existente) return { estado: 'Nuevo', id: null, precioAnterior: null, exemptFromVAT: false };

      const precioNuevo = moneda === 'Bs' ? precio / (rate > 0 ? rate : 1) : precio;
      const diff = Math.abs(existente.costUSD - precioNuevo);

      if (diff < 0.001) return { estado: 'Sin cambios', id: existente.id, precioAnterior: existente.costUSD, exemptFromVAT: existente.exemptFromVAT };
      return { estado: 'Actualizar precio', id: existente.id, precioAnterior: existente.costUSD, exemptFromVAT: existente.exemptFromVAT };
    },
    [products, rate]
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

        setStep('fetching-images');
        setLoadingMessageIdx(2);

        const detectedName = result.proveedor ?? null;
        setProveedor(detectedName);
        if (detectedName) {
          const match = providers.find((p) =>
            p.name.toLowerCase().includes(detectedName.toLowerCase()) ||
            detectedName.toLowerCase().includes(p.name.toLowerCase())
          );
          setProveedorId(match?.id ?? null);
        }

        const fotosResults = await Promise.allSettled(
          result.productos.map((p) => searchProductImage(p.nombre))
        );
        const fotos = fotosResults.map((r) => (r.status === 'fulfilled' ? r.value : null));

        const mapped: InvoiceProduct[] = result.productos.map((p, i) => {
          const moneda: 'USD' | 'Bs' = p.moneda === 'USD' ? 'USD' : 'Bs';
          const { precio, cantidadBulto, precioTotal } = normalizarBulto(
            Number(p.precio),
            p.cantidad_bulto ?? null,
            p.nombre
          );
          const { estado, id, precioAnterior, exemptFromVAT } = determinarEstado(p.nombre, precio, moneda);
          return {
            nombre: p.nombre,
            precio,
            precioTotal,
            moneda,
            unidad: p.unidad,
            cantidadBulto,
            seleccionado: estado !== 'Sin cambios',
            estado,
            id,
            precioAnterior,
            fotoUrl: fotos[i],
            ganancia: 30,
            exemptFromVAT,
          };
        });

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
    [callGeminiVision, searchProductImage, determinarEstado, providers]
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

      try {
        if (producto.estado === 'Nuevo') {
          await addProduct({
            name: producto.nombre,
            cost: costUsd,
            currency: 'USD',
            profitPercentage: ganancia,
            exemptFromVAT: producto.exemptFromVAT,
            photoUrl: producto.fotoUrl ?? null,
            providerId: proveedorId ?? null,
          });
          creados++;
        } else if (producto.estado === 'Actualizar precio' && producto.id !== null) {
          await updateProduct(producto.id, { cost: costUsd, currency: 'USD' });
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

  const reset = useCallback(() => {
    setStep('idle');
    setProductos([]);
    setProveedor(null);
    setProveedorId(null);
    setError(null);
    setImportProgress(0);
    setImportTotal(0);
    setImportResult(null);
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
    scanImage,
    ejecutarImportacion,
    updateProducto,
    toggleAll,
    reset,
  };
}
