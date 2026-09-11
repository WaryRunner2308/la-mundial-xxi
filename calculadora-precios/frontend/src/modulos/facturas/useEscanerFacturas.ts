import { useState, useCallback } from 'react';
import { convertirEntradaANumero } from '@/utilidades/decimales';
import { useAlmacenProductos } from '@/almacen/almacenProductos';
import { useAlmacenProveedores } from '@/almacen/almacenProveedores';
import { useAlmacenMoneda } from '@/almacen/almacenMoneda';
import { supabase, subirImagenProducto } from '@/lib/supabase';
import { useAlmacenAvisos } from '@/almacen/almacenAvisos';
import { useAlmacenHistorialFacturas, type RenglonFactura } from '@/almacen/almacenHistorialFacturas';
import { buscarProductoExistente } from './matchProducto';
import { calcularFila } from './precioVenta';

// El escaneo corre en una función servidor (frontend/api/scan-invoice.ts) que
// guarda la clave de Gemini fuera del cliente. Se llama por URL absoluta
// porque la app de escritorio (Electron) carga los archivos desde disco
// (file://), no desde este dominio.
//
// El dominio sale de VITE_URL_API para poder apuntar a un despliegue de
// prueba o al servidor local sin tocar el código. Si no está definida, cae en
// producción, que es lo que hacía antes: así la app de escritorio ya compilada
// sigue funcionando igual aunque nadie configure la variable.
const URL_BASE_API = import.meta.env.VITE_URL_API || 'https://la-mundial-xxi.vercel.app';
const URL_ESCANEO_FACTURA = `${URL_BASE_API.replace(/\/$/, '')}/api/scan-invoice`;

/**
 * Ganancia que se propone al importar una factura, mientras el usuario no
 * escriba otra. Estaba escrita tres veces por separado: si alguien cambiaba
 * una sola, la fila mostraba un porcentaje y guardaba otro.
 */
export const GANANCIA_POR_DEFECTO = 30;

export type OpcionIva = 'yes' | 'no' | null;

export interface ProductoFactura {
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
  opcionIva: OpcionIva;
}

export type PasoEscaneo = 'idle' | 'scanning' | 'review' | 'importing' | 'done';

// Un producto que ya existía y al que la factura le cambió el costo
export interface CambioPrecio {
  nombre: string;
  antes: number;
  ahora: number;
}

export interface ResultadoImportacion {
  creados: number;
  actualizados: number;
  cambiosPrecio: CambioPrecio[];
}

export const MENSAJES_CARGA = [
  'Leyendo factura...',
  'Identificando productos...',
];


const LADO_MAX_IMAGEN = 2048;

