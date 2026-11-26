export const STYLE_GROUPS = [
  { id: "petmorph", label: "Estilos PetMorph" },
  { id: "patria", label: "Patria 🇸🇻" },
] as const;

export type StyleGroup = (typeof STYLE_GROUPS)[number]["id"];

export const STYLES = [
  { id: "royal", group: "petmorph", emoji: "👑", name: "Retrato Real", tag: "Noble de palacio, al estilo clásico" },
  { id: "baroque", group: "petmorph", emoji: "🖼️", name: "Óleo Barroco", tag: "Claroscuro dramático de museo" },
  { id: "watercolor", group: "petmorph", emoji: "🎨", name: "Acuarela y Tinta", tag: "Trazo fino en un jardín suave" },
  { id: "garden", group: "petmorph", emoji: "🌻", name: "Jardín Soleado", tag: "Impresionista, entre flores y luz" },
  { id: "silver", group: "petmorph", emoji: "🎞️", name: "Estudio Plata", tag: "Blanco y negro de estudio elegante" },
  { id: "candle", group: "petmorph", emoji: "🕯️", name: "Luz de Vela", tag: "Calentito, junto a la chimenea" },
  { id: "procer", group: "patria", emoji: "🎖️", name: "El Prócer", tag: "Estatua en el parque, con bigote y todo" },
  { id: "cumbiero", group: "patria", emoji: "🪗", name: "El Cumbiero", tag: "Ya viene el sonidero, mi chucho" },
  { id: "pupusero", group: "patria", emoji: "🫓", name: "Don Pupusero", tag: "Revueltas con queso y loroco" },
  { id: "bicho", group: "patria", emoji: "🛹", name: "Bicho de Colonia", tag: "El más buena onda de la cuadra" },
  { id: "heroe", group: "patria", emoji: "🦸", name: "Superhéroe SV", tag: "Con capa azul y blanca, ¡vos!" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
