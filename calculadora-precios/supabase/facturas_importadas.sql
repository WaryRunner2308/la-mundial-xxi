-- ============================================================================
--  LA MUNDIAL XXI — Historial de facturas importadas con IA
-- ============================================================================
--  Qué guarda (SOLO TEXTO Y NÚMEROS — aquí no se guarda ninguna imagen):
--  Cada vez que se lee una factura con la IA y se confirma la importación, se
--  graba el proveedor, la fecha, la tasa del día y la lista completa de
--  renglones con los mismos datos que se vieron en pantalla al importar:
--  nombre, precio costo, precio venta, moneda, IVA, % ganancia y estado.
--  En la app esa lista se ve solo de lectura: no se puede editar.
--
--  Por qué se guarda en un jsonb y no en filas ligadas a products:
--  Es un registro histórico y los valores quedan congelados. Si mañana cambia
--  el precio de un producto, cambia la tasa o el producto se borra, la factura
--  de ayer tiene que seguir mostrando lo de ayer. Por eso tampoco hay llave
--  foránea a proveedores: borrar un proveedor no debe romper el historial.
--
--  Cómo aplicar:
--    1. Supabase Dashboard → SQL Editor → New query
--    2. Pega TODO este archivo y ejecútalo (RUN).
--
--  Es idempotente: se puede correr varias veces sin dañar nada.
-- ============================================================================


-- ─── 1) Tabla ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facturas_importadas (
  id                bigserial     PRIMARY KEY,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  proveedor_nombre  text,
  -- Sin FK a propósito (ver nota de arriba): es el proveedor al momento de importar
  proveedor_id      bigint,
  -- Tasa Bs/USD usada en esa importación, para poder reconstruir los cálculos
  tasa              numeric       NOT NULL DEFAULT 0,
  -- % de descuento de factura aplicado, NULL si no hubo
  descuento         numeric,
  total_items       integer       NOT NULL DEFAULT 0,
  creados           integer       NOT NULL DEFAULT 0,
  actualizados      integer       NOT NULL DEFAULT 0,
  -- Renglones de la factura tal como quedaron ese día (texto y números, sin imágenes)
  items             jsonb         NOT NULL DEFAULT '[]'::jsonb
);

-- El historial se lista siempre de lo más nuevo a lo más viejo.
CREATE INDEX IF NOT EXISTS facturas_importadas_created_at_idx
  ON public.facturas_importadas (created_at DESC);

-- Las notas que se le dan a la IA al importar NO se guardan aquí a propósito:
-- son de un solo uso, solo sirven para ese escaneo.
ALTER TABLE public.facturas_importadas
  DROP COLUMN IF EXISTS notas;


-- ─── 2) RLS: mismo modelo que products y proveedores ────────────────────────
--  Invitado (anon)          → solo lectura
--  Gerencia (pumpo@...)     → leer + escribir
ALTER TABLE public.facturas_importadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_select_publico"   ON public.facturas_importadas;
DROP POLICY IF EXISTS "facturas_insert_gerencia"  ON public.facturas_importadas;
DROP POLICY IF EXISTS "facturas_update_gerencia"  ON public.facturas_importadas;
DROP POLICY IF EXISTS "facturas_delete_gerencia"  ON public.facturas_importadas;

CREATE POLICY "facturas_select_publico"
  ON public.facturas_importadas FOR SELECT
  USING (true);

-- "TO authenticated" no basta: si el proyecto llegara a permitir registro
-- público, cualquier cuenta nueva quedaría authenticated. El check por email
-- ata el permiso a la cuenta real de gerencia.
CREATE POLICY "facturas_insert_gerencia"
  ON public.facturas_importadas FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "facturas_update_gerencia"
  ON public.facturas_importadas FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app')
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "facturas_delete_gerencia"
  ON public.facturas_importadas FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');


-- ============================================================================
--  NOTA sobre el borrado automático
-- ============================================================================
--  Por ahora NADA se borra solo: el historial se acumula completo.
--  Si algún día se quiere purgar lo viejo (ejemplo: más de 90 días), se corre:
--
--    DELETE FROM public.facturas_importadas
--    WHERE created_at < now() - interval '90 days';
--
--  Las facturas también se pueden borrar una por una desde la app, en la
--  pantalla "Facturas Importadas".
-- ============================================================================
