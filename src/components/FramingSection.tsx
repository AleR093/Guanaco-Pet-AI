"use client";

import { useState } from "react";
import { Check, Frame, Truck } from "lucide-react";
import { clsx } from "clsx";
import { FRAME_OPTIONS, usd, type FrameOption } from "@/data/frames";
import CheckoutModal from "./CheckoutModal";

interface Props {
  image: string;
  styleName: string;
}

export default function FramingSection({ image, styleName }: Props) {
  const [optionId, setOptionId] = useState(FRAME_OPTIONS[1].id);
  const [checkout, setCheckout] = useState(false);
  const option = FRAME_OPTIONS.find((o) => o.id === optionId) as FrameOption;

  return (
    <section id="enmarcado" aria-labelledby="frame-title" className="scroll-mt-20 space-y-5">
      <div>
        <h3 id="frame-title" className="flex items-center gap-2 text-xl font-extrabold text-white">
          <Frame className="h-6 w-6 text-[#FFD100]" /> Llévalo a tu casa enmarcado
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Tu bicho como «{styleName}» en la pared. Elegí el tamaño y te lo llevamos.
        </p>
      </div>

      {/* Mockup */}
      <div className="grid place-items-center rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div
          className={clsx(
            "w-40 overflow-hidden bg-zinc-100 transition-all duration-300 sm:w-48",
            option.framed
              ? "border-[10px] border-[#2b1d12] p-2 shadow-2xl ring-1 ring-black"
              : "shadow-xl ring-1 ring-white/20",
          )}
          style={{ aspectRatio: option.ratio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Tu mascota en el cuadro" className="h-full w-full object-cover" />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-300">
          {option.framed ? `Cuadro ${option.name.toLowerCase()} · ${option.size}` : "Impresión sin marco"}
        </p>
      </div>

      {/* Options */}
      <div role="radiogroup" aria-labelledby="frame-title" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FRAME_OPTIONS.map((o) => {
          const active = o.id === optionId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setOptionId(o.id)}
              className={clsx(
                "flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98]",
                active
                  ? "border-[#FFD100] bg-[#0047AB]/30"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-600",
              )}
            >
              <span>
                <span className="flex items-center gap-1.5 font-extrabold text-white">
                  {o.name}
                  {active && <Check className="h-4 w-4 text-[#FFD100]" />}
                </span>
                <span className="block text-sm text-zinc-400">
                  {o.size} · {o.use}
                </span>
                {!o.framed && <span className="text-xs text-zinc-500">Opcional, sin marco</span>}
              </span>
              <span className="text-lg font-black text-[#FFD100]">${o.price.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setCheckout(true)}
        className="w-full rounded-2xl bg-[#FFD100] py-4 text-lg font-extrabold text-zinc-900 shadow-xl transition hover:bg-[#f2c600] active:scale-[0.98]"
      >
        Pedir mi cuadro · {usd(option.price)}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
        <Truck className="h-3.5 w-3.5" /> Envío $3 (San Salvador y La Libertad) · $4 resto del país · ¡GRATIS desde $30!
      </p>

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} option={option} styleName={styleName} />
    </section>
  );
}
