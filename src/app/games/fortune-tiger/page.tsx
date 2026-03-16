'use client';

/**
 * @fileOverview Wrapper Next.js Profissional para o Fortune Tiger Oficial.
 * Atua como ponte entre o AppContext (Saldo Real) e o Motor do Jogo (Iframe).
 */

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize2, RotateCcw, Wallet, Info } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function FortuneTigerGamePage() {
  const router = useRouter();
  const { user, balance, refreshData } = useAppContext();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Comunica o saldo atual para o iframe quando solicitado
   */
  const syncBalanceWithIframe = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SYNC_BALANCE',
        balance: balance
      }, '*');
    }
  }, [balance]);

  /**
   * Trata eventos financeiros vindos do motor do jogo
   */
  const handleGameMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    
    if (data.type === 'GAME_READY') {
      setLoading(false);
      syncBalanceWithIframe();
    }

    if (data.type === 'SLOT_BET') {
      // Aqui integrará com o serviço de aposta real no futuro.
      // Por enquanto apenas logamos para depuração.
      console.log(`[SLOT_BET] Valor: R$ ${data.amount}`);
    }

    if (data.type === 'SLOT_WIN') {
      toast({
        title: "VITÓRIA!",
        description: `Você ganhou R$ ${data.amount.toFixed(2)}!`,
        className: "bg-yellow-500 text-black font-black"
      });
      // Força atualização do contexto para refletir novo saldo
      setTimeout(refreshData, 500);
    }
  }, [toast, refreshData, syncBalanceWithIframe]);

  useEffect(() => {
    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [handleGameMessage]);

  const toggleFullScreen = () => {
    const elem = document.getElementById('game-container');
    if (elem?.requestFullscreen) elem.requestFullscreen();
  };

  const reloadGame = () => {
    setLoading(true);
    setIframeKey(prev => prev + 1);
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center overflow-hidden font-sans">
        {/* Top Header - Integrado */}
        <div className="w-full h-14 bg-[#1a1a1a] border-b border-yellow-600/30 px-4 flex items-center justify-between z-50 shadow-2xl">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 gap-1 font-bold rounded-lg"
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
              <Badge className="bg-green-600/20 text-green-500 border-0 h-3 px-1 text-[8px] animate-pulse">SERVIDOR SEGURO</Badge>
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={reloadGame}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={toggleFullScreen}>
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Iframe Game Container */}
        <div id="game-container" className="flex-1 w-full max-w-[540px] relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.9)] border-x border-white/5">
            {loading && (
              <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
                <p className="text-yellow-500 font-black uppercase italic tracking-widest text-xs animate-pulse">Carregando Engine...</p>
              </div>
            )}
            <iframe
                ref={iframeRef}
                key={iframeKey}
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                title="Fortune Tiger Engine"
            ></iframe>
            
            {/* Login Guard */}
            {!user && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
                  <Info className="h-10 w-10 text-yellow-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-white font-black text-2xl uppercase italic tracking-tighter">Aposta Real Desativada</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">Faça login para utilizar seu saldo e concorrer a prêmios em dinheiro real.</p>
                </div>
                <Button onClick={() => router.push('/login')} className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase italic rounded-xl lux-shine">
                  Entrar Agora
                </Button>
              </div>
            )}
        </div>
        
        {/* Bottom Banner */}
        <div className="w-full py-2 bg-[#0a0a0a] text-center border-t border-white/5">
          <p className="text-[8px] text-white/20 uppercase font-black tracking-[6px]">
            LOTOHUB PREMIUM GAMING • RATED 18+
          </p>
        </div>
    </div>
  );
}
