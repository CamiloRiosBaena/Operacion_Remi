import { supabase } from './supabase';

const BUCKET = 'platos';

/**
 * Sube un archivo de imagen al bucket de Supabase Storage y devuelve la URL pública.
 * El bucket debe existir y tener política de lectura pública.
 */
export async function uploadPlatoImage(file: File): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(`Error al subir imagen: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
