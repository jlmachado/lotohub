/**
 * @fileOverview Card de partida refinado para Sportsbook Profissional.
 * Suporta múltiplos mercados (1X2, Over/Under, Ambas Marcam) e suspensão dinâmica.
 */

'use client';

import React, { useState } from 'react';
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

  const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name : match.homeTeam;
  const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name : match.awayTeam;

  const markets = match.markets || [];

  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 overflow-hidden transition-all shadow-xl",
      match.isLive ? "ring-1 ring-red-500/40" : "hover:border-primary/30"
    )}>
      <div className={cn("p-2.5 border-b flex justify-between items-center", match.isLive ? "bg-red-600/20" : "bg-white/5")}>
        <div className="flex items-center gap-2">
          {match.isLive ? (
            <>
              <Radio size={10} className="text-red-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase text-red-500 italic">AO VIVO • {match.minute}</span>
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
          <Badge variant="outline" className="border-white/10 text-slate-500 text-[7px] uppercase font-black h-4">{match.league}</Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center gap-2">
          <div className="text-center flex-1 min-w-0">
            <img src={match.homeLogo} className="w-8 h-8 mx-auto mb-1.5 object-contain" alt="" />
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{homeName}</p>
          </div>
          <div className={cn("px-3 py-1 rounded-lg border min-w-[70px] text-center shadow-inner", match.isLive ? "bg-red-600/10 border-red-500/20" : "bg-black/40 border-white/5")}>
            <span className={cn("text-xl font-black italic tracking-widest tabular-nums", match.isLive ? "text-red-500" : "text-primary")}>
              {match.scoreHome} - {match.scoreAway}
            </span>
          </div>
          <div className="text-center flex-1 min-w-0">
            <img src={match.awayLogo} className="w-8 h-8 mx-auto mb-1.5 object-contain" alt="" />
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{awayName}</p>
          </div>
        </div>

        <Tabs defaultValue="1X2" className="w-full">
          <TabsList className="grid grid-cols-3 bg-black/40 h-7 border border-white/5 p-0.5 mb-3">
            <TabsTrigger value="1X2" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Vencedor</TabsTrigger>
            <TabsTrigger value="OU25" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Gols +/-</TabsTrigger>
            <TabsTrigger value="BTTS" className="text-[8px] font-black uppercase italic tracking-tighter py-0">Ambas</TabsTrigger>
          </TabsList>

          {markets.map((market: any) => (
            <TabsContent key={market.id} value={market.id} className="mt-0">
              <div className={cn("grid gap-1.5", market.selections.length === 3 ? "grid-cols-3" : "grid-cols-2", (isSuspended || isClosed) && "opacity-40 pointer-events-none")}>
                {market.selections.map((sel: any) => (
                  <Button 
                    key={sel.id} 
                    variant="outline"
                    className={cn(
                      "flex-col h-11 bg-black/20 border-white/5 transition-all rounded-lg p-0",
                      isSelected?.(market.name, sel.label) && "bg-primary text-black border-primary shadow-lg"
                    )}
                    onClick={() => onSelectOdd?.(market.name, sel.label, sel.odd)}
                  >
                    <span className="text-[7px] font-black opacity-50 mb-0.5 uppercase">{sel.label}</span>
                    <span className="text-[12px] font-black italic tabular-nums">@{sel.odd.toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {(isSuspended || isClosed) && (
          <div className="text-center py-1.5 bg-black/20 rounded-lg border border-dashed border-white/5 animate-in fade-in">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{isClosed ? 'MERCADO ENCERRADO' : 'MERCADO SUSPENSO'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
