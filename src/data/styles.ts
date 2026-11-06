export const STYLES = [
  { id: "procer", emoji: "🎖️", name: "El Prócer", tag: "Estatua en el parque, con bigote y todo" },
  { id: "cumbiero", emoji: "🪗", name: "El Cumbiero", tag: "Ya viene el sonidero, mi chucho" },
  { id: "pupusero", emoji: "🫓", name: "Don Pupusero", tag: "Revueltas con queso y loroco" },
  { id: "bicho", emoji: "🛹", name: "Bicho de Colonia", tag: "El más buena onda de la cuadra" },
  { id: "heroe", emoji: "🦸", name: "Superhéroe SV", tag: "Con capa azul y blanca, ¡vos!" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
