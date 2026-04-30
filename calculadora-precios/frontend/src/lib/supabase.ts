import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_URL, ANON_KEY } from './config';

const supabaseUrl = API_URL;
const supabaseAnonKey = ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload image to Supabase Storage bucket 'product-images'
 * Note: Bucket must exist and be set to 'public' in Supabase Dashboard
 */
export async function uploadProductImage(file: File, productId: number): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `products/product_${productId}.${fileExt}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete product image from Supabase Storage
 */
export async function deleteProductImage(productId: number): Promise<void> {
  const exts = ['png', 'jpg', 'jpeg', 'webp'];
  const paths = exts.map(ext => `products/product_${productId}.${ext}`);
  await supabase.storage.from('product-images').remove(paths);
}
