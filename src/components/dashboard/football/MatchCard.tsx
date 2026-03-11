/**
 * @fileOverview Card de partida refinado para Sportsbook Live.
 * Atualizado para exibir status do mercado e alertas de suspensão.
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Calendar, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: any;
  onSelectOdd?: (selection: string, odd: number) => void;
  isSelected?: (selection: string) => boolean;
  disabled?: boolean;
}

export function MatchCard({ match, onSelectOdd, isSelected, disabled }: MatchCardProps) {
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const kickoffDate = new Date(match.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const isSuspended = match.marketStatus === 'SUSPENDED';
  const isClosed = match.marketStatus === 'CLOSED' || match.isFinished;

  // Extração segura de nomes e logos para evitar erro "Objects are not valid as a React child"
  // Caso o dado venha mal formatado do storage (objeto em vez de string)
  const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name : match.homeTeam;
  const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name : match.awayTeam;
  const homeLogoUrl = typeof match.homeTeam === 'object' ? match.homeTeam?.logo : match.homeLogo;
  const awayLogoUrl = typeof match.awayTeam === 'object' ? match.awayTeam?.logo : match.awayLogo;

  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 overflow-hidden transition-all shadow-xl group",
      match.isLive ? "ring-1 ring-red-500/40" : "hover:border-primary/30"
    )}>
      {/* Header do Card */}
      <div className={cn(
        "p-2.5 border-b flex justify-between items-center",
        match.isLive ? "bg-red-600/20" : "bg-white/5"
      )}>
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
          {isSuspended && (
            <Badge className="bg-amber-500 text-black text-[7px] font-black h-4 px-1 gap-0.5 animate-pulse">
              <Lock size={8} /> SUSPENSO
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
              <img src={homeLogoUrl} className="w-full h-full object-contain" alt="" />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">
              {String(homeName || '---')}
            </p>
          </div>
          
          <div className={cn(
            "px-3 py-1 rounded-lg border min-w-[70px] text-center shadow-inner transition-colors",
            match.isLive ? "bg-red-600/10 border-red-500/20" : "bg-black/40 border-white/5"
          )}>
            {match.isLive || match.isFinished ? (
              <span className={cn(
                "text-xl font-black italic tracking-widest tabular-nums",
                match.isLive ? "text-red-500" : "text-primary"
              )}>
                {match.scoreHome} - {match.scoreAway}
              </span>
            ) : (
              <span className="text-[10px] font-black text-slate-500 uppercase italic">VS</span>
            )}
          </div>

          <div className="text-center flex-1 min-w-0">
            <div className="w-8 h-8 mx-auto mb-1.5 relative">
              <img src={awayLogoUrl} className="w-full h-full object-contain" alt="" />
            </div>
            <p className="text-[11px] font-black uppercase italic text-white truncate leading-tight">
              {String(awayName || '---')}
            </p>
          </div>
        </div>

        {/* Painel de Odds */}
        {!disabled && !isClosed ? (
          <div className={cn("grid grid-cols-3 gap-1.5 transition-opacity", isSuspended && "opacity-40 pointer-events-none")}>
            <OddButton 
              label="1" 
              odd={match.odds?.home || 1.0} 
              active={isSelected?.('Casa')} 
              onClick={() => onSelectOdd?.('Casa', match.odds?.home || 1.0)} 
            />
            <OddButton 
              label="X" 
              odd={match.odds?.draw || 1.0} 
              active={isSelected?.('Empate')} 
              onClick={() => onSelectOdd?.('Empate', match.odds?.draw || 1.0)} 
            />
            <OddButton 
              label="2" 
              odd={match.odds?.away || 1.0} 
              active={isSelected?.('Fora')} 
              onClick={() => onSelectOdd?.('Fora', match.odds?.away || 1.0)} 
            />
          </div>
        ) : (
          <div className="text-center py-2.5 bg-black/20 rounded-xl border border-dashed border-white/5">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic flex items-center justify-center gap-1.5">
              <Info size={10} />
              {match.isFinished ? 'FINALIZADO' : 'MERCADO ENCERRADO'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OddButton({ label, odd, onClick, active }: any) {
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
        {typeof odd === 'number' ? odd.toFixed(2) : '1.00'}
      </span>
    </Button>
  );
}
