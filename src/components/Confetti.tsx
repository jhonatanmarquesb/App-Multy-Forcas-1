import React, { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Confete dourado da casa. Sem bibliotecas externas: canvas puro.
// Dispare de qualquer lugar com fireConfetti().
// Respeita prefers-reduced-motion (não anima para quem desativou animações).
// ---------------------------------------------------------------------------

const EVENT = 'mf:confetti';
const COLORS = ['#FFD700', '#FFC300', '#E5C100', '#FFF3B0', '#FFFFFF'];

export function fireConfetti() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
  shape: 'rect' | 'circle';
}

export const ConfettiHost: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = w < 480 ? 90 : 140;
      for (let i = 0; i < count; i++) {
        // Dois canhões: canto inferior esquerdo e direito, atirando pro centro/alto
        const fromLeft = i % 2 === 0;
        // Canhão esquerdo atira para cima-direita; direito, para cima-esquerda
        const angle = fromLeft
          ? -Math.PI / 2 + Math.random() * 0.55
          : -Math.PI / 2 - Math.random() * 0.55;
        const speed = 9 + Math.random() * 8;
        particlesRef.current.push({
          x: fromLeft ? w * 0.08 : w * 0.92,
          y: h * 0.95,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3,
          life: 1,
          shape: Math.random() > 0.35 ? 'rect' : 'circle',
        });
      }
      if (!rafRef.current) loop();
    };

    const loop = () => {
      const parts = particlesRef.current;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.28;            // gravidade
        p.vx *= 0.99;            // arrasto
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life -= 0.008;

        if (p.life <= 0 || p.y > window.innerHeight + 40) {
          parts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (parts.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        rafRef.current = 0;
      }
    };

    window.addEventListener(EVENT, spawn);
    return () => {
      window.removeEventListener(EVENT, spawn);
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[300]"
      aria-hidden="true"
    />
  );
};
