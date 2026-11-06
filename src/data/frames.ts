export interface FrameOption {
  id: string;
  name: string;
  size: string;
  use: string;
  price: number;
  framed: boolean;
  /** width / height of the print, used for the on-screen mockup */
  ratio: number;
}

export const FRAME_OPTIONS: FrameOption[] = [
  { id: "small", name: "Pequeño", size: "15x20 cm", use: "Escritorio", price: 12, framed: true, ratio: 15 / 20 },
  { id: "medium", name: "Mediano", size: "20x30 cm", use: "Sala / Oficina", price: 22, framed: true, ratio: 20 / 30 },
  { id: "large", name: "Grande", size: "30x40 cm", use: "Cuadro principal", price: 38, framed: true, ratio: 30 / 40 },
  { id: "print", name: "Sin marco", size: "Impresión HD", use: "Papel fotográfico brillante", price: 6, framed: false, ratio: 3 / 4 },
];

export const DEPARTAMENTOS = [
  "Ahuachapán", "Cabañas", "Chalatenango", "Cuscatlán", "La Libertad", "La Paz", "La Unión",
  "Morazán", "San Miguel", "San Salvador", "San Vicente", "Santa Ana", "Sonsonate", "Usulután",
];

export const usd = (n: number) => `$${n.toFixed(2)} USD`;

/** Envío gratis cuando el subtotal llega a este monto (USD). */
export const FREE_SHIPPING_MIN = 30;
export const SHIPPING_NEAR = 3; // San Salvador y La Libertad
export const SHIPPING_FAR = 4; // resto de departamentos
const NEAR_DEPTOS = ["San Salvador", "La Libertad"];

export interface Totals {
  subtotal: number;
  /** null mientras no se haya elegido departamento */
  shipping: number | null;
  total: number | null;
  freeShipping: boolean;
}

export function calcTotals(subtotal: number, depto: string): Totals {
  const freeShipping = subtotal >= FREE_SHIPPING_MIN;
  if (freeShipping) return { subtotal, shipping: 0, total: subtotal, freeShipping };
  if (!depto) return { subtotal, shipping: null, total: null, freeShipping };
  const shipping = NEAR_DEPTOS.includes(depto) ? SHIPPING_NEAR : SHIPPING_FAR;
  return { subtotal, shipping, total: subtotal + shipping, freeShipping };
}
