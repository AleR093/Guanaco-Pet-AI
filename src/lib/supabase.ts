import "server-only"; // rompe el build si algún componente de cliente intenta importar este módulo
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase SOLO para el servidor (rutas API).
 * Usa la clave secreta (service role), que ignora RLS: por eso vive en una variable SIN el
 * prefijo NEXT_PUBLIC_ y nunca llega al navegador. El cliente no sube nada directamente.
 */
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // la URL no es secreta
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function init(): SupabaseClient | null {
  if (!serviceKey) {
    console.error(
      "[supabase] Falta SUPABASE_SERVICE_ROLE_KEY (clave secreta, SIN prefijo NEXT_PUBLIC_). " +
        "Supabase desactivado: las imágenes no se guardarán ni habrá link en el mensaje de WhatsApp.",
    );
    return null;
  }
  if (!url || !/^https?:\/\//.test(url)) {
    console.error(
      "[supabase] SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL no es una URL válida (https://<proyecto>.supabase.co). " +
        "Supabase desactivado.",
    );
    return null;
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** null si Supabase no está bien configurado (la app sigue generando imágenes sin guardarlas). */
export const supabase = init();

export const GENERATIONS_BUCKET = "pet-generations";
