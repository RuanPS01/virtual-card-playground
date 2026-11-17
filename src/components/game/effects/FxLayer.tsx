import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { prefersReducedMotion, type BurstKind, type TextTone } from '@/game/stage';
import { tokenColor } from '@/lib/tokens';

// Camada de efeitos por cima das cartas: partículas em canvas e textos que
// sobem e somem ("+1", "-12"). É comandada de forma imperativa, porque um
// efeito é um disparo, e não um estado que a árvore do React precise guardar.

export interface FxLayerHandle {
  burst(x: number, y: number, kind: BurstKind): void;
  text(x: number, y: number, text: string, tone: TextTone): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: TextTone;
}

const TONE_CLASS: Record<TextTone, string> = {
  gold: 'fx-text-gold',
  red: 'fx-text-red',
  blue: 'fx-text-blue',
};

const spread = (min: number, max: number): number => min + Math.random() * (max - min);

const makeParticles = (x: number, y: number, kind: BurstKind): Particle[] => {
  if (kind === 'dust') {
    const color = tokenColor('--pc-paper', 0.7);
    return Array.from({ length: 8 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return { x, y, vx: side * spread(40, 150), vy: spread(-50, 10), gravity: 120, life: 0, ttl: spread(0.22, 0.4), size: spread(3, 5), color };
    });
  }
  if (kind === 'spark') {
    const colors = [tokenColor('--primary'), tokenColor('--pc-paper')];
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + spread(-0.2, 0.2);
      const speed = spread(120, 260);
      return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 260, life: 0, ttl: spread(0.3, 0.55), size: spread(3, 6), color: colors[i % 2] };
    });
  }
  const colors = [tokenColor('--primary'), tokenColor('--destructive'), tokenColor('--secondary'), tokenColor('--pc-paper')];
  return Array.from({ length: 40 }, (_, i) => {
    const angle = spread(-Math.PI, 0);
    const speed = spread(160, 460);
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 720, life: 0, ttl: spread(0.6, 1.1), size: spread(4, 7), color: colors[i % colors.length] };
  });
};

const FxLayer = forwardRef<FxLayerHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);
  const nextId = useRef(1);
  const [texts, setTexts] = useState<FloatingText[]>([]);

  useImperativeHandle(ref, () => {
    const step = (previous: number) => (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dt = Math.min(0.05, (time - previous) / 1000);
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      particles.current = particles.current.filter((p) => p.life < p.ttl);
      for (const p of particles.current) {
        p.life += dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
        ctx.fillStyle = p.color;
        // Quadrados em coordenadas inteiras: partícula com cara de pixel.
        ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.round(p.size), Math.round(p.size));
      }
      ctx.globalAlpha = 1;

      // O laço só existe enquanto há partícula viva. Parado, custa zero.
      frame.current = particles.current.length > 0 ? requestAnimationFrame(step(time)) : 0;
    };

    return {
      burst: (x, y, kind) => {
        if (prefersReducedMotion()) return;
        particles.current.push(...makeParticles(x, y, kind));
        if (!frame.current) frame.current = requestAnimationFrame(step(performance.now()));
      },
      text: (x, y, text, tone) => {
        const id = nextId.current++;
        setTexts((prev) => [...prev, { id, x, y, text, tone }]);
        setTimeout(() => setTexts((prev) => prev.filter((item) => item.id !== id)), 900);
      },
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="fx-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="fx-canvas" />
      <AnimatePresence>
        {texts.map((item) => (
          <motion.span
            key={item.id}
            className={`fx-text ${TONE_CLASS[item.tone]}`}
            style={{ left: item.x, top: item.y }}
            initial={{ opacity: 0, y: 8, scale: 0.4, rotate: -8 }}
            animate={{ opacity: 1, y: -34, scale: 1, rotate: 4 }}
            exit={{ opacity: 0, y: -54, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          >
            {item.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
});

FxLayer.displayName = 'FxLayer';

export default FxLayer;
