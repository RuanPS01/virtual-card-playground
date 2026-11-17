// Leitura dos tokens de cor de index.css a partir do JavaScript. O canvas de
// partículas e o shader do fundo não enxergam classes do Tailwind, mas também
// não podem ter cor fixa no código: a paleta inteira mora em um lugar só.

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

/** Cor do token em RGB de 0 a 1, o formato que o WebGL espera. */
export const tokenRgb = (name: string): [number, number, number] => {
  const [h, s, l] = read(name);
  const sat = s / 100;
  const light = l / 100;
  const chroma = sat * Math.min(light, 1 - light);
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;
    return light - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
};
