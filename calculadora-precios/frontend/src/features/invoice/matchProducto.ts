import type { Product } from '@/store/productStore';

// ============================================================================
//  Emparejador de productos de factura contra los productos ya registrados.
//
//  El problema: la factura del proveedor casi nunca escribe el nombre igual que
//  nosotros. "MANTEQ. MAVESA 250 GRS" y "Mantequilla Mavesa 250g" son el mismo
//  producto, pero una comparacion exacta de texto los ve distintos y crea un
//  duplicado en vez de actualizar el precio.
//
//  La regla dura: si AMBOS nombres traen gramaje/volumen y NO coinciden, no hay
//  match. La mantequilla de 250g y la de 500g son productos diferentes y
//  confundirlas dañaria el precio de venta.
// ============================================================================

// Umbral de aceptacion. Debajo de esto el producto se trata como Nuevo.
const UMBRAL = 0.7;

// Minimo de letras para aceptar una abreviatura por prefijo (MANTEQ ~ MANTEQUILLA).
const MIN_PREFIJO = 4;

// Palabras que no aportan identidad al producto.
const RUIDO = new Set([
  'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'CON', 'EN', 'A', 'AL',
  'UND', 'UNI', 'UNID', 'UNIDAD', 'UNIDADES', 'PZA', 'PZAS', 'PIEZA', 'PIEZAS',
  'CU', 'MARCA', 'PROD', 'PRODUCTO', 'ART', 'ARTICULO', 'REF',
]);

function sinAcentos(texto: string): string {
  // ̀-ͯ = marcas de acento que NFD separa de la letra base
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function aNumero(crudo: string): number {
  return parseFloat(crudo.replace(',', '.')) || 0;
}

// Lleva todo gramaje a G y todo volumen a ML para que "1KG" y "1000 GRS" queden
// escritos igual. El orden importa: KG antes que G, ML antes que L.
function normalizarMedidas(texto: string): string {
  return texto
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:KGS?|KILOS?|KILOGRAMOS?)\b/g, (_m, n) => `${Math.round(aNumero(n) * 1000)}G`)
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:GRS?|GRAMOS?|G)\b/g, (_m, n) => `${Math.round(aNumero(n))}G`)
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:MLS?|CC|CM3)\b/g, (_m, n) => `${Math.round(aNumero(n))}ML`)
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:LTS?|LITROS?|L)\b/g, (_m, n) => `${Math.round(aNumero(n) * 1000)}ML`);
}

function canonizar(nombre: string): string {
  let texto = sinAcentos(nombre.toUpperCase());
  // Los puntos de abreviatura ("MANTEQ.") y los guiones separan, no unen.
  texto = texto.replace(/[^A-Z0-9,.]+/g, ' ');
  texto = normalizarMedidas(texto);
  texto = texto.replace(/[^A-Z0-9]+/g, ' ');
  texto = texto.replace(/\s+/g, ' ').trim();
  // Reune las siglas que los puntos dejaron sueltas: "P.A.N." quedó como
  // "P A N" y debe volver a ser "PAN" para poder emparejar con "HARINA PAN".
  return texto.replace(/\b(?:[A-Z] )+[A-Z]\b/g, (sigla) => sigla.replace(/ /g, ''));
}

function tokenizar(nombre: string): string[] {
  const tokens = canonizar(nombre).split(' ').filter((t) => t.length > 0 && !RUIDO.has(t));
  return Array.from(new Set(tokens));
}

// Solo gramaje/volumen. El "12" de un bulto "1X12" no cuenta aca: eso lo maneja
// normalizarBulto en el escaner.
function medidas(tokens: string[]): string[] {
  return tokens.filter((t) => /^\d+(?:G|ML)$/.test(t)).sort();
}

// Que tanto cubre el token `a` al mejor token disponible de `b`.
function mejorCoincidenciaToken(a: string, tokensB: string[]): number {
  let mejor = 0;
  for (const b of tokensB) {
    if (a === b) return 1;
    const largoMin = Math.min(a.length, b.length);
    if (largoMin >= MIN_PREFIJO && (a.startsWith(b) || b.startsWith(a))) {
      mejor = Math.max(mejor, 0.85);
    }
  }
  return mejor;
}

/**
 * Similitud 0..1 entre dos nombres de producto.
 * Devuelve 0 cuando los gramajes/volumenes presentes no coinciden.
 */
export function similitudNombre(nombreA: string, nombreB: string): number {
  const tokensA = tokenizar(nombreA);
  const tokensB = tokenizar(nombreB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  if (tokensA.join(' ') === tokensB.join(' ')) return 1;

  const medidasA = medidas(tokensA);
  const medidasB = medidas(tokensB);
  if (medidasA.length > 0 && medidasB.length > 0 && medidasA.join('|') !== medidasB.join('|')) {
    return 0;
  }

  let sumaA = 0;
  for (const t of tokensA) sumaA += mejorCoincidenciaToken(t, tokensB);
  let sumaB = 0;
  for (const t of tokensB) sumaB += mejorCoincidenciaToken(t, tokensA);

  // Promedio de cobertura en ambos sentidos: penaliza tanto lo que falta como
  // lo que sobra, asi "MANTEQUILLA" no matchea todo lo que empiece igual.
  const cobertura = (sumaA / tokensA.length + sumaB / tokensB.length) / 2;

  // Exige al menos una palabra larga en comun (no basta que coincida el gramaje).
  const hayPalabraComun = tokensA.some(
    (t) => t.length >= MIN_PREFIJO && !/^\d/.test(t) && mejorCoincidenciaToken(t, tokensB) > 0
  );
  return hayPalabraComun ? cobertura : 0;
}

export interface CoincidenciaProducto {
  producto: Product;
  score: number;
  tipo: 'exacto' | 'aproximado';
}

/**
 * Busca en la lista de productos registrados el que corresponde al nombre leido
 * en la factura. Prioriza coincidencia exacta (ya normalizada); si no hay,
 * devuelve la mejor aproximada que pase el umbral.
 */
export function buscarProductoExistente(
  nombreFactura: string,
  productos: Product[]
): CoincidenciaProducto | null {
  const canonFactura = canonizar(nombreFactura);
  if (!canonFactura) return null;

  const exacto = productos.find((p) => canonizar(p.name) === canonFactura);
  if (exacto) return { producto: exacto, score: 1, tipo: 'exacto' };

  let mejor: CoincidenciaProducto | null = null;
  for (const producto of productos) {
    const score = similitudNombre(nombreFactura, producto.name);
    if (score >= UMBRAL && (mejor === null || score > mejor.score)) {
      mejor = { producto, score, tipo: 'aproximado' };
    }
  }
  return mejor;
}
