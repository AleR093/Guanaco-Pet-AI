"use client";

import type { ObjectDetection } from "@tensorflow-models/coco-ssd";

// Clases COCO que aceptamos como "mascota / animal".
const ANIMALS = new Set(["cat", "dog", "bird", "horse", "sheep", "cow", "bear"]);
const MIN_SCORE = 0.4;

let model: Promise<ObjectDetection> | null = null;

function loadModel() {
  model ??= (async () => {
    await import("@tensorflow/tfjs");
    const coco = await import("@tensorflow-models/coco-ssd");
    return coco.load({ base: "lite_mobilenet_v2" });
  })().catch((e) => {
    model = null; // permitir reintento
    throw e;
  });
  return model;
}

/** Corre en el navegador (la foto no sale del dispositivo en este paso).
 *  Devuelve la especie detectada (clase COCO) o null si no hay animal. */
export async function detectAnimal(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const detector = await loadModel();
    const found = await detector.detect(img, 5, MIN_SCORE);
    return found.find((p) => ANIMALS.has(p.class))?.class ?? null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reduce la foto (máx. 1024 px, JPEG) para enviarla a la API. */
export async function toDataUrl(file: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
