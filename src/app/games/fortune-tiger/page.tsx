'use client';

/**
 * @fileOverview Rota do Jogo Fortune Tiger.
 * Carrega a implementação de alta fidelidade via iframe isolado para estabilidade.
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
    <div className="bg-[#0f0f0f] min-h-screen flex flex-col items-center overflow-hidden">
        {/* Barra de Topo do Jogo - Integrada com o Sistema */}
        <div className="w-full h-14 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-50 shadow-lg">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 gap-2 font-bold"
              onClick={() => router.push('/cassino')}
            >
                <ChevronLeft className="h-5 w-5" />
                Sair
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Provider</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase italic">PG Soft (Simulado)</span>
              </div>
              <div className="h-8 w-[1px] bg-white/10 hidden sm:block mx-2" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-tighter italic">Fortune Tiger</span>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            </div>

            <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white"
                  onClick={reloadGame}
                  title="Reiniciar Jogo"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white"
                  onClick={toggleFullScreen}
                  title="Tela Cheia"
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Container do Iframe - Rota Preservada */}
        <div id="game-container" className="flex-1 w-full max-w-[500px] relative shadow-2xl bg-black">
            <iframe
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                loading="lazy"
                title="Fortune Tiger Clone Premium"
            ></iframe>
        </div>
        
        {/* Rodapé Técnico de Segurança */}
        <div className="w-full py-2 bg-black border-t border-white/5 text-center">
          <p className="text-[8px] text-white/20 uppercase font-black tracking-[3px] italic">
            Simulation Mode • Provably Fair • 18+ Only
          </p>
        </div>
    </div>
  );
}
