"use client";

import { useEffect, useRef, useState } from "react";
import { Bitcoin, CheckCircle2, CreditCard, Loader2, MessageCircle, Smartphone, X } from "lucide-react";
import { clsx } from "clsx";
import { calcTotals, DEPARTAMENTOS, FREE_SHIPPING_MIN, usd, type FrameOption } from "@/data/frames";

type MethodId = "card" | "chivo" | "payphone";
type Status = "idle" | "processing" | "success";

const METHODS: { id: MethodId; name: string; hint: string; icon: typeof CreditCard }[] = [
  { id: "card", name: "Tarjeta de Crédito / Débito", hint: "Visa, Mastercard", icon: CreditCard },
  { id: "chivo", name: "Chivo Wallet / Bitcoin", hint: "Pagá en sats, vos sabés ⚡", icon: Bitcoin },
  { id: "payphone", name: "PayPhone", hint: "Pago rápido desde tu cel", icon: Smartphone },
];

interface Props {
  open: boolean;
  onClose: () => void;
  option: FrameOption;
  styleName?: string;
}

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");

const field =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#FFD100] focus:outline-none";

export default function CheckoutModal({ open, ...rest }: Props) {
  // Mounting only while open resets the internal state on every opening.
  return open ? <ModalBody {...rest} /> : null;
}

