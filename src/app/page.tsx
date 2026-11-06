import { Sparkles, Upload, Wand2, Frame } from "lucide-react";
import PetTransformer from "@/components/PetTransformer";

const STEPS = [
  { icon: Upload, title: "Subí la foto", text: "De tu chucho o tu mishi." },
  { icon: Wand2, title: "Elegí el estilo", text: "Es gratis, probá todos." },
  { icon: Frame, title: "Enmarcalo", text: "Lo llevamos a tu casa." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b-4 border-[#FFD100] bg-[#0047AB] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight">GuanacoPet AI 🇸🇻</span>
          <a
            href="#transformar"
            className="rounded-full bg-[#FFD100] px-4 py-1.5 text-sm font-bold text-[#FFD100]"
          >
            Probalo
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0047AB] to-zinc-950 px-4 pb-14 pt-10 text-center text-white">
          <div className="mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#FFD100]" /> Modo Guanaco activado
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              ¡Transformá a tu <span className="text-[#FFD100]">bicho</span>!
            </h1>
            <p className="mt-3 text-base text-blue-100 sm:text-lg">
              Convertí a tus chuchos y mishis en prócer, cumbiero o pupusero con IA. Es gratis,
              y si te gusta, te lo llevamos enmarcado.
            </p>
            <a
              href="#transformar"
              className="mt-6 inline-block rounded-2xl bg-[#FFD100] px-8 py-3.5 text-lg font-extrabold text-zinc-900 shadow-lg active:scale-95"
            >
              ¡Empezar ya! 👇
            </a>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto -mt-8 grid max-w-4xl grid-cols-1 gap-3 px-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-md">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0047AB] text-white">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-[#FFD100]">{title}</p>
                <p className="text-sm text-zinc-400">{text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tool */}
        <section id="transformar" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10">
          <PetTransformer />
        </section>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-900 px-4 py-6 text-center text-sm text-zinc-400">
        <div className="mx-auto mb-3 flex h-1.5 max-w-xs overflow-hidden rounded-full">
          <div className="flex-1 bg-[#0047AB] ring-1 ring-white/40" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#0047AB] ring-1 ring-white/40" />
        </div>
        Hecho con ❤️ en El Salvador 🇸🇻 · Chuchos y Mishis
      </footer>
    </div>
  );
}