// Redimensiona y comprime la imagen antes de enviarla a la IA.
// Las fotos de celular (12MP+ en PNG) saturan la API y hacen fallar la lectura;
// 2048px JPEG conserva el texto legible con ~10x menos peso.
async function prepararImagen(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imagen = new Image();
      imagen.onload = () => resolve(imagen);
      imagen.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      imagen.src = url;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const escala = Math.min(1, LADO_MAX_IMAGEN / Math.max(w0, h0));
    const w = Math.round(w0 * escala);
    const h = Math.round(h0 * escala);
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

// El precio que devuelve la IA viene tipado como `number | string`, y a veces
// llega como texto. `Number("11.154,34")` da NaN, y ese NaN se propagaba en
// silencio: la fila quedaba marcada para importar, el costo se guardaba como
// NaN y Supabase terminaba recibiendo null. Aqui se normaliza igual que
// cualquier entrada del usuario (coma decimal incluida) y lo que no se pueda
// leer cae en 0, que se ve en pantalla como 0.00 y el usuario puede corregir a
// mano con el campo de precio de costo.
function precioDeLaIA(crudo: number | string): number {
  const n = typeof crudo === 'number' ? crudo : convertirEntradaANumero(String(crudo));
  return Number.isFinite(n) && n > 0 ? n : 0;
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

export function useEscanerFacturas() {
  const { productos: productosGuardados, agregarProducto, actualizarProducto } = useAlmacenProductos();
  const { proveedores } = useAlmacenProveedores();
  const { tasa } = useAlmacenMoneda();

  const [paso, fijarPaso] = useState<PasoEscaneo>('idle');
  const [productos, setProductos] = useState<ProductoFactura[]>([]);
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [error, fijarError] = useState<string | null>(null);
  const [progresoImportacion, fijarProgresoImportacion] = useState(0);
  const [totalImportacion, fijarTotalImportacion] = useState(0);
  const [indiceMensajeCarga, fijarIndiceMensajeCarga] = useState(0);
  const [gananciaGeneral, fijarGananciaGeneral] = useState(String(GANANCIA_POR_DEFECTO));
  const [modoGanancia, fijarModoGanancia] = useState<'global' | 'individual'>('global');
  const [resultadoImportacion, fijarResultadoImportacion] = useState<ResultadoImportacion | null>(null);
  const [conDescuento, setConDescuento] = useState(false);
  const [descuento, setDescuentoStr] = useState('');

  const llamarGeminiVision = useCallback(async (blobImagen: Blob, notas: string) => {
    const preparada = await prepararImagen(blobImagen);
    const base64 = await new Promise<string>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve((lector.result as string).split(',')[1]);
      lector.readAsDataURL(preparada);
    });
    const mimeType = preparada.type || 'image/jpeg';

    const { data: datosSesion } = await supabase.auth.getSession();
    const tokenAcceso = datosSesion.session?.access_token;
    if (!tokenAcceso) {
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.');
    }

    const respuesta = await fetch(URL_ESCANEO_FACTURA, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAcceso}`,
      },
      body: JSON.stringify({ base64, mimeType, notas }),
    });

    const data = await respuesta.json().catch(() => ({})) as {
      error?: string;
      productos?: Array<{
        nombre: string;
        precio: number | string;
        moneda: string;
        unidad: string;
        cantidad_bulto?: number | string | null;
        exento_iva?: boolean | null;
      }>;
      proveedor?: string | null;
      fecha?: string | null;
    };

    if (!respuesta.ok) {
      throw new Error(data.error ?? `No se pudo leer la factura (error ${respuesta.status}).`);
    }
    if (!Array.isArray(data.productos)) {
      throw new Error('La respuesta no contiene productos.');
    }

    return {
      productos: data.productos.map((p) => ({
        ...p,
        precio: precioDeLaIA(p.precio),
        cantidad_bulto: p.cantidad_bulto != null ? Number(p.cantidad_bulto) || null : null,
        exento_iva: p.exento_iva === true ? true : p.exento_iva === false ? false : null,
      })),
      proveedor: data.proveedor ?? null,
      fecha: data.fecha ?? null,
    };
  }, []);

  type EstadoCoincidencia = Pick<
    ProductoFactura,
    'estado' | 'id' | 'precioAnterior' | 'gananciaAnterior' | 'nombreExistente' | 'matchAproximado'
  >;

  const determinarEstado = useCallback(
    (nombre: string, precio: number, moneda: string): EstadoCoincidencia => {
      // El nombre de la factura casi nunca es idéntico al nuestro
      // ("MANTEQ. MAVESA 250 GRS" vs "Mantequilla Mavesa 250g"), así que el
      // emparejamiento es por parecido normalizado, no por texto exacto.
      const coincidencia = buscarProductoExistente(nombre, productosGuardados);
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
        precioAnterior: existente.costoUSD,
        gananciaAnterior: existente.porcentajeGanancia,
        nombreExistente: existente.nombre,
        matchAproximado: coincidencia.tipo === 'aproximado',
      };

      const precioNuevo = moneda === 'Bs' ? precio / (tasa > 0 ? tasa : 1) : precio;
      const diff = Math.abs(existente.costoUSD - precioNuevo);

      if (diff < 0.001) return { ...base, estado: 'Sin cambios' };
      return { ...base, estado: 'Actualizar precio' };
    },
    [productosGuardados, tasa]
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

  const escanearImagen = useCallback(
    // Las notas son de un solo uso: la IA las lee para este escaneo y no se
    // guardan en ninguna parte. Sin notas, la lectura es la de siempre.
    async (blobImagen: Blob, notas = '') => {
      fijarError(null);
      fijarPaso('scanning');
      fijarIndiceMensajeCarga(0);

      const intervaloMensajes = setInterval(() => {
        fijarIndiceMensajeCarga((prev) => (prev + 1) % MENSAJES_CARGA.length);
      }, 2000);

      try {
        const resultado = await llamarGeminiVision(blobImagen, notas.trim());

        if (!resultado?.productos || resultado.productos.length === 0) {
          throw new Error('No se detectaron productos en la imagen. Intenta con una foto más clara.');
        }

        const proveedorCrudo = resultado.proveedor;
        const nombreDetectado =
          typeof proveedorCrudo === 'string' && proveedorCrudo.trim() && proveedorCrudo.trim().toLowerCase() !== 'null'
            ? proveedorCrudo.trim()
            : null;
        setProveedor(nombreDetectado);
        if (nombreDetectado) {
          const coincidencia = proveedores.find((p) =>
            p.name.toLowerCase().includes(nombreDetectado.toLowerCase()) ||
            nombreDetectado.toLowerCase().includes(p.name.toLowerCase())
          );
          setProveedorId(coincidencia?.id ?? null);
        }

        const mapeados: ProductoFactura[] = resultado.productos.map((p) => {
          const moneda: 'USD' | 'Bs' = p.moneda === 'USD' ? 'USD' : 'Bs';
          // p.precio ya paso por precioDeLaIA en llamarGeminiVision: es un
          // numero finito, no hace falta volver a convertirlo.
          const { precio, cantidadBulto, precioTotal } = normalizarBulto(
            p.precio,
            p.cantidad_bulto ?? null,
            p.nombre
          );
          const coincidencia = determinarEstado(p.nombre, precio, moneda);
          return {
            nombre: p.nombre,
            precio,
            precioTotal,
            precioOriginal: precio,
            precioTotalOriginal: precioTotal,
            moneda,
            unidad: p.unidad,
            cantidadBulto,
            seleccionado: coincidencia.estado !== 'Sin cambios',
            ...coincidencia,
            descuentoPv: 'mantener' as const,
            fotoUrl: null,
            fotoBlob: null,
            ganancia: GANANCIA_POR_DEFECTO,
            // La IA solo marca el IVA cuando la factura lo dice claro o cuando las
            // notas lo piden; si no, queda sin definir para elegirlo a mano.
            opcionIva: p.exento_iva === true ? 'no' : p.exento_iva === false ? 'yes' : null,
          };
        });

        setConDescuento(false);
        setDescuentoStr('');
        setProductos(mapeados);
        fijarPaso('review');
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido al analizar la factura.';
        fijarError(mensaje);
        fijarPaso('idle');
      } finally {
        clearInterval(intervaloMensajes);
      }
    },
    [llamarGeminiVision, determinarEstado, proveedores]
  );

  const ejecutarImportacion = useCallback(async () => {
    const seleccionados = productos.filter((p) => p.seleccionado);
    if (seleccionados.length === 0) return { creados: 0, actualizados: 0, cambiosPrecio: [] };

    fijarPaso('importing');
    fijarProgresoImportacion(0);
    fijarTotalImportacion(seleccionados.length);

    let creados = 0;
    let actualizados = 0;
    const productosConFallaDeFoto: string[] = [];
    const productosConFallaDeImportacion: string[] = [];
    // Precios que efectivamente cambiaron, para avisarle al usuario cuánto era
    // antes y cuánto quedó ahora.
    const cambiosPrecio: CambioPrecio[] = [];
    // Costo final en USD por fila, para dejarlo grabado en el historial
    const costoFinalPorFila = new Map<ProductoFactura, number>();
    const gananciaGlobal = parseFloat(gananciaGeneral) || GANANCIA_POR_DEFECTO;
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
      const costoUsd =
        producto.moneda === 'Bs'
          ? costoBase / (tasa > 0 ? tasa : 1)
          : costoBase;

      costoFinalPorFila.set(producto, costoUsd);

      const ganancia = modoGanancia === 'global' ? gananciaGlobal : producto.ganancia;

      // opcionIva 'no' → exento; cualquier otra cosa (yes o null) → con IVA por defecto
      const exentoIva = producto.opcionIva === 'no';

      try {
        if (producto.estado === 'Nuevo') {
          const idNuevo = await agregarProducto({
            nombre: producto.nombre,
            costo: costoUsd,
            moneda: 'USD',
            porcentajeGanancia: ganancia,
            exentoIva,
            urlFoto: null,
            idProveedor: proveedorId ?? null,
          });
          if (producto.fotoBlob && idNuevo) {
            try {
              const file = new File([producto.fotoBlob], `product_${idNuevo}.png`, { type: 'image/png' });
              const url = await subirImagenProducto(file, idNuevo);
              await actualizarProducto(idNuevo, { urlFoto: url });
            } catch (errorSubida) {
              console.error(`Error subiendo foto de "${producto.nombre}":`, errorSubida);
              productosConFallaDeFoto.push(producto.nombre);
            }
          }
          creados++;
        } else if (producto.estado === 'Actualizar precio' && producto.id !== null) {
          const cambios: { costo: number; moneda: 'USD'; exentoIva?: boolean } = {
            costo: costoUsd,
            moneda: 'USD',
          };
          if (producto.opcionIva !== null) cambios.exentoIva = exentoIva;
          await actualizarProducto(producto.id, cambios);
          if (producto.fotoBlob) {
            try {
              const file = new File([producto.fotoBlob], `product_${producto.id}.png`, { type: 'image/png' });
              const url = await subirImagenProducto(file, producto.id);
              await actualizarProducto(producto.id, { urlFoto: url });
            } catch (errorSubida) {
              console.error(`Error subiendo foto de "${producto.nombre}":`, errorSubida);
              productosConFallaDeFoto.push(producto.nombre);
            }
          }
          if (producto.precioAnterior !== null) {
            cambiosPrecio.push({
              nombre: producto.nombreExistente ?? producto.nombre,
              antes: producto.precioAnterior,
              ahora: costoUsd,
            });
          }
          actualizados++;
        }
      } catch (err) {
        console.error(`Error importando "${producto.nombre}":`, err);
        productosConFallaDeImportacion.push(producto.nombre);
      }

      fijarProgresoImportacion(i + 1);
    }

    if (productosConFallaDeImportacion.length > 0) {
      useAlmacenAvisos.getState().mostrar(
        `No se pudieron importar: ${productosConFallaDeImportacion.join(', ')}`,
        'error'
      );
    } else if (productosConFallaDeFoto.length > 0) {
      useAlmacenAvisos.getState().mostrar(
        `Se importó, pero la foto no se pudo subir para: ${productosConFallaDeFoto.join(', ')}`,
        'error'
      );
    }

    // Historial: se graba TODO lo que leyó la IA, no solo lo importado, y con
    // los mismos números que se vieron en la tabla de revisión (misma función
    // calcularFila), para que el historial no muestre otra cosa.
    const renglones: RenglonFactura[] = productos.map((p) => {
      const gananciaFila = modoGanancia === 'global' ? gananciaGlobal : p.ganancia;
      const { precioVenta, costoAGuardar } = calcularFila(
        p,
        gananciaFila,
        descuentoActivo ? pctDescuento : 0,
        tasa
      );
      return {
        nombre: p.nombre,
        precioCosto: costoAGuardar,
        precioVenta,
        moneda: p.moneda,
        iva: p.opcionIva,
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
      proveedores.find((prov) => prov.id === proveedorId)?.name ?? proveedor ?? null;

    try {
      await useAlmacenHistorialFacturas.getState().guardarFactura({
        proveedorNombre: nombreProveedor,
        proveedorId: proveedorId ?? null,
        tasa: tasa,
        descuento: descuentoActivo ? pctDescuento : null,
        totalRenglones: renglones.length,
        creados,
        actualizados,
        renglones,
      });
    } catch {
      // Los productos ya se importaron bien; solo se perdió el registro.
      useAlmacenAvisos.getState().mostrar(
        'Los productos se importaron, pero la factura no se pudo guardar en el historial.',
        'error'
      );
    }

    const resultado = { creados, actualizados, cambiosPrecio };
    fijarResultadoImportacion(resultado);
    return resultado;
  }, [productos, proveedorId, proveedor, proveedores, tasa, agregarProducto, actualizarProducto, gananciaGeneral, modoGanancia, conDescuento, descuento]);

  const actualizarFila = useCallback((indice: number, cambios: Partial<ProductoFactura>) => {
    setProductos((prev) => prev.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));
  }, []);

  /**
   * Precio de costo corregido a mano cuando la IA se equivocó al leerlo.
   * Recalcula TODO a partir del valor escrito: total del bulto, descuento y el
   * estado (Nuevo / Actualizar precio / Sin cambios), que se compara de nuevo
   * contra los productos ya registrados.
   */
  const setPrecioManual = useCallback(
    (indice: number, valorCrudo: string) => {
      // convertirEntradaANumero entiende la coma decimal (11154,34). Con parseFloat
      // crudo se perdían los decimales, porque corta en la coma.
      const base = convertirEntradaANumero(valorCrudo);
      // Mientras el campo está vacío o en 0 no se toca el cálculo: antes un 0
      // intermedio ponía el precio de venta en 0 y parecía que se había roto.
      if (!(base > 0)) return;

      const pct = conDescuento ? parseFloat(descuento) : NaN;
      const factor = !isNaN(pct) && pct > 0 && pct < 100 ? 1 - pct / 100 : 1;

      setProductos((prev) =>
        prev.map((p, i) => {
          if (i !== indice) return p;
          // El valor escrito pasa a ser la base: el descuento se aplica sobre él
          const precio = base * factor;
          const cantidad = p.cantidadBulto && p.cantidadBulto > 1 ? p.cantidadBulto : null;
          return {
            ...p,
            precioOriginal: base,
            precioTotalOriginal: cantidad ? base * cantidad : null,
            precio,
            precioTotal: cantidad ? precio * cantidad : null,
            ...determinarEstado(p.nombre, precio, p.moneda),
          };
        })
      );
    },
    [conDescuento, descuento, determinarEstado]
  );

  const alternarTodos = useCallback((marcado: boolean) => {
    setProductos((prev) => prev.map((p) => ({ ...p, seleccionado: marcado })));
  }, []);

  const fijarIvaTodos = useCallback((opcion: OpcionIva) => {
    setProductos((prev) => prev.map((p) => ({ ...p, opcionIva: opcion })));
  }, []);

  const reiniciar = useCallback(() => {
    fijarPaso('idle');
    setProductos([]);
    setProveedor(null);
    setProveedorId(null);
    fijarError(null);
    fijarProgresoImportacion(0);
    fijarTotalImportacion(0);
    fijarResultadoImportacion(null);
    setConDescuento(false);
    setDescuentoStr('');
  }, []);

  return {
    paso,
    fijarPaso,
    productos,
    proveedor,
    proveedorId,
    setProveedorId,
    error,
    fijarError,
    progresoImportacion,
    totalImportacion,
    resultadoImportacion,
    indiceMensajeCarga,
    gananciaGeneral,
    fijarGananciaGeneral,
    modoGanancia,
    fijarModoGanancia,
    conDescuento,
    toggleDescuento,
    descuento,
    setDescuento,
    escanearImagen,
    ejecutarImportacion,
    actualizarFila,
    setPrecioManual,
    alternarTodos,
    fijarIvaTodos,
    reiniciar,
  };
}
