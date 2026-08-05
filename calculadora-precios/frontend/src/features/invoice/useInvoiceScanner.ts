import { useState, useCallback } from 'react';
import { useProductStore } from '@/store/productStore';
import { useProviderStore } from '@/store/providerStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { supabase, uploadProductImage } from '@/lib/supabase';
import { useToastStore } from '@/store/toastStore';
import { useInvoiceHistoryStore, type InvoiceHistoryItem } from '@/store/invoiceHistoryStore';
import { buscarProductoExistente } from './matchProducto';
import { calcularFila } from './precioVenta';

// El escaneo corre en una función servidor (frontend/api/scan-invoice.ts) que
// guarda la clave de Gemini fuera del cliente. Se llama por URL absoluta
// porque la app de escritorio (Electron) carga los archivos desde disco
// (file://), no desde este dominio.
const SCAN_INVOICE_URL = 'https://la-mundial-xxi.vercel.app/api/scan-invoice';

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
  gananciaAnterior: number | null;
  // Nombre con el que ya está guardado el producto (puede diferir del de la
  // factura) y si el emparejamiento fue por parecido en vez de exacto.
  nombreExistente: string | null;
  matchAproximado: boolean;
  // Con descuento activo: 'mantener' conserva el precio de venta anterior y guarda
  // el costo SIN descuento (la promo no altera el costo real del producto)
  descuentoPv: 'mantener' | 'bajar';
  fotoUrl: string | null;
  fotoBlob: Blob | null;
  ganancia: number;
  ivaChoice: IvaChoice;
}

export type ScanStep = 'idle' | 'scanning' | 'review' | 'importing' | 'done';

// Un producto que ya existía y al que la factura le cambió el costo
export interface CambioPrecio {
  nombre: string;
  antes: number;
  ahora: number;
}

export interface ImportResult {
  creados: number;
  actualizados: number;
  cambiosPrecio: CambioPrecio[];
}

export const LOADING_MESSAGES = [
  'Leyendo factura...',
  'Identificando productos...',
];


const MAX_IMG_SIDE = 2048;

