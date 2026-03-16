'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize2, RotateCcw, Wallet, ShieldCheck } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

/**
 * @fileOverview Wrapper Oficial ULTRA RÍGIDO do Fortune Tiger.
 * Hospeda a engine HTML5 do clone e sincroniza saldo real.
 */
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

  const syncBalance = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SYNC_BALANCE',
        balance: balance
      }, '*');
    }
  }, [balance]);

  const handleGameMessage = useCallback((event: MessageEvent) => {
    // Validação de origem para segurança
    if (typeof event.data !== 'object') return;

    const { type, amount } = event.data;
    
    if (type === 'GAME_READY') {
      setLoading(false);
      syncBalance();
    }

    if (type === 'SLOT_WIN') {
      toast({
        title: "VITÓRIA!",
        description: `Você ganhou R$ ${amount.toFixed(2)}!`,
        className: "bg-yellow-500 text-black font-black border-2 border-white"
      });
      // Aqui entraria a chamada de API para crédito real
      setTimeout(refreshData, 500);
    }
  }, [toast, refreshData, syncBalance]);

  useEffect(() => {
    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [handleGameMessage]);

  if (!mounted) return null;

  return (
    <div className="bg-black min-h-screen flex flex-col items-center overflow-hidden">
        {/* Header de Integração Profissional */}
        <div className="w-full h-14 bg-[#1a1a1a] border-b border-yellow-600/30 px-4 flex items-center justify-between z-50">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 gap-1 font-bold rounded-lg h-9"
                onClick={() => router.push('/cassino')}
              >
                  <ChevronLeft className="h-4 w-4" />
                  Sair
              </Button>
              <div className="hidden xs:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                <Wallet className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-black text-white tabular-nums">
                  R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-yellow-500 uppercase italic tracking-tighter">Fortune Tiger</span>
              <Badge className="bg-green-600/20 text-green-500 border-0 h-3.5 px-1 text-[7px] animate-pulse">OFICIAL CLONE V1</Badge>
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white/50 h-9 w-9 hover:text-white" onClick={() => setIframeKey(k => k + 1)}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white/50 h-9 w-9 hover:text-white" onClick={() => document.getElementById('game-frame')?.requestFullscreen()}>
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Container da Engine HTML5 */}
        <div className="flex-1 w-full max-w-[540px] relative bg-black shadow-2xl">
            {loading && (
              <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
                <p className="text-yellow-500 font-black uppercase italic tracking-widest text-[9px] animate-pulse">Autenticando Assets...</p>
              </div>
            )}
            <iframe
                id="game-frame"
                ref={iframeRef}
                key={iframeKey}
                src="/games/fortune-tiger/index.html"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                title="Fortune Tiger Engine"
            ></iframe>
        </div>
    </div>
  );
}
