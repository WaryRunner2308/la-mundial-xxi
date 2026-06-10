import { useState, useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { useProviderStore } from '@/store/providerStore';
import { useCurrencyStore } from '@/store/currencyStore';

export interface InvoiceProduct {
  nombre: string;
  precio: number;
  moneda: 'USD' | 'Bs';
  unidad: string;
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

export function useInvoiceScanner() {
  const { products, addProduct, updateProduct } = useProductStore();
  const { providers } = useProviderStore();
  const { rate } = useCurrencyStore();

  const [step, setStep] = useState<ScanStep>('idle');
  const [productos, setProductos] = useState<InvoiceProduct[]>([]);
  const [proveedor, setProveedor] = useState<string | null>(null);
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

    const MODELS = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];

    const body = JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
          {
            text: `Eres un asistente para un negocio de carnes y abarrotes venezolano.
Analiza esta factura y extrae TODOS los productos con sus precios.
Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown:
{
  "productos": [
    {
      "nombre": "nombre del producto",
      "precio": 00.00,
      "moneda": "USD o Bs",
      "unidad": "kg, g, unidad, etc"
    }
  ],
  "proveedor": "nombre del proveedor si aparece o null",
  "fecha": "fecha en formato YYYY-MM-DD o null"
}`,
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500,
      },
    });

    let response: Response | null = null;
    let lastError = '';

    for (const model of MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );

      if (res.ok) {
        response = res;
        break;
      }

      const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
      lastError = errData?.error?.message ?? `Error ${res.status}`;
      console.warn(`[Gemini] ${model} falló: ${lastError}`);
    }

    if (!response) {
      throw new Error(`Gemini no disponible. Último error: ${lastError}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(clean) as {
        productos: Array<{ nombre: string; precio: number; moneda: string; unidad: string }>;
        proveedor: string | null;
        fecha: string | null;
      };
    } catch {
      throw new Error('Gemini no pudo estructurar la respuesta. Intenta con una imagen más clara.');
    }
  }, []);

  const searchProductImage = useCallback(async (productName: string): Promise<string | null> => {
    try {
      const query = encodeURIComponent(`${productName} producto Venezuela`);
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${import.meta.env.VITE_GOOGLE_SEARCH_API_KEY}&cx=${import.meta.env.VITE_GOOGLE_SEARCH_CX}&q=${query}&searchType=image&num=1&imgSize=medium`
      );
      const data = await res.json() as { items?: Array<{ link: string }> };
      return data.items?.[0]?.link ?? null;
    } catch {
      return null;
    }
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

        setProveedor(result.proveedor ?? null);

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
    [callGeminiVision, searchProductImage, determinarEstado]
  );

  const ejecutarImportacion = useCallback(async () => {
    const seleccionados = productos.filter((p) => p.seleccionado);
    if (seleccionados.length === 0) return { creados: 0, actualizados: 0 };

    setStep('importing');
    setImportProgress(0);
    setImportTotal(seleccionados.length);

    const proveedorId =
      proveedor
        ? (providers.find((p) => p.name.toLowerCase().includes(proveedor.toLowerCase()))?.id ?? null)
        : null;

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
  }, [productos, proveedor, providers, rate, addProduct, updateProduct, globalGanancia, gananciaMode]);

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
