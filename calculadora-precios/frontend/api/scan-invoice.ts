import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Prompt y reglas de lectura de facturas: copia exacta de la que vivía en
// frontend/src/features/invoice/useInvoiceScanner.ts. No cambiar sin revisar
// también el parseo que hace el cliente del resultado.
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

// Modelos de Gemini en orden de preferencia: si el primero falla se intenta el siguiente.
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

function extraerJson(text: string): string {
  const sinFences = text.replace(/```json|```/g, '').trim();
  const start = sinFences.indexOf('{');
  const end = sinFences.lastIndexOf('}');
  if (start >= 0 && end > start) return sinFences.slice(start, end + 1);
  return sinFences;
}

async function verificarSesionGerencia(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers['authorization'];
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null;
  if (!token) return false;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  const autorizado = await verificarSesionGerencia(req);
  if (!autorizado) {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'El servidor no tiene configurada la clave de Gemini.' });
    return;
  }

  const { base64, mimeType } = (req.body ?? {}) as { base64?: string; mimeType?: string };
  if (!base64 || !mimeType) {
    res.status(400).json({ error: 'Falta la imagen a analizar.' });
    return;
  }

  const intentarConModelo = async (model: string) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: INVOICE_PROMPT },
            ],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errData?.error?.message ?? `Error Gemini: ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    };
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === 'MAX_TOKENS') {
      // Con temperature 0 el mismo modelo truncará igual: no tiene sentido reintentar
      const err = new Error('La respuesta quedó incompleta: la factura es muy larga.');
      (err as Error & { noRetry?: boolean }).noRetry = true;
      throw err;
    }
    const text = candidate?.content?.parts?.[0]?.text ?? '';

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
        const result = await intentarConModelo(model);
        res.status(200).json(result);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if ((lastError as Error & { noRetry?: boolean }).noRetry) break;
      }
    }
  }

  res.status(502).json({
    error: `No se pudo leer la factura (${lastError?.message ?? 'error desconocido'}). Intenta con una foto más clara y bien iluminada.`,
  });
}
