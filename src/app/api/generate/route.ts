import { NextResponse } from "next/server";
import { STYLES, type StyleId } from "@/data/styles";
import { GENERATIONS_BUCKET, supabase } from "@/lib/supabase";

export const maxDuration = 60;

/**
 * Generación con Fal.ai, modelo FLUX.1 Kontext [pro] (edición imagen→imagen, conserva al sujeto de la foto).
 * REST síncrono: POST https://fal.run/{modelo} con la foto como data URI. Requiere FAL_KEY en .env.local.
 */

/**
 * Cada estilo describe ACCESORIOS pequeños + ESCENA. Nunca ropa humana completa ni poses humanas.
 * La anatomía del animal la fijan BASE_RULES y NEGATIVE (el endpoint de edición no tiene
 * campo negative_prompt, así que las restricciones van dentro de la descripción).
 */
const PROMPTS: Record<StyleId, string> = {
  procer:
    "sitting proudly on a stone pedestal in a park plaza in San Salvador, El Salvador, like a monument statue of a national hero. Accessories only: a small military kepi hat on its head and a gold-trimmed ceremonial sash with a medal across its chest. Blue sky, jacaranda trees and old colonial buildings behind it",
  cumbiero:
    "sitting on a stage at a lively Salvadoran street sonidero party with colorful lights. Accessories only: a small straw sombrero on its head, a colorful bandana (pañoleta) around its neck and tiny sunglasses. A toy accordion and a microphone rest on the floor next to it",
  pupusero:
    "sitting beside a rustic wooden counter at a Salvadoran pupusería. Accessories only: a small apron tied around its neck and chest and a small chef hat. In front of it are a plate of golden pupusas with curtido (cabbage slaw) and red salsa, and a clay comal with smoke rising",
  bicho:
    "sitting on a sidewalk in a colorful Salvadoran neighborhood (colonia) with street murals and small corner shops. Accessories only: a small backwards cap and a blue and white El Salvador national team scarf around its neck. A skateboard and a bag of snacks rest next to it",
  heroe:
    "standing on all four legs in a heroic pose on a rooftop at sunset, with the San Salvador volcano skyline behind it. Accessories only: a small blue and white cape tied at its neck, with the El Salvador flag colors, and a small eye mask. Comic-book illustration style",
};

const SPECIES = new Set(["cat", "dog", "bird", "horse", "sheep", "cow", "bear"]);
/** Instrucción inicial de fidelidad: va PRIMERO en el prompt de edición. */
const fidelity = (animal: string) =>
  `Exact same ${animal} from the input image, exact same breed, same fur color, markings and coat length, ` +
  `same ear shape and size, same face features and proportions, same body proportions, ` +
  `natural 4-legged quadruped position, all four paws on the ground or surface. ` +
  `Do not replace it with a different breed or a different animal.`;

const BASE_RULES =
  "MANDATORY POSE: the animal sits on its haunches or stands on all four legs, with its body horizontal like a real pet in a photo; its front legs are normal animal legs, never raised or used like arms. " +
  "Keep the animal's real anatomy: a four-legged pet with its natural body and a natural resting or standing posture on all four legs. " +
  "Preserve the exact face shape, snout, ears, eyes, fur colors and markings of the animal in the original photo so it is clearly the same pet. " +
  "The animal stays an animal; the Salvadoran theme comes only from the small accessories and the scene. " +
  "Fun, charming, high quality digital illustration.";
const NEGATIVE =
  "Do NOT make the animal stand or walk on two legs. Do NOT give it a human body, human hands, human arms or human legs. " +
  "Do NOT put full human clothes, a shirt with sleeves, pants or shoes on it. Do NOT change the animal's face shape, species, size or fur color. " +
  "No humans in the scene, no text, no watermark.";
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_BYTES = 4 * 1024 * 1024;
const FAL_MODEL = "fal-ai/flux-pro/kontext";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const toDataUrl = (buf: ArrayBuffer, type: string) =>
  `data:${type};base64,${Buffer.from(buf).toString("base64")}`;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Sube la imagen generada al bucket público desde el SERVIDOR (clave secreta, nunca expuesta al cliente)
 * y devuelve su URL pública, o null si no se pudo.
 */
