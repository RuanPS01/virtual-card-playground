// Efeitos sonoros sintetizados com a Web Audio API. Nenhum arquivo de áudio:
// tudo é ruído filtrado e tons curtos, o que mantém o pacote leve e funciona
// offline. O contexto só nasce depois do primeiro gesto do usuário, como os
// navegadores exigem.

import { useSyncExternalStore } from 'react';

const MUTE_KEY = 'vcp.muted';

type AudioCtor = typeof AudioContext;

let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

const audio = (): AudioContext | null => {
  if (muted) return null;
  if (!context) {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
};

const noise = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

interface NoiseOptions {
  at?: number;
  duration: number;
  freq: number;
  toFreq?: number;
  q?: number;
  gain: number;
}

/** Ruído passado por um filtro passa-faixa: o "fssk" de carta deslizando. */
const swish = ({ at = 0, duration, freq, toFreq, q = 1.2, gain }: NoiseOptions): void => {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, start);
  if (toFreq) filter.frequency.exponentialRampToValueAtTime(toFreq, start + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start(start, Math.random() * 0.2);
  source.stop(start + duration + 0.02);
};

interface ToneOptions {
  at?: number;
  duration: number;
  freq: number;
  toFreq?: number;
  type?: OscillatorType;
  gain: number;
}

const blip = ({ at = 0, duration, freq, toFreq, type = 'square', gain }: ToneOptions): void => {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, start + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

// Pequena variação de tom a cada toque: som idêntico repetido cansa o ouvido.
const vary = (value: number, spread = 0.08): number => value * (1 + (Math.random() * 2 - 1) * spread);

export const sfx = {
  pick: () => swish({ duration: 0.07, freq: vary(2600), toFreq: 4200, gain: 0.12 }),
  drop: () => {
    swish({ duration: 0.09, freq: vary(1500), toFreq: 600, gain: 0.2 });
    blip({ duration: 0.06, freq: vary(150), toFreq: 70, type: 'sine', gain: 0.18 });
  },
  deal: () => swish({ duration: 0.13, freq: vary(1900), toFreq: 3400, q: 0.9, gain: 0.16 }),
  flip: () => {
    swish({ duration: 0.06, freq: vary(3000), toFreq: 1400, gain: 0.14 });
    blip({ at: 0.05, duration: 0.05, freq: vary(520), toFreq: 760, gain: 0.05 });
  },
  stack: () => {
    swish({ duration: 0.08, freq: vary(1300), toFreq: 700, gain: 0.2 });
    blip({ at: 0.03, duration: 0.09, freq: vary(660), toFreq: 990, gain: 0.06 });
  },
  shuffle: () => {
    for (let i = 0; i < 9; i++) {
      swish({ at: i * 0.045, duration: 0.06, freq: vary(2100, 0.25), toFreq: 1200, q: 1.6, gain: 0.13 });
    }
  },
  fanfare: () => {
    [523, 659, 784, 1047].forEach((freq, i) => blip({ at: i * 0.07, duration: 0.14, freq, gain: 0.06 }));
  },
  join: () => {
    blip({ duration: 0.09, freq: 587, gain: 0.05 });
    blip({ at: 0.09, duration: 0.14, freq: 880, gain: 0.05 });
  },
  leave: () => {
    blip({ duration: 0.09, freq: 587, gain: 0.05 });
    blip({ at: 0.09, duration: 0.16, freq: 392, gain: 0.05 });
  },
  error: () => blip({ duration: 0.16, freq: 180, toFreq: 110, type: 'sawtooth', gain: 0.07 }),
  tap: () => blip({ duration: 0.04, freq: vary(700), toFreq: 500, gain: 0.04 }),
};

export type SfxName = keyof typeof sfx;

export const isMuted = (): boolean => muted;

export const setMuted = (value: boolean): void => {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Sem storage a escolha vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMuted = (): boolean => useSyncExternalStore(subscribe, isMuted);
