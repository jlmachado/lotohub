'use client';

/**
 * @fileOverview Seção de Sinuca para a HOME.
 * Exibe jogos ao vivo e próximos jogos com status real de mercado.
 */

import React, { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Trophy, ArrowRight, Play } from 'lucide-react';
import { getSnookerMarketState } from '@/utils/snooker-rules';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export const SnookerHomeSection = () => {
  const { snookerChannels } = useAppContext();
  const router = useRouter();

  const activeGames = useMemo(() => {
    return (snookerChannels || [])
      .filter(c => c.enabled && !c.isArchived && (c.visibilityStatus === 'live' || c.visibilityStatus === 'upcoming'))
      .map(c => ({
        ...c,
        market: getSnookerMarketState(c)
      }))
      .sort((a, b) => {
        // Live sempre no topo
        if (a.visibilityStatus === 'live' && b.visibilityStatus !== 'live') return -1;
        if (a.visibilityStatus !== 'live' && b.visibilityStatus === 'live') return 1;
        // Se ambos live ou ambos upcoming, por prioridade
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      });
  }, [snookerChannels]);

  if (activeGames.length === 0) return null;

  return (
    <section className="px-4 space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-600/20 rounded-xl">
            <Video className="text-green-500 h-5 w-5" />
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Sinuca ao Vivo</h2>
        </div>
        <Button variant="link" onClick={() => router.push('/sinuca/ao-vivo')} className="text-[10px] font-black uppercase text-primary italic gap-1">
          Ver Tudo <ArrowRight size={12} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeGames.slice(0, 6).map(game => (
          <Card 
            key={game.id} 
            className={cn(
              "bg-slate-900 border-white/5 overflow-hidden hover:border-primary/30 transition-all cursor-pointer group",
              game.visibilityStatus === 'live' && "ring-1 ring-red-500/20"
            )}
            onClick={() => router.push('/sinuca/ao-vivo')}
          >
            <div className={cn(
              "p-2 px-3 border-b flex justify-between items-center",
              game.visibilityStatus === 'live' ? "bg-red-600/10 border-red-500/10" : "bg-white/5 border-white/5"
            )}>
              <div className="flex items-center gap-2">
                {game.visibilityStatus === 'live' ? (
                  <Badge className="bg-red-600 text-white text-[8px] font-black h-4 px-1.5 animate-pulse">AO VIVO</Badge>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar size={10} />
                    <span className="text-[8px] font-black uppercase">{new Date(game.scheduledAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-black border-white/10", game.market.color)}>
                {game.market.label}
              </Badge>
            </div>

            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase italic truncate">{game.playerA.name}</p>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold">MANDANTE</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xl font-black italic text-primary tabular-nums tracking-tighter">
                    {game.visibilityStatus === 'live' ? `${game.scoreA} - ${game.scoreB}` : 'vs'}
                  </div>
                  <Badge variant="secondary" className="text-[7px] h-3.5 px-1 bg-white/5 border-0 text-slate-500 uppercase">BO{game.bestOf}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase italic truncate">{game.playerB.name}</p>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold">VISITANTE</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" className="h-8 flex-1 bg-white/5 hover:bg-primary hover:text-black font-black uppercase italic text-[10px] transition-all rounded-lg border border-white/5">
                  <Play size={10} className="mr-1.5" /> Assistir
                </Button>
                {game.market.isBettable && (
                  <Button size="sm" className="h-8 flex-1 bg-primary text-black font-black uppercase italic text-[10px] rounded-lg lux-shine">
                    Apostar @{game.odds.A.toFixed(2)}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
