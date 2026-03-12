'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize2 } from 'lucide-react';
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

  if (!mounted) return null;

  return (
    <div className="bg-[#0f0f0f] min-h-screen flex flex-col items-center overflow-hidden">
        {/* Barra de Topo do Jogo */}
        <div className="w-full h-14 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between z-50">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 gap-2"
              onClick={() => router.push('/cassino')}
            >
                <ChevronLeft className="h-5 w-5" />
                Sair do Jogo
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[2px] italic">Fortune Tiger</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/50 hover:text-white"
              onClick={toggleFullScreen}
            >
                <Maximize2 className="h-4 w-4" />
            </Button>
        </div>

        {/* Container do Iframe */}
        <div id="game-container" className="flex-1 w-full max-w-[500px] relative shadow-2xl">
            <iframe
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                loading="lazy"
                title="Fortune Tiger Premium"
            ></iframe>
        </div>
        
        {/* Rodapé de Segurança */}
        <div className="w-full py-2 bg-black text-center">
          <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest">
            Este jogo é uma simulação para fins de entretenimento • Jogue com responsabilidade
          </p>
        </div>
    </div>
  );
}
