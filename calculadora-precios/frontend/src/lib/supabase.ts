import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_URL, ANON_KEY } from './config';

const supabaseUrl = API_URL;
const supabaseAnonKey = ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials not found. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload image to Supabase Storage bucket 'product-images'
 * Remember to create this bucket in Supabase Dashboard → Storage
 * Set bucket to 'public' for direct access
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
 * Delete image from Supabase Storage
 */
export async function deleteProductImage(productId: number): Promise<void> {
  // Intenta eliminar PNG y JPG
  const filePathPng = `products/product_${productId}.png`;
  const filePathJpg = `products/product_${productId}.jpg`;
  await supabase.storage.from('product-images').remove([filePathPng, filePathJpg]);
}

/**
 * Upload image to Supabase Storage bucket 'product-images'
 * Returns public URL
 */
export async function uploadImage(file: File, productId: number): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `product_${productId}.${fileExt}`;
  const filePath = `products/${fileName}`;

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
 * Delete image from Supabase Storage
 */
export async function deleteImage(productId: number): Promise<void> {
  const fileName = `product_${productId}.png`;
  const { error } = await supabase.storage.from('product-images').remove([`products/${fileName}`]);
  if (error) console.error('Error deleting image:', error);
}

/**
 * Upload image to Supabase Storage and return public URL
 * bucket: 'product-images'
 * path: `products/${productId或temp}/${filename}.png`
 */
export async function uploadProductImage(file: File, productId?: number): Promise<string> {
  const fileExt = 'png';
  const fileName = productId ? `product_${productId}.${fileExt}` : `temp_${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png'
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteProductImage(productId: number): Promise<void> {
  const filePath = `products/product_${productId}.png`;
  await supabase.storage.from('product-images').remove([filePath]);
}
