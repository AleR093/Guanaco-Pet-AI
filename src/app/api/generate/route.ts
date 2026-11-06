import { NextResponse } from "next/server";
import { STYLES, type StyleId } from "@/data/styles";

export const maxDuration = 60;

/**
 * Generación con Pollinations.ai (sin Replicate, sin tarjeta).
 *
 * Modo A — con POLLINATIONS_API_KEY (clave gratis de https://enter.pollinations.ai):
 *   edición imagen→imagen (POST /v1/images/edits). Se envía la foto real de la mascota
 *   en base64 + el prompt del estilo, así que el resultado conserva a TU mascota.
 * Modo B — sin clave: API anónima (image.pollinations.ai, modelo "sana"). Solo acepta texto,
 *   así que la foto NO se usa; se genera una mascota de la misma especie. Límite del
 *   servicio: 1 imagen cada 45 s por IP (compartido por todos los visitantes).
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
const BASE_RULES =
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
const EDIT_MODEL = process.env.POLLINATIONS_MODEL || "black-forest-labs/flux.2-klein-4b";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const toDataUrl = (buf: ArrayBuffer, type: string) =>
  `data:${type};base64,${Buffer.from(buf).toString("base64")}`;

async function editWithPhoto(key: string, image: string, prompt: string, species: string) {
  const animal = species === "pet" ? "pet" : species;
  const res = await fetch("https://gen.pollinations.ai/v1/images/edits", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: EDIT_MODEL,
      prompt: `Edit this photo: keep the same ${animal} exactly as it is in the photo (same face, body and fur) and place it ${prompt}. ${BASE_RULES} ${NEGATIVE}`,
      image: [{ image_url: image }],
      n: 1,
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw new Error(`pollinations edits ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const item = json?.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (typeof item?.url === "string") {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(20_000) });
    if (img.ok) return toDataUrl(await img.arrayBuffer(), img.headers.get("content-type") || "image/png");
  }
  throw new Error("pollinations edits: respuesta sin imagen");
}

async function textOnly(species: string, prompt: string, seed: number) {
  const text = `Cute illustration of a real ${species} with a natural ${species} body on four legs, ${species} face, fur and snout, ${prompt}. ${BASE_RULES} ${NEGATIVE}`;
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}` +
    `?model=sana&width=768&height=768&nologo=true&seed=${seed}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(55_000) });
  if (res.status === 402 || res.status === 429) {
    const wait = /(\d+)s/.exec(await res.text())?.[1];
    const e = new Error("rate-limit") as Error & { wait?: string };
    e.wait = wait;
    throw e;
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) throw new Error(`pollinations anon ${res.status}`);
  return toDataUrl(await res.arrayBuffer(), type);
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

  const key = process.env.POLLINATIONS_API_KEY;
  try {
    const result = key
      ? await editWithPhoto(key, image, PROMPTS[style.id], species)
      : await textOnly(species, PROMPTS[style.id], Math.floor(Math.random() * 1e6));
    return NextResponse.json({ image: result, usedPhoto: !!key });
  } catch (e) {
    if (e instanceof Error && e.message === "rate-limit") {
      const wait = (e as Error & { wait?: string }).wait;
      return fail(
        `Hay mucha gente transformando bichos. Probá de nuevo${wait ? ` en ${wait} segundos` : " en un minuto"}.`,
        429,
      );
    }
    console.error("[api/generate]", e);
    return fail("No pudimos transformar la foto. Intentá de nuevo.", 502);
  }
}
