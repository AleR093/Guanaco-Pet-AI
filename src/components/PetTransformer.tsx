"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ImagePlus, Loader2, RefreshCw, ScanSearch, Zap } from "lucide-react";
import { clsx } from "clsx";
import FramingSection from "./FramingSection";
import { STYLES } from "@/data/styles";
import { detectAnimal, toDataUrl } from "@/lib/petDetector";
import { formatWait, MAX_TOKENS, useTokens } from "@/lib/tokens";

const MAX_MB = 10;

type Detect = "idle" | "checking" | "ok" | "no-pet" | "error";
type Phase = "edit" | "generating" | "done";

export default function PetTransformer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [species, setSpecies] = useState<string | null>(null);
  const [detect, setDetect] = useState<Detect>("idle");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("edit");
  const [result, setResult] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const checkId = useRef(0);
  const { ready: tokensReady, tokens, msLeft, consume, refund } = useTokens();

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const accept = useCallback(async (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Ese archivo no es una foto, vos 🙈");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`La foto pesa más de ${MAX_MB} MB`);
    setError(null);
    setPhase("edit");
    setResult(null);
    setPublicUrl(null);
    setGenError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f);
    previewRef.current = url;
    setPreview(url);
    setFile(f);
    setSpecies(null);
    setDetect("checking");
    const id = ++checkId.current;
    try {
      const found = await detectAnimal(f);
      if (id === checkId.current) {
        setSpecies(found);
        setDetect(found ? "ok" : "no-pet");
      }
    } catch {
      if (id === checkId.current) setDetect("error");
    }
  }, []);

  const selected = STYLES.find((s) => s.id === styleId);
  const noTokens = tokensReady && tokens <= 0;
  const ready = !!file && detect === "ok" && !!selected && tokens > 0 && phase !== "generating";

  const transform = async () => {
    if (!file || !selected || !consume()) return;
    setPhase("generating");
    setGenError(null);
    try {
      const image = await toDataUrl(file);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, style: selected.id, species }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.image) throw new Error(data.error || "Algo salió mal.");
      setResult(data.image);
      setPublicUrl(data.publicUrl ?? null);
      setPhase("done");
      setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      refund(); // si falló, no se le cobra el intento
      setGenError(`${e instanceof Error ? e.message : "Algo salió mal."} No se gastó tu token.`);
      setPhase("edit");
    }
  };

  const hint = !file
    ? "Falta la foto"
    : detect === "checking"
      ? "Revisando la foto…"
      : detect !== "ok"
        ? "Subí una foto con tu mascota"
        : !selected
          ? "Falta elegir el estilo"
          : null;

  return (
    <div className="space-y-8">
      {/* Cuota de tokens */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <span className="flex items-center gap-2 font-bold text-white" aria-live="polite">
          Tokens disponibles:
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD100] px-3 py-0.5 text-zinc-900">
            <Zap className="h-4 w-4 fill-current" />
            {tokensReady ? `${tokens}/${MAX_TOKENS}` : `–/${MAX_TOKENS}`}
          </span>
        </span>
        {tokensReady && tokens < MAX_TOKENS && tokens > 0 && (
          <span className="text-xs text-zinc-400">Recarga en {formatWait(msLeft)}</span>
        )}
      </div>

      {/* 1. Upload */}
      <section aria-labelledby="step-1">
        <h3 id="step-1" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-[#FFD100]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFD100] text-sm text-zinc-900">1</span>
          Subí la foto de tu bicho
        </h3>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files[0]);
          }}
          className={clsx(
            "relative overflow-hidden rounded-3xl border-2 border-dashed transition",
            dragging ? "border-[#FFD100] bg-[#FFD100]/10" : "border-[#0047AB] bg-zinc-900",
          )}
        >
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa de tu mascota" className="mx-auto max-h-80 w-full bg-zinc-950 object-contain" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-[#0047AB] px-4 py-2 text-sm font-bold text-white shadow-lg"
              >
                <RefreshCw className="h-4 w-4" /> Cambiar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 px-6 py-12 text-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#0047AB]/30 text-[#FFD100]">
                <ImagePlus className="h-8 w-8" />
              </span>
              <span className="text-lg font-bold text-white">Arrastrá la foto aquí</span>
              <span className="text-sm text-zinc-400">o tocá para elegir de tu galería (máx. {MAX_MB} MB)</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              accept(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div role="status" className="mt-2 text-sm font-medium">
          {detect === "checking" && (
            <p className="flex items-center gap-2 text-zinc-300">
              <ScanSearch className="h-4 w-4 animate-pulse text-[#FFD100]" /> Buscando a tu bicho en la foto…
            </p>
          )}
          {detect === "ok" && <p className="text-emerald-400">✅ ¡Mascota detectada! Todo chivo.</p>}
          {detect === "no-pet" && (
            <p className="flex items-start gap-2 text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> No vemos ningún chucho ni mishi en esa foto. Probá con otra donde se vea bien tu mascota.
            </p>
          )}
          {detect === "error" && (
            <p className="flex items-start gap-2 text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> No pudimos revisar la foto (¿sin internet?). Volvé a subirla.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-400">
            {error}
          </p>
        )}
      </section>

      {/* 2. Styles */}
      <section aria-labelledby="step-2">
        <h3 id="step-2" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-[#FFD100]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFD100] text-sm text-zinc-900">2</span>
          Elegí el estilo
        </h3>
        <div role="radiogroup" aria-labelledby="step-2" className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {STYLES.map((s) => {
            const active = s.id === styleId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStyleId(s.id)}
                className={clsx(
                  "rounded-2xl border-2 p-4 text-left transition active:scale-95",
                  active
                    ? "border-[#FFD100] bg-[#0047AB] text-white shadow-lg"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-600",
                )}
              >
                <span className="text-3xl">{s.emoji}</span>
                <span className="mt-2 block font-extrabold leading-tight">{s.name}</span>
                <span className={clsx("mt-1 block text-xs", active ? "text-blue-100" : "text-zinc-400")}>
                  {s.tag}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. CTA */}
      <div className="sticky bottom-3 z-10">
        {noTokens && (
          <p role="alert" className="mb-2 rounded-2xl border border-red-900 bg-red-950 p-3 text-center text-sm font-semibold text-red-200">
            ¡Te quedaste sin intentos por esta ronda! Tus {MAX_TOKENS} tokens se recargarán en {formatWait(msLeft)}.
          </p>
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={transform}
          className="w-full rounded-2xl bg-[#FFD100] py-4 text-lg font-extrabold text-zinc-900 shadow-xl transition enabled:hover:bg-[#f2c600] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          Transformar mi bicho 🚀 <span className="text-sm font-bold">(gratis · 1 token)</span>
        </button>
        {hint && !noTokens && <p className="mt-2 text-center text-xs text-zinc-400">{hint} para activar el botón</p>}
      </div>

      {genError && (
        <p role="alert" className="rounded-2xl border border-red-900 bg-red-950 p-3 text-center text-sm font-semibold text-red-200">
          {genError}
        </p>
      )}

      {phase === "generating" && (
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 font-bold text-zinc-200">
          <Loader2 className="h-5 w-5 animate-spin text-[#FFD100]" /> Convirtiendo a tu bicho en {selected?.name}…
        </p>
      )}

      {phase === "done" && result && selected && (
        <div id="resultado" className="scroll-mt-20 space-y-10">
          <section aria-label="Resultado" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <h3 className="text-xl font-extrabold text-white">¡Quedó chivo! {selected.emoji}</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result} alt="Tu mascota transformada" className="mx-auto mt-3 max-h-96 rounded-2xl object-contain" />
            <p className="mt-2 text-sm text-zinc-400">Estilo: {selected.name}</p>
          </section>
          <FramingSection image={result} imageUrl={publicUrl} styleName={selected.name} />
        </div>
      )}
    </div>
  );
}
