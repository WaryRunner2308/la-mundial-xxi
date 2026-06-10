import { useState, useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { useProviderStore } from '@/store/providerStore';
import { useCurrencyStore } from '@/store/currencyStore';

export interface InvoiceProduct {
  nombre: string;
  precio: number;
  moneda: 'USD' | 'Bs';
  unidad: string;
  cantidadBulto: number | null;
  seleccionado: boolean;
  estado: 'Nuevo' | 'Actualizar precio' | 'Sin cambios';
  id: number | null;
  precioAnterior: number | null;
  fotoUrl: string | null;
  ganancia: number;
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
4. BULTOS: Si hay cantidad por bulto (ej: "12UND", "24X1", "1X12", "CAJA X24", "x12", "6UN"), divide el precio total entre esa cantidad y pon el resultado en "precio". Pon la cantidad en "cantidad_bulto".
5. NO INVENTES: Si no puedes leer un dato con certeza, usa null. Nunca inventes nombres ni precios.
6. INCLUYE TODOS los productos de la factura, sin omitir ninguno.

RESPONDE ÚNICAMENTE con este JSON (sin texto adicional, sin markdown, sin explicaciones):
{"productos":[{"nombre":"NOMBRE EXACTO","precio":0.00,"moneda":"USD","unidad":"unidad","cantidad_bulto":null}],"proveedor":"nombre o null","fecha":"YYYY-MM-DD o null"}`;

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
    // Intento 1: Wikipedia (funciona bien para marcas conocidas)
    try {
      const wikiQuery = encodeURIComponent(productName);
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiQuery}`
      );
      if (res.ok) {
        const data = await res.json() as { thumbnail?: { source: string } };
        if (data.thumbnail?.source) return data.thumbnail.source;
      }
    } catch {
      // silencioso
    }

    // Intento 2: LoremFlickr — siempre devuelve una imagen relevante de Flickr, sin API key
    return `https://loremflickr.com/200/200/${encodeURIComponent(productName)}/all`;
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
          const { estado, id, precioAnterior } = determinarEstado(p.nombre, p.precio, moneda);
          return {
            nombre: p.nombre,
            precio: p.precio,
            moneda,
            unidad: p.unidad,
            cantidadBulto: p.cantidad_bulto ?? null,
            seleccionado: estado !== 'Sin cambios',
            estado,
            id,
            precioAnterior,
            fotoUrl: fotos[i],
            ganancia: 30,
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
            exemptFromVAT: false,
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