function ModalBody({ onClose, option, styleName }: Omit<Props, "open">) {
  const [method, setMethod] = useState<MethodId>("card");
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", phone: "", depto: "", municipio: "", address: "", ref: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "processing") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [status, onClose]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "Poné tu nombre completo";
    if (form.phone.replace(/\D/g, "").length !== 8) e.phone = "Teléfono de 8 dígitos";
    if (!form.depto) e.depto = "Elegí tu departamento";
    if (!form.municipio.trim()) e.municipio = "Poné tu municipio";
    if (form.address.trim().length < 8) e.address = "Poné la dirección completa";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pay = () => {
    if (!validate()) return;
    setStatus("processing");
    timer.current = setTimeout(async () => {
      setStatus("success");
      const confetti = (await import("canvas-confetti")).default;
      const colors = ["#0047AB", "#FFD100", "#FFFFFF"];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
      }, 250);
    }, 1800);
  };

  function buildMessage() {
    const shipping = totals.shipping === 0 ? "GRATIS" : usd(totals.shipping ?? 0);
    return [
      "¡Hola GuanacoPet AI! 🇸🇻 Quiero confirmar mi pedido:",
      "",
      `🎨 Estilo: ${styleName ?? "—"}`,
      `🖼️ Cuadro: ${option.framed ? option.name : "Sin marco (impresión HD)"} (${option.size})`,
      `💵 Subtotal: ${usd(totals.subtotal)}`,
      `🚚 Envío: ${shipping}`,
      `✅ Total: ${usd(totals.total ?? totals.subtotal)}`,
      `💳 Método de pago: ${methodName}`,
      "",
      `👤 Nombre: ${form.name.trim()}`,
      `📞 Teléfono: ${form.phone.trim()}`,
      `📍 Departamento: ${form.depto}`,
      `🏘️ Municipio: ${form.municipio.trim()}`,
      `🏠 Dirección: ${form.address.trim()}`,
      form.ref.trim() ? `🧭 Referencia: ${form.ref.trim()}` : "",
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n")
      .trim();
  }

  const totals = calcTotals(option.price, form.depto);
  const methodName = METHODS.find((m) => m.id === method)?.name ?? "";
  const waLink = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage())}` : null;
  const busy = status === "processing";
  const err = (k: string) =>
    errors[k] ? <span className="mt-1 block text-xs text-red-400">{errors[k]}</span> : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 shadow-2xl sm:rounded-3xl"
      >
        {status === "success" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            <h2 id="checkout-title" className="mt-4 text-2xl font-extrabold text-[#FFD100]">
              ¡Pedido listo, vos! 🎉
            </h2>
            <p className="mt-2 text-zinc-400">
              Tu cuadro {option.framed ? `${option.name.toLowerCase()} (${option.size})` : "sin marco"}
              {styleName ? ` de «${styleName}»` : ""} va para {form.municipio}, {form.depto}. Tocá el botón para enviarnos tu
              pedido por WhatsApp y coordinar la entrega.
            </p>
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-lg font-extrabold text-zinc-900 shadow-lg hover:bg-[#1fbd5a]"
              >
                <MessageCircle className="h-5 w-5" /> Enviar pedido por WhatsApp
              </a>
            ) : (
              <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-200">
                Falta configurar NEXT_PUBLIC_WHATSAPP_NUMBER para enviar el pedido por WhatsApp.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-2xl border border-zinc-700 py-3 font-bold text-zinc-200 hover:bg-zinc-800"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 id="checkout-title" className="text-xl font-extrabold text-[#FFD100]">
                  Tu pedido 🖼️
                </h2>
                <p className="text-sm text-zinc-500">Pago simulado, no se cobra nada.</p>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                aria-label="Cerrar"
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-700 bg-[#0047AB]/20 px-4 py-3">
              <span>
                <span className="block font-bold">
                  {option.framed ? `Cuadro ${option.name}` : "Impresión sin marco"}
                </span>
                <span className="text-xs text-zinc-400">
                  {option.size} · {option.use}
                </span>
              </span>
              <span className="text-xl font-extrabold text-[#FFD100]">{usd(option.price)}</span>
            </div>

            <fieldset disabled={busy} className="mt-5 space-y-3">
              <legend className="mb-1 font-bold">📍 Dirección de entrega</legend>
              <label className="block">
                <input className={field} placeholder="Nombre completo" autoComplete="name" value={form.name} onChange={set("name")} />
                {err("name")}
              </label>
              <label className="block">
                <input className={field} placeholder="Teléfono (8 dígitos)" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={set("phone")} />
                {err("phone")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <select className={field} value={form.depto} onChange={set("depto")} aria-label="Departamento">
                    <option value="">Departamento</option>
                    {DEPARTAMENTOS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {err("depto")}
                </label>
                <label className="block">
                  <input className={field} placeholder="Municipio" value={form.municipio} onChange={set("municipio")} />
                  {err("municipio")}
                </label>
              </div>
              <label className="block">
                <textarea className={field} rows={2} placeholder="Colonia, calle, casa #" autoComplete="street-address" value={form.address} onChange={set("address")} />
                {err("address")}
              </label>
              <input className={field} placeholder="Punto de referencia (opcional)" value={form.ref} onChange={set("ref")} />
            </fieldset>

            <dl className="mt-5 space-y-1.5 rounded-2xl border border-zinc-700 bg-zinc-800/50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Subtotal</dt>
                <dd>{usd(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Envío{form.depto ? ` (${form.depto})` : ""}</dt>
                <dd className={totals.freeShipping ? "font-bold text-emerald-400" : ""}>
                  {totals.shipping === null ? "Elegí departamento" : totals.freeShipping ? "¡GRATIS!" : usd(totals.shipping)}
                </dd>
              </div>
              {!totals.freeShipping && (
                <p className="text-xs text-[#FFD100]">
                  Envío gratis en pedidos de {usd(FREE_SHIPPING_MIN)} o más.
                </p>
              )}
              <div className="flex justify-between border-t border-zinc-700 pt-2 text-base font-extrabold">
                <dt>Total</dt>
                <dd className="text-[#FFD100]">{totals.total === null ? "—" : usd(totals.total)}</dd>
              </div>
            </dl>

            <div role="radiogroup" aria-label="Método de pago" className="mt-5 space-y-2">
              <p className="font-bold">💳 Método de pago</p>
              {METHODS.map(({ id, name, hint, icon: Icon }) => {
                const active = method === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => setMethod(id)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition",
                      active ? "border-[#FFD100] bg-[#0047AB]/20" : "border-zinc-700 hover:border-zinc-500",
                    )}
                  >
                    <span
                      className={clsx(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                        active ? "bg-[#0047AB] text-white" : "bg-zinc-800 text-zinc-400",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{name}</span>
                      <span className="block text-xs text-zinc-400">{hint}</span>
                    </span>
                    <span
                      className={clsx(
                        "h-5 w-5 rounded-full border-2",
                        active ? "border-[#FFD100] bg-[#FFD100]" : "border-zinc-600",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <button
              onClick={pay}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD100] py-3.5 text-lg font-extrabold text-zinc-900 shadow-md transition hover:bg-[#f2c600] disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Procesando…
                </>
              ) : (
                totals.total === null ? "Pagar" : `Pagar ${usd(totals.total)}`
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
