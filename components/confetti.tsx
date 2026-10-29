"use client";

import { useEffect, useRef } from "react";

// Конфетти без библиотек: canvas на 2.5 секунды. Уважает prefers-reduced-motion и упрощённый режим.
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("simple")) return;
    const ctx = c.getContext("2d")!;
    c.width = innerWidth;
    c.height = innerHeight;
    const colors = ["#a78bfa", "#e879f9", "#c4b5fd", "#4ade80", "#f0abfc"];
    const bits = Array.from({ length: 140 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.5,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      r: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const end = performance.now() + 2500;
    let raf = 0;
    const tick = (now: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.r += 0.1;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.fillStyle = b.color;
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      if (now < end) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50" />;
}
