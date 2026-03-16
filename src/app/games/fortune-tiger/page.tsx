'use client';

/**
 * @fileOverview Wrapper Next.js Profissional para o Fortune Tiger.
 * Gerencia a integração do jogo HTML5 com o saldo real do sistema e AppContext.
 */

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize2, RotateCcw, Wallet, Info } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function FortuneTigerGamePage() {
  const router = useRouter();
  const { user, balance, refreshData } = useAppContext();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Escuta mensagens do jogo (giros, ganhos, etc)
   * Preparado para integração financeira real.
   */
  const handleGameMessage = useCallback((event: MessageEvent) => {
    // Segurança: Validar origem se necessário
    const data = event.data;
    
    if (data.type === 'SNOOKER_BET_PLACED' || data.type === 'SLOT_BET') {
      console.log('Aposta detectada no slot:', data.amount);
      // Aqui entrará a integração com BetService no futuro
    }

    if (data.type === 'SLOT_WIN') {
      toast({
        title: "GRANDE GANHO!",
        description: `Você ganhou R$ ${data.amount.toFixed(2)}!`,
        className: "bg-yellow-500 text-black font-bold"
      });
      refreshData();
    }
  }, [toast, refreshData]);

  useEffect(() => {
    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [handleGameMessage]);

  const toggleFullScreen = () => {
    const elem = document.getElementById('game-container');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const reloadGame = () => {
    setIframeKey(prev => prev + 1);
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center overflow-hidden">
        {/* Top Navigation Bar - Integrada com Saldo Real */}
        <div className="w-full h-14 bg-[#1a1a1a] border-b border-yellow-600/30 px-4 flex items-center justify-between z-50 shadow-lg">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 gap-1 font-bold"
                onClick={() => router.push('/cassino')}
              >
                  <ChevronLeft className="h-4 w-4" />
                  Sair
              </Button>
              <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                <Wallet className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-black text-white tabular-nums">
                  R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-yellow-500 uppercase italic tracking-tighter">Fortune Tiger</span>
              <Badge className="bg-green-600/20 text-green-500 border-0 h-3 px-1 text-[8px] animate-pulse">SERVIDOR ATIVO</Badge>
            </div>

            <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white h-8 w-8"
                  onClick={reloadGame}
                  title="Reiniciar Jogo"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white h-8 w-8"
                  onClick={toggleFullScreen}
                  title="Tela Cheia"
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Game Area (Optimized for Portrait View) */}
        <div id="game-container" className="flex-1 w-full max-w-[540px] relative bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] border-x border-white/5">
            <iframe
                key={iframeKey}
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                loading="lazy"
                title="Fortune Tiger Game Engine"
            ></iframe>
            
            {/* Overlay de Segurança para Mobile */}
            {!user && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Info className="h-12 w-12 text-yellow-500" />
                <h2 className="text-white font-black text-xl uppercase italic">Acesso Restrito</h2>
                <p className="text-gray-400 text-sm">Faça login para utilizar seu saldo real e ganhar prêmios em dinheiro.</p>
                <Button onClick={() => router.push('/login')} className="bg-yellow-500 text-black font-black uppercase">Entrar Agora</Button>
              </div>
            )}
        </div>
        
        {/* Bottom Status Bar */}
        <div className="w-full py-1.5 bg-[#0a0a0a] text-center border-t border-white/5">
          <p className="text-[8px] text-white/30 uppercase font-black tracking-[5px]">
            LOTOHUB CASINO • CERTIFIED RNG • 18+
          </p>
        </div>
    </div>
  );
}
