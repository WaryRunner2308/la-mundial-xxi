-- ============================================================================
--  LA MUNDIAL XXI — Seguridad de la base de datos (Row Level Security / RLS)
-- ============================================================================
--  Problema que resuelve:
--  El anon key viaja al navegador (es público por diseño). SIN estas políticas,
--  cualquiera puede sacarlo de las DevTools y leer/modificar/borrar TODO con un
--  simple fetch. Con RLS activo, la base de datos decide qué se permite, sin
--  importar quién tenga el anon key.
--
--  Modelo de acceso:
--    • Invitado  = usuario anónimo (rol "anon")          → SOLO LECTURA
--    • Gerencia  = usuario autenticado (rol "authenticated") → leer + escribir
--
--  Cómo aplicar:
--    1. Supabase Dashboard → SQL Editor → New query
--    2. Pega TODO este archivo y ejecútalo (RUN).
--    3. Crea el usuario de gerencia (ver el bloque del final).
-- ============================================================================


-- ─── 1) Activar RLS en las tablas ──────────────────────────────────────────
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;


-- ─── 2) Limpieza: borrar políticas previas con estos nombres (idempotente) ──
DROP POLICY IF EXISTS "products_select_publico"   ON public.products;
DROP POLICY IF EXISTS "products_insert_gerencia"  ON public.products;
DROP POLICY IF EXISTS "products_update_gerencia"  ON public.products;
DROP POLICY IF EXISTS "products_delete_gerencia"  ON public.products;

DROP POLICY IF EXISTS "proveedores_select_publico"  ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_insert_gerencia" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_update_gerencia" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_delete_gerencia" ON public.proveedores;


-- ─── 3) Políticas tabla PRODUCTS ───────────────────────────────────────────
-- Leer: cualquiera (invitado incluido). La app necesita mostrar los productos.
CREATE POLICY "products_select_publico"
  ON public.products FOR SELECT
  USING (true);

-- Crear / editar / borrar: SOLO el usuario de gerencia (pumpo@lamundial.app).
-- "TO authenticated" no basta por sí solo: si el proyecto llega a permitir
-- registro público, cualquier cuenta nueva quedaría "authenticated" y podría
-- escribir. El check por email ata el permiso a la cuenta real de gerencia.
CREATE POLICY "products_insert_gerencia"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "products_update_gerencia"
  ON public.products FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app')
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "products_delete_gerencia"
  ON public.products FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');


-- ─── 4) Políticas tabla PROVEEDORES ────────────────────────────────────────
CREATE POLICY "proveedores_select_publico"
  ON public.proveedores FOR SELECT
  USING (true);

CREATE POLICY "proveedores_insert_gerencia"
  ON public.proveedores FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "proveedores_update_gerencia"
  ON public.proveedores FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app')
  WITH CHECK (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "proveedores_delete_gerencia"
  ON public.proveedores FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'pumpo@lamundial.app');


-- ─── 5) Storage: bucket "product-images" ───────────────────────────────────
-- Lectura pública de las fotos; subir/borrar solo gerencia (mismo check de email).
DROP POLICY IF EXISTS "product_images_read_publico"   ON storage.objects;
DROP POLICY IF EXISTS "product_images_write_gerencia" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update_gerencia" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete_gerencia" ON storage.objects;

CREATE POLICY "product_images_read_publico"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_write_gerencia"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "product_images_update_gerencia"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'pumpo@lamundial.app')
  WITH CHECK (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'pumpo@lamundial.app');

CREATE POLICY "product_images_delete_gerencia"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.jwt() ->> 'email' = 'pumpo@lamundial.app');


-- ============================================================================
--  6) CREAR EL USUARIO DE GERENCIA
-- ============================================================================
--  El login de la app traduce el usuario "pumpo" al email "pumpo@lamundial.app".
--  Crea ese usuario así (NO se puede crear un auth user solo con SQL):
--
--    Dashboard → Authentication → Users → "Add user" → "Create new user"
--       Email:    pumpo@lamundial.app
--       Password: (la clave que quieras; puede ser la de siempre)
--       ✅ Marca "Auto Confirm User" (para que no pida confirmar correo)
--
--  A partir de ahí, en la app:
--       Usuario:    pumpo
--       Contraseña: la que pusiste arriba
--
--  Para cambiar la clave en el futuro: mismo panel → el usuario → "Reset password"
--  o "Update password". Ya no hay claves escritas en el código.
-- ============================================================================