// Redimensiona y comprime la imagen antes de enviarla a la IA.
// Las fotos de celular (12MP+ en PNG) saturan la API y hacen fallar la lectura;
// 2048px JPEG conserva el texto legible con ~10x menos peso.
async function prepararImagen(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
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
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, w, h);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    return jpeg ?? blob;
  } catch {
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
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

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.');
    }

    const response = await fetch(SCAN_INVOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ base64, mimeType }),
    });

    const data = await response.json().catch(() => ({})) as {
      error?: string;
      productos?: Array<{ nombre: string; precio: number | string; moneda: string; unidad: string; cantidad_bulto?: number | string | null }>;
      proveedor?: string | null;
      fecha?: string | null;
    };

    if (!response.ok) {
      throw new Error(data.error ?? `No se pudo leer la factura (error ${response.status}).`);
    }
    if (!Array.isArray(data.productos)) {
      throw new Error('La respuesta no contiene productos.');
    }

    return {
      productos: data.productos.map((p) => ({
        ...p,
        precio: Number(p.precio),
        cantidad_bulto: p.cantidad_bulto != null ? Number(p.cantidad_bulto) || null : null,
      })),
      proveedor: data.proveedor ?? null,
      fecha: data.fecha ?? null,
    };
  }, []);

  type EstadoMatch = Pick<
    InvoiceProduct,
    'estado' | 'id' | 'precioAnterior' | 'gananciaAnterior' | 'nombreExistente' | 'matchAproximado'
  >;

  const determinarEstado = useCallback(
    (nombre: string, precio: number, moneda: string): EstadoMatch => {
      // El nombre de la factura casi nunca es idéntico al nuestro
      // ("MANTEQ. MAVESA 250 GRS" vs "Mantequilla Mavesa 250g"), así que el
      // emparejamiento es por parecido normalizado, no por texto exacto.
      const coincidencia = buscarProductoExistente(nombre, products);
      if (!coincidencia) {
        return {
          estado: 'Nuevo',
          id: null,
          precioAnterior: null,
          gananciaAnterior: null,
          nombreExistente: null,
          matchAproximado: false,
        };
      }

      const existente = coincidencia.producto;
      const base = {
        id: existente.id,
        precioAnterior: existente.costUSD,
        gananciaAnterior: existente.profitPercentage,
        nombreExistente: existente.name,
        matchAproximado: coincidencia.tipo === 'aproximado',
      };

      const precioNuevo = moneda === 'Bs' ? precio / (rate > 0 ? rate : 1) : precio;
      const diff = Math.abs(existente.costUSD - precioNuevo);

      if (diff < 0.001) return { ...base, estado: 'Sin cambios' };
      return { ...base, estado: 'Actualizar precio' };
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
          return { ...p, precio, precioTotal, ...determinarEstado(p.nombre, precio, p.moneda) };
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
          const match = determinarEstado(p.nombre, precio, moneda);
          return {
            nombre: p.nombre,
            precio,
            precioTotal,
            precioOriginal: precio,
            precioTotalOriginal: precioTotal,
            moneda,
            unidad: p.unidad,
            cantidadBulto,
            seleccionado: match.estado !== 'Sin cambios',
            ...match,
            descuentoPv: 'mantener' as const,
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
    if (seleccionados.length === 0) return { creados: 0, actualizados: 0, cambiosPrecio: [] };

    setStep('importing');
    setImportProgress(0);
    setImportTotal(seleccionados.length);

    let creados = 0;
    let actualizados = 0;
    const productosConFallaDeFoto: string[] = [];
    const productosConFallaDeImportacion: string[] = [];
    // Precios que efectivamente cambiaron, para avisarle al usuario cuánto era
    // antes y cuánto quedó ahora.
    const cambiosPrecio: CambioPrecio[] = [];
    // Costo final en USD por fila, para dejarlo grabado en el historial
    const costoFinalPorFila = new Map<InvoiceProduct, number>();
    const gananciaGlobal = parseFloat(globalGanancia) || 30;
    const pctDescuento = conDescuento ? parseFloat(descuento) || 0 : 0;
    const descuentoActivo = pctDescuento > 0 && pctDescuento < 100;

    for (let i = 0; i < seleccionados.length; i++) {
      const producto = seleccionados[i];
      // Con descuento, 'mantener' guarda el costo SIN descuento: la promo de esta
      // factura no debe alterar el costo real del producto en la lista
      const costoBase =
        descuentoActivo && producto.descuentoPv === 'mantener'
          ? producto.precioOriginal
          : producto.precio;
      const costUsd =
        producto.moneda === 'Bs'
          ? costoBase / (rate > 0 ? rate : 1)
          : costoBase;

      costoFinalPorFila.set(producto, costUsd);

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
              productosConFallaDeFoto.push(producto.nombre);
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
              productosConFallaDeFoto.push(producto.nombre);
            }
          }
          if (producto.precioAnterior !== null) {
            cambiosPrecio.push({
              nombre: producto.nombreExistente ?? producto.nombre,
              antes: producto.precioAnterior,
              ahora: costUsd,
            });
          }
          actualizados++;
        }
      } catch (err) {
        console.error(`Error importando "${producto.nombre}":`, err);
        productosConFallaDeImportacion.push(producto.nombre);
      }

      setImportProgress(i + 1);
    }

    if (productosConFallaDeImportacion.length > 0) {
      useToastStore.getState().show(
        `No se pudieron importar: ${productosConFallaDeImportacion.join(', ')}`,
        'error'
      );
    } else if (productosConFallaDeFoto.length > 0) {
      useToastStore.getState().show(
        `Se importó, pero la foto no se pudo subir para: ${productosConFallaDeFoto.join(', ')}`,
        'error'
      );
    }

    // Historial: se graba TODO lo que leyó la IA, no solo lo importado, y con
    // los mismos números que se vieron en la tabla de revisión (misma función
    // calcularFila), para que el historial no muestre otra cosa.
    const items: InvoiceHistoryItem[] = productos.map((p) => {
      const gananciaFila = gananciaMode === 'global' ? gananciaGlobal : p.ganancia;
      const { precioVenta, costoAGuardar } = calcularFila(
        p,
        gananciaFila,
        descuentoActivo ? pctDescuento : 0,
        rate
      );
      return {
        nombre: p.nombre,
        precioCosto: costoAGuardar,
        precioVenta,
        moneda: p.moneda,
        iva: p.ivaChoice,
        ganancia: gananciaFila,
        unidad: p.unidad,
        cantidadBulto: p.cantidadBulto,
        costoUsd: costoFinalPorFila.get(p) ?? null,
        estado: p.estado,
        precioAnterior: p.precioAnterior,
        importado: p.seleccionado && !productosConFallaDeImportacion.includes(p.nombre),
        productoId: p.id,
        nombreExistente: p.nombreExistente,
        matchAproximado: p.matchAproximado,
      };
    });

    const nombreProveedor =
      providers.find((prov) => prov.id === proveedorId)?.name ?? proveedor ?? null;

    try {
      await useInvoiceHistoryStore.getState().guardarFactura({
        proveedorNombre: nombreProveedor,
        proveedorId: proveedorId ?? null,
        tasa: rate,
        descuento: descuentoActivo ? pctDescuento : null,
        totalItems: items.length,
        creados,
        actualizados,
        items,
      });
    } catch {
      // Los productos ya se importaron bien; solo se perdió el registro.
      useToastStore.getState().show(
        'Los productos se importaron, pero la factura no se pudo guardar en el historial.',
        'error'
      );
    }

    const result = { creados, actualizados, cambiosPrecio };
    setImportResult(result);
    return result;
  }, [productos, proveedorId, proveedor, providers, rate, addProduct, updateProduct, globalGanancia, gananciaMode, conDescuento, descuento]);

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