async function saveToSupabase(dataUrl: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const [, type, b64] = m;
    const name = `pet_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${EXT[type] ?? "jpg"}`;
    const { error } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .upload(name, Buffer.from(b64, "base64"), { contentType: type, upsert: false });
    if (error) throw error;
    return supabase.storage.from(GENERATIONS_BUCKET).getPublicUrl(name).data.publicUrl;
  } catch (e) {
    // No bloquear al usuario: ya tiene su imagen; solo faltará el link en WhatsApp.
    console.error("[api/generate] supabase upload", e);
    return null;
  }
}

class FalError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

async function generateWithFal(key: string, image: string, prompt: string, species: string) {
  const animal = species === "pet" ? "pet" : species;
  let res: Response;
  try {
    res = await fetch(`https://fal.run/${FAL_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${fidelity(animal)} Edit the input photo: keep this exact animal untouched, in a natural animal posture (not upright), and place it ${prompt}. ${BASE_RULES} ${NEGATIVE}`,
        image_url: image,
        num_images: 1,
        output_format: "jpeg",
        seed: Math.floor(Math.random() * 2_147_483_647),
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    console.error("[api/generate] error de red con Fal.ai", e);
    throw new FalError("No pudimos conectar con el servicio de IA. Intentá de nuevo.", 502);
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(`[api/generate] Fal.ai HTTP ${res.status}: ${detail}`);
    if (res.status === 402 || /exhausted balance|insufficient|locked/i.test(detail)) {
      throw new FalError("El servicio de IA está sin créditos en este momento. Intentá más tarde.", 503);
    }
    if (res.status === 401 || res.status === 403) throw new FalError("La FAL_KEY es inválida o no tiene permiso.", 503);
    if (res.status === 429) throw new FalError("Hay mucha gente transformando bichos. Probá de nuevo en un minuto.", 429);
    throw new FalError(`Fal.ai respondió HTTP ${res.status}.`);
  }
  const url: unknown = (await res.json())?.images?.[0]?.url;
  if (typeof url !== "string") throw new FalError("Fal.ai terminó sin devolver imagen.");
  const img = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!img.ok) throw new FalError("No se pudo descargar la imagen generada.");
  return toDataUrl(await img.arrayBuffer(), img.headers.get("content-type") || "image/jpeg");
}

export async function POST(req: Request) {
  let body: { image?: unknown; style?: unknown; species?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Solicitud inválida.", 400);
  }

  const style = STYLES.find((s) => s.id === body.style);
  if (!style) return fail("Estilo no válido.", 400);

  const image = body.image;
  if (typeof image !== "string" || image.length > MAX_BYTES * 1.4 || !DATA_URL.test(image)) {
    return fail("Imagen no válida o demasiado pesada.", 400);
  }
  const species = typeof body.species === "string" && SPECIES.has(body.species) ? body.species : "pet";

  const key = process.env.FAL_KEY?.trim();
  console.log("FAL_KEY DETECTADA:", key ? "SI" : "NO");
  if (!key) {
    console.error("[api/generate] FAL_KEY no está definida (¿falta en .env.local o no reiniciaste `next dev`?).");
    return fail("El servicio de IA no está configurado todavía (falta FAL_KEY).", 503);
  }
  try {
    const result = await generateWithFal(key, image, PROMPTS[style.id], species);
    console.log(`[api/generate] Fal.ai modelo=${FAL_MODEL} estilo=${style.id}`);
    const publicUrl = await saveToSupabase(result);
    return NextResponse.json({ image: result, publicUrl, usedPhoto: true });
  } catch (e) {
    if (e instanceof FalError) return fail(e.message, e.status);
    console.error("[api/generate]", e);
    return fail("No pudimos transformar la foto. Intentá de nuevo.", 502);
  }
}
