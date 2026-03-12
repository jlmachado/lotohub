'use client';

/**
 * @fileOverview Wrapper Next.js para o Fortune Tiger Clone.
 * Este componente preserva a rota /games/fortune-tiger/ e carrega
 * a implementação real (HTML/CSS/JS) via Iframe para estabilidade máxima.
 */

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FortuneTigerGamePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFullScreen = () => {
    const elem = document.getElementById('game-container');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const reloadGame = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;
  };

  if (!mounted) return null;

  return (
    <div className="bg-black min-h-screen flex flex-col items-center overflow-hidden">
        {/* Header de Integração com o Sistema Principal */}
        <div className="w-full h-14 bg-[#1a1a1a] border-b border-yellow-600/20 px-4 flex items-center justify-between z-50">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 gap-2 font-bold"
              onClick={() => router.push('/cassino')}
            >
                <ChevronLeft className="h-5 w-5" />
                Voltar ao Cassino
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-yellow-500 uppercase italic tracking-tighter">Fortune Tiger Clone</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>

            <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white"
                  onClick={reloadGame}
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white"
                  onClick={toggleFullScreen}
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Container do Jogo (Fidelidade Total via Iframe) */}
        <div id="game-container" className="flex-1 w-full max-w-[500px] relative bg-black shadow-2xl">
            <iframe
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                loading="lazy"
                title="Fortune Tiger Clone"
            ></iframe>
        </div>
        
        <div className="w-full py-1 bg-[#0a0a0a] text-center border-t border-white/5">
          <p className="text-[8px] text-white/20 uppercase font-black tracking-[4px]">
            LotoHub Casino • Provably Fair • 18+
          </p>
        </div>
    </div>
  );
}
