// Leitura dos tokens de cor de index.css a partir do JavaScript. Os canvas
// (partículas, textura do feltro) não enxergam classes do Tailwind, mas
// também não podem ter cor fixa no código: a paleta inteira mora em um lugar só.

/** Lê um token "H S% L%" e devolve os três números. */
const read = (name: string): [number, number, number] => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h = 0, s = 0, l = 0] = raw.split(/[\s,/]+/).map((part) => parseFloat(part));
  return [h, s, l];
};

/** Cor do token como string CSS, com opacidade opcional. */
export const tokenColor = (name: string, alpha = 1): string => {
  const [h, s, l] = read(name);
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
};
