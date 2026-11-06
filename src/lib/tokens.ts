"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export const MAX_TOKENS = 3;
export const REFILL_MS = 72 * 60 * 60 * 1000;
const KEY = "guanacopet:tokens";

interface TokenState {
  tokens: number;
  /** Inicio de la ronda de 72 h (se fija al gastar el primer token). */
  lastRefillTimestamp: number;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

// Reloj externo (pasos de 30 s) para no llamar Date.now() durante el render/prerender.
const TICK_MS = 30_000;
function subscribeClock(cb: () => void) {
  const id = setInterval(cb, TICK_MS);
  return () => clearInterval(id);
}
const getTick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const getServerTick = () => 0;

const getRaw = () => localStorage.getItem(KEY) ?? "";
const getServerRaw = () => null;

function parse(raw: string | null): TokenState {
  try {
    const p = JSON.parse(raw || "null");
    if (p && Number.isFinite(p.tokens) && Number.isFinite(p.lastRefillTimestamp)) {
      return {
        tokens: Math.min(MAX_TOKENS, Math.max(0, Math.floor(p.tokens))),
        lastRefillTimestamp: p.lastRefillTimestamp,
      };
    }
  } catch {}
  return { tokens: MAX_TOKENS, lastRefillTimestamp: 0 };
}

/** Aplica la recarga: tras 72 h el saldo vuelve a MAX_TOKENS (nunca se acumula por encima). */
function withRefill(s: TokenState, now: number): TokenState {
  if (s.tokens < MAX_TOKENS && now - s.lastRefillTimestamp >= REFILL_MS) {
    return { tokens: MAX_TOKENS, lastRefillTimestamp: now };
  }
  return s;
}

function write(s: TokenState) {
  localStorage.setItem(KEY, JSON.stringify(s));
  notify();
}

export function useTokens() {
  const raw = useSyncExternalStore(subscribe, getRaw, getServerRaw);
  const now = useSyncExternalStore(subscribeClock, getTick, getServerTick);

  const state = useMemo(() => withRefill(parse(raw), now), [raw, now]);
  const msLeft = state.tokens < MAX_TOKENS ? Math.max(0, state.lastRefillTimestamp + REFILL_MS - now) : 0;

  /** Gasta un token. Devuelve false si no queda saldo. */
  const consume = useCallback(() => {
    const t = Date.now();
    const s = withRefill(parse(getRaw()), t);
    if (s.tokens <= 0) return false;
    write({
      tokens: s.tokens - 1,
      lastRefillTimestamp: s.tokens === MAX_TOKENS ? t : s.lastRefillTimestamp,
    });
    return true;
  }, []);

  /** Devuelve un token (p. ej. si la generación falló). */
  const refund = useCallback(() => {
    const s = parse(getRaw());
    write({ ...s, tokens: Math.min(MAX_TOKENS, s.tokens + 1) });
  }, []);

  return { ready: raw !== null, tokens: state.tokens, msLeft, consume, refund };
}

export function formatWait(ms: number) {
  const hours = Math.ceil(ms / 3_600_000);
  if (ms < 3_600_000) {
    const m = Math.max(1, Math.ceil(ms / 60_000));
    return `${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}
