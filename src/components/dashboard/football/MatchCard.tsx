/**
 * @fileOverview Card de partida refinado para Sportsbook.
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Calendar, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchModel } from '@/services/match-mapper-service';

interface MatchCardProps {
  match: MatchModel;
  onSelectOdd?: (selection: string, odd: number) => void;
  isSelected?: (selection: string) => boolean;
  disabled?: boolean;
}

export function MatchCard({ match, onSelectOdd, isSelected, disabled }: MatchCardProps) {
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const kickoffDate = new Date(match.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 overflow-hidden transition-all shadow-xl group",
      match.isLive ? "ring-1 ring-red-500/20" : "hover:border-primary/30"
    )}>
      {/* Header do Card */}
      <div className={cn(
        "p-2.5 border-b flex justify-between items-center",
        match.isLive ? "bg-red-600/10" : "bg-white/5"
      )}>
        <div className="flex items-center gap-2">
          {match.isLive ? (
            <>
              <Radio size={10} className="text-red-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase text-red-500">AO VIVO • {match.minute}'</span>
            </>
          ) : (
            <>
              <Calendar size={10} className="text-muted-foreground" />
              <span className="text-[8px] font-black uppercase text-muted-foreground">{kickoffDate} {kickoffTime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {match.oddsSource === 'AUTO' && !match.isFinished && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[7px] font-black h-4 px-1 gap-0.5 bg-amber-500/5">
              <Sparkles size={8} /> AUTO ODDS
            </Badge>
          )}
          <Badge variant="outline" className="border-white/10 text-slate-500 text-[7px] uppercase font-black h-4 max-w-[80px] truncate">
            {match.league}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-5">
        {/* Times e Placar */}
        <div className="flex justify-between items-center gap-2">
          <div className="text-center flex-1 min-w-0">
            <div className="w-8 h-8 mx-auto mb-1.5 relative">
              <img src={match.homeLogo} className="w-full h-full object-contain" alt="" />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{match.homeTeam}</p>
          </div>
          
          <div className="px-3 py-1 bg-black/40 rounded-lg border border-white/5 min-w-[70px] text-center shadow-inner">
            {match.isLive || match.isFinished ? (
              <span className="text-xl font-black italic tracking-widest text-primary tabular-nums">
                {match.scoreHome} - {match.scoreAway}
              </span>
            ) : (
              <span className="text-[10px] font-black text-slate-500 uppercase italic">VS</span>
            )}
          </div>

          <div className="text-center flex-1 min-w-0">
            <div className="w-8 h-8 mx-auto mb-1.5 relative">
              <img src={match.awayLogo} className="w-full h-full object-contain" alt="" />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">{match.awayTeam}</p>
          </div>
        </div>

        {/* Painel de Odds */}
        {!disabled && match.marketStatus === 'OPEN' ? (
          <div className="grid grid-cols-3 gap-1.5">
            <OddButton 
              label="1" 
              odd={match.odds.home} 
              active={isSelected?.('Casa')} 
              onClick={() => onSelectOdd?.('Casa', match.odds.home)} 
            />
            <OddButton 
              label="X" 
              odd={match.odds.draw} 
              active={isSelected?.('Empate')} 
              onClick={() => onSelectOdd?.('Empate', match.odds.draw)} 
            />
            <OddButton 
              label="2" 
              odd={match.odds.away} 
              active={isSelected?.('Fora')} 
              onClick={() => onSelectOdd?.('Fora', match.odds.away)} 
            />
          </div>
        ) : (
          <div className="text-center py-2.5 bg-black/20 rounded-xl border border-dashed border-white/5">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic flex items-center justify-center gap-1.5">
              <Info size={10} />
              {match.isFinished ? 'FINALIZADO' : 'MERCADO SUSPENSO'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OddButton({ label, odd, onClick, active }: any) {
  if (!odd || odd <= 1) return (
    <div className="flex flex-col h-12 bg-black/40 border border-white/5 rounded-lg items-center justify-center opacity-30 grayscale">
      <span className="text-[10px] font-bold text-slate-500">-</span>
    </div>
  );

  return (
    <Button 
      variant="outline"
      className={cn(
        "flex-col h-12 bg-black/20 border-white/5 transition-all rounded-lg p-0 hover:bg-primary/10",
        active ? "bg-primary text-black border-primary shadow-lg shadow-primary/10 hover:bg-primary" : "hover:border-primary/40"
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <span className={cn("text-[8px] font-black opacity-50 mb-0.5", active && "text-black")}>{label}</span>
      <span className={cn("text-[13px] font-black italic", active ? "text-black" : "text-primary tabular-nums")}>
        {odd.toFixed(2)}
      </span>
    </Button>
  );
}
