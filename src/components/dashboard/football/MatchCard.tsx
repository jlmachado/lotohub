/**
 * @fileOverview Card de partida refinado para Sportsbook Profissional.
 * Suporta múltiplos mercados (1X2, Over/Under, Ambas Marcam) e suspensão dinâmica.
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Calendar, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: any;
  onSelectOdd?: (market: string, selection: string, odd: number) => void;
  isSelected?: (market: string, selection: string) => boolean;
  disabled?: boolean;
}

export function MatchCard({ match, onSelectOdd, isSelected, disabled }: MatchCardProps) {
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const kickoffDate = new Date(match.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const isSuspended = match.marketStatus === 'SUSPENDED';
  const isClosed = match.marketStatus === 'CLOSED' || match.isFinished;

  const homeName = String(match.homeTeam || 'Mandante');
  const awayName = String(match.awayTeam || 'Visitante');

  const markets = match.markets || [];

  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 overflow-hidden transition-all shadow-xl",
      match.isLive ? "ring-1 ring-red-500/40" : "hover:border-primary/30"
    )}>
      {/* Barra de Status */}
      <div className={cn("p-2.5 border-b flex justify-between items-center", match.isLive ? "bg-red-600/20" : "bg-white/5")}>
        <div className="flex items-center gap-2">
          {match.isLive ? (
            <>
              <Radio size={10} className="text-red-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase text-red-500 italic">AO VIVO • {match.minute || match.clock}</span>
            </>
          ) : (
            <>
              <Calendar size={10} className="text-muted-foreground" />
              <span className="text-[8px] font-black uppercase text-muted-foreground">{kickoffDate} {kickoffTime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSuspended && <Badge className="bg-amber-500 text-black text-[7px] font-black h-4 px-1 gap-0.5 animate-pulse"><Lock size={8}/> SUSPENSO</Badge>}
          <Badge variant="outline" className="border-white/10 text-slate-500 text-[7px] uppercase font-black h-4">{match.leagueName || match.league}</Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* Confronto e Placar */}
        <div className="flex justify-between items-center gap-2">
          <div className="text-center flex-1 min-w-0">
            <div className="w-10 h-10 mx-auto mb-1.5 bg-white/5 rounded-full flex items-center justify-center border border-white/5 overflow-hidden">
              <img src={match.homeLogo} className="w-7 h-7 object-contain" alt="" onError={(e) => e.currentTarget.src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'} />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{homeName}</p>
          </div>
          
          <div className={cn(
            "px-4 py-1.5 rounded-xl border min-w-[80px] text-center shadow-inner", 
            match.isLive ? "bg-red-600/10 border-red-500/20" : "bg-black/40 border-white/5"
          )}>
            <span className={cn("text-2xl font-black italic tracking-widest tabular-nums", match.isLive ? "text-red-500" : "text-primary")}>
              {match.scoreHome} - {match.scoreAway}
            </span>
          </div>

          <div className="text-center flex-1 min-w-0">
            <div className="w-10 h-10 mx-auto mb-1.5 bg-white/5 rounded-full flex items-center justify-center border border-white/5 overflow-hidden">
              <img src={match.awayLogo} className="w-7 h-7 object-contain" alt="" onError={(e) => e.currentTarget.src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'} />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{awayName}</p>
          </div>
        </div>

        {/* Mercados */}
        <Tabs defaultValue="1X2" className="w-full">
          <TabsList className="grid grid-cols-3 bg-black/40 h-8 border border-white/5 p-0.5 mb-3 rounded-lg">
            <TabsTrigger value="1X2" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Vencedor</TabsTrigger>
            <TabsTrigger value="OU25" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Gols +/-</TabsTrigger>
            <TabsTrigger value="BTTS" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Ambas</TabsTrigger>
          </TabsList>

          {markets.map((market: any) => (
            <TabsContent key={market.id} value={market.id} className="mt-0">
              <div className={cn(
                "grid gap-1.5", 
                market.selections.length === 3 ? "grid-cols-3" : "grid-cols-2", 
                (isSuspended || isClosed) && "opacity-40 pointer-events-none"
              )}>
                {market.selections.map((sel: any) => (
                  <Button 
                    key={sel.id} 
                    variant="outline"
                    className={cn(
                      "flex-col h-12 bg-black/20 border-white/5 transition-all rounded-xl p-0 hover:bg-primary/10 hover:border-primary/30",
                      isSelected?.(market.name, sel.label) && "bg-primary text-black border-primary shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:bg-primary"
                    )}
                    onClick={() => onSelectOdd?.(market.name, sel.label, sel.odd)}
                  >
                    <span className={cn("text-[7px] font-black uppercase opacity-60", isSelected?.(market.name, sel.label) && "opacity-80")}>{sel.label}</span>
                    <span className="text-[13px] font-black italic tabular-nums">@{sel.odd.toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {(isSuspended || isClosed) && (
          <div className="text-center py-2 bg-black/40 rounded-xl border border-dashed border-white/10 animate-in fade-in">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{isClosed ? 'MERCADO ENCERRADO' : 'MERCADO SUSPENSO'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
