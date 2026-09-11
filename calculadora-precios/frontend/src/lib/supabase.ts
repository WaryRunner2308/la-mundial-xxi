import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { URL_SUPABASE, CLAVE_ANONIMA } from './configuracion';

if (!URL_SUPABASE || !CLAVE_ANONIMA) {
  throw new Error('Faltan las credenciales de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(URL_SUPABASE, CLAVE_ANONIMA);

/**
 * Sube una imagen al bucket 'product-images' de Supabase Storage.
 * Nota: el bucket debe existir y estar marcado como 'public' en el panel de Supabase.
 *
 * OJO: el nombre del bucket y la ruta del archivo son identificadores remotos.
 * No se traducen: las imágenes ya subidas viven en esas rutas exactas.
 */
export async function subirImagenProducto(archivo: File, idProducto: number): Promise<string> {
  const extension = archivo.name.split('.').pop() || 'png';
  const ruta = `products/product_${idProducto}.${extension}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(ruta, archivo, {
      cacheControl: '3600',
      upsert: true,
      contentType: archivo.type
    });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  const { data: datosUrl } = supabase.storage
    .from('product-images')
    .getPublicUrl(ruta);

  return datosUrl.publicUrl;
}

/**
 * Elimina la imagen de un producto de Supabase Storage.
 */
export async function eliminarImagenProducto(idProducto: number): Promise<void> {
  const extensiones = ['png', 'jpg', 'jpeg', 'webp'];
  const rutas = extensiones.map(ext => `products/product_${idProducto}.${ext}`);
  await supabase.storage.from('product-images').remove(rutas);
}
