// Textura de tecido do feltro, gerada uma vez em um canvas.
//
// A textura é NEUTRA: só pontos e fibras claros e escuros, quase
// transparentes. A cor vem do fundo por baixo (token --felt-base), então a
// mesma textura serve para o verde e para o vinho, e trocar a cor da mesa não
// exige gerar nada de novo.
//
// Ela é "repetível": o que sai pela borda direita entra pela esquerda. Sem
// isso apareceria uma grade de emendas ao repetir a imagem pela mesa.

import { tokenColor } from './tokens';

/** Lado da textura em pixels CSS. Grande o bastante para a repetição não ser percebida. */
export const FELT_TILE = 320;

type Rng = () => number;

// Gerador com semente: a textura sai igual a cada carregamento e em todos os
// aparelhos, o que evita a mesa "mudar de pano" ao recarregar.
const seeded = (seed: number): Rng => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** Ruído de valor que se repete a cada `cells` células nos dois eixos. */
const valueNoise = (size: number, cells: number, rng: Rng): Float32Array => {
  const grid = Array.from({ length: cells * cells }, () => rng() * 2 - 1);
  const at = (gx: number, gy: number) => grid[((gy + cells) % cells) * cells + ((gx + cells) % cells)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const out = new Float32Array(size * size);
  const step = size / cells;
  for (let y = 0; y < size; y++) {
    const fy = y / step;
    const gy = Math.floor(fy);
    const ty = smooth(fy - gy);
    for (let x = 0; x < size; x++) {
      const fx = x / step;
      const gx = Math.floor(fx);
      const tx = smooth(fx - gx);
      const top = at(gx, gy) + (at(gx + 1, gy) - at(gx, gy)) * tx;
      const bottom = at(gx, gy + 1) + (at(gx + 1, gy + 1) - at(gx, gy + 1)) * tx;
      out[y * size + x] = top + (bottom - top) * ty;
    }
  }
  return out;
};

const parseRgb = (css: string): [number, number, number] => {
  // tokenColor devolve hsla(); o canvas converte para rgb ao ler fillStyle.
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return [0, 0, 0];
  probe.fillStyle = css;
  const hex = probe.fillStyle;
  if (hex.startsWith('#')) return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const [r = 0, g = 0, b = 0] = hex.match(/\d+/g)?.map(Number) ?? [];
  return [r, g, b];
};

const drawTexture = (scale: number): HTMLCanvasElement | null => {
  const size = Math.round(FELT_TILE * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rng = seeded(20261117);
  const light = parseRgb(tokenColor('--felt-thread-light'));
  const dark = parseRgb(tokenColor('--felt-thread-dark'));

  // 1. Manchas largas e médias: o pano nunca tem cor perfeitamente uniforme.
  const broad = valueNoise(size, 5, rng);
  const medium = valueNoise(size, 22, rng);

  // 2. Grão fino, ponto a ponto: a "penugem" do feltro.
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let i = 0; i < size * size; i++) {
    const grain = rng() * 2 - 1;
    const v = broad[i] * 0.35 + medium[i] * 0.3 + grain * 0.62;
    const [r, g, b] = v > 0 ? light : dark;
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = Math.min(255, Math.abs(v) * (v > 0 ? 34 : 46));
  }
  ctx.putImageData(image, 0, 0);

  // 3. Fibras soltas: traços curtos e levemente curvos, em todas as direções.
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, scale * 0.7);
  for (let i = 0; i < 1100; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const angle = rng() * Math.PI * 2;
    const length = (2 + rng() * 5) * scale;
    const bend = (rng() - 0.5) * length * 0.8;
    const isLight = rng() < 0.62;
    ctx.strokeStyle = tokenColor(isLight ? '--felt-thread-light' : '--felt-thread-dark', isLight ? 0.035 + rng() * 0.045 : 0.05 + rng() * 0.06);
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    const cx = (x + ex) / 2 + Math.cos(angle + Math.PI / 2) * bend;
    const cy = (y + ey) / 2 + Math.sin(angle + Math.PI / 2) * bend;
    // Desenha também deslocado de um lado inteiro: a fibra que cruza a borda
    // continua do outro lado e a emenda some.
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.quadraticCurveTo(cx + dx, cy + dy, ex + dx, ey + dy);
        ctx.stroke();
      }
    }
  }
  return canvas;
};

let cached: Promise<string | null> | null = null;

/**
 * URL da textura (blob), criada na primeira chamada e reaproveitada depois.
 * Blob em vez de data URL: a string base64 de uma imagem de ruído passa de
 * meio megabyte e iria parar dentro do CSS do elemento.
 */
export const feltTextureUrl = (): Promise<string | null> => {
  if (!cached) {
    cached = new Promise((resolve) => {
      const canvas = drawTexture(Math.min(2, window.devicePixelRatio || 1));
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
    });
  }
  return cached;
};
