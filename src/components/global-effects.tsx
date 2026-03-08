'use client';
import { useEffect } from 'react';

export function GlobalEffects() {
  useEffect(() => {
    let animationFrameId: number;
    let resizeListener: () => void;
    let clickListener: (e: MouseEvent) => void;

    // --- Partículas douradas (canvas leve) ---
    const c = document.getElementById('goldCanvas') as HTMLCanvasElement;
    if (c) {
      const ctx = c.getContext('2d');
      if (ctx) {
        let w: number, h: number, parts: any[];

        resizeListener = () => {
          const dpr = window.devicePixelRatio || 1;
          w = c.width = Math.floor(window.innerWidth * dpr);
          h = c.height = Math.floor(window.innerHeight * dpr);
          c.style.width = `${window.innerWidth}px`;
          c.style.height = `${window.innerHeight}px`;
          const base = (w * h) / (dpr * dpr);
          const n = Math.max(40, Math.min(90, Math.floor(base / 65000)));
          parts = Array.from({ length: n }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: (0.8 + Math.random() * 2.2) * dpr,
            vy: (0.18 + Math.random() * 0.55) * dpr,
            vx: -0.15 + Math.random() * 0.3 * dpr,
            a: 0.1 + Math.random() * 0.25,
          }));
        };

        const tick = () => {
          if (!ctx) return;
          ctx.clearRect(0, 0, w, h);
          for (const p of parts) {
            p.y -= p.vy;
            p.x += p.vx;
            if (p.y < -20) p.y = h + 20;
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,215,0,${p.a})`;
            ctx.fill();
          }
          animationFrameId = requestAnimationFrame(tick);
        };

        window.addEventListener('resize', resizeListener);
        resizeListener();
        tick();
      }
    }

    // --- Efeitos Luxo (Adição de classes) ---
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = Array.from(document.querySelectorAll("a, button, [onclick]"))
      .filter(el => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width >= 140 && r.height >= 44;
      });

    targets.forEach(el => {
      el.classList.add("lux-press");
      if (!reduce) el.classList.add("lux-shine");
      const style = window.getComputedStyle(el as HTMLElement);
      const br = parseFloat(style.borderRadius || "0");
      if (br >= 14) {
        el.classList.add("lux-card");
      }
    });

    document.querySelectorAll("button, .btn, .button, a.btn").forEach(el => {
      const txt = (el.textContent || "").toLowerCase();
      if (txt.includes("terminal") || txt.includes("entrar") || txt.includes("deposit") || txt.includes("pix")) {
        el.classList.add("lux-gold");
      }
    });

    // --- Lógica de clique (Som, Vibração, Transição) ---
    const clickAudio = new Audio("/sfx/click.mp3");
    clickAudio.volume = 0.25;
    clickAudio.preload = "auto";
    
    const safePlay = () => {
      try {
        clickAudio.currentTime = 0;
        const p = clickAudio.play();
        if(p && typeof p.catch === "function") p.catch(()=>{});
      } catch(e) {}
    };

    clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[href]");
      const clickable = target.closest("a, button, [onclick]");

      // Som e Vibração
      if (clickable) {
        const r = clickable.getBoundingClientRect();
        if (r.width >= 140 && r.height >= 44) {
          safePlay();
          if (navigator.vibrate) navigator.vibrate(12);
        }
      }
      
      // Transição de página
      if (link) {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;
        if (href.startsWith('http')) return;
        
        const f = document.getElementById('pageFade');
        if (f) {
          f.classList.add('on');
          setTimeout(() => f.classList.remove('on'), 450);
        }
      }
    };

    document.addEventListener('click', clickListener, true);

    // --- Limpeza ---
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (clickListener) {
        document.removeEventListener('click', clickListener, true);
      }
    };
  }, []);

  return null;
}
