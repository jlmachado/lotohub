/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Organizada como um Sportsbook: Ao Vivo, Próximos e Outros.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Goal, Radio, Trophy, Calendar, RefreshCw, AlertTriangle, Timer, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MatchModel } from '@/services/match-mapper-service';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'bettable'>('all');

  // Categorização das Partidas
  const liveMatches = useMemo(() => footballData.unifiedMatches.filter(m => m.isLive), [footballData.unifiedMatches]);
  const bettableUpcoming = useMemo(() => footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished && m.hasOdds), [footballData.unifiedMatches]);
  const otherMatches = useMemo(() => footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished && !m.hasOdds), [footballData.unifiedMatches]);

  const stats = useMemo(() => ({
    live: liveMatches.length,
    bettable: bettableUpcoming.length,
    total: footballData.unifiedMatches.length,
    leagues: footballData.leagues.filter(l => l.active).length
  }), [liveMatches, bettableUpcoming, footballData]);

  return (
    <div className="min-h-screen bg-[#020617] pb-32">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Sportsbook Futebol</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px] h-5">Profissional</Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cruze de Dados ESPN & LiveScore</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => syncFootballAll(true)}
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 bg-white/5 text-[10px] font-black uppercase italic h-11 px-6 rounded-xl lux-shine"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar Mercado
          </Button>
        </div>

        {/* KPI DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Ao Vivo Agora" value={stats.live} icon={Radio} color="text-red-500" />
          <StatCard label="Odds Pré-Jogo" value={stats.bettable} icon={Goal} color="text-green-400" />
          <StatCard label="Total Eventos" value={stats.total} icon={Calendar} color="text-primary" />
          <StatCard label="Ligas Ativas" value={stats.leagues} icon={Trophy} color="text-blue-400" />
        </div>

        {/* SEÇÃO AO VIVO */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-red-500 animate-pulse" />
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Partidas em Tempo Real</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(sel) => betSlip.some(b => b.matchId === match.id && b.selection === sel)}
                  onSelectOdd={(selection, odd) => addBetToSlip({
                    id: `${match.id}-1X2-${selection}`,
                    matchId: match.id,
                    matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                    market: 'Vencedor 1X2',
                    selection,
                    pickLabel: selection,
                    odd
                  })} 
                />
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO PRÓXIMOS JOGOS COM ODDS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Goal size={18} className="text-green-500" />
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Próximas Partidas (Mercado Aberto)</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bettableUpcoming.length === 0 ? (
              <Card className="col-span-full bg-slate-900/50 border-white/5 p-8 text-center">
                <p className="text-muted-foreground italic font-medium">Nenhuma partida com odds disponíveis para hoje.</p>
              </Card>
            ) : (
              bettableUpcoming.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(sel) => betSlip.some(b => b.matchId === match.id && b.selection === sel)}
                  onSelectOdd={(selection, odd) => addBetToSlip({
                    id: `${match.id}-1X2-${selection}`,
                    matchId: match.id,
                    matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                    market: 'Vencedor 1X2',
                    selection,
                    pickLabel: selection,
                    odd
                  })} 
                />
              ))
            )}
          </div>
        </section>

        {/* OUTRAS PARTIDAS (SEM ODDS) */}
        {otherMatches.length > 0 && (
          <section className="space-y-4 pt-8">
            <div className="flex items-center gap-2 opacity-50">
              <Info size={18} className="text-slate-400" />
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-400">Outros Eventos (Somente Info)</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
              {otherMatches.map(match => (
                <MatchCard key={match.id} match={match} disabled />
              ))}
            </div>
          </section>
        )}
      </main>

      <BetSlip />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-2xl overflow-hidden group">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 bg-white/5 rounded-xl transition-colors group-hover:bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
          <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, onSelectOdd, isSelected, disabled }: { match: MatchModel, onSelectOdd?: (sel: string, odd: number) => void, isSelected?: (sel: string) => boolean, disabled?: boolean }) {
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const kickoffDate = new Date(match.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 overflow-hidden transition-all shadow-xl",
      match.isLive ? "ring-1 ring-red-500/20" : "",
      !disabled && "hover:border-primary/30"
    )}>
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
        <Badge variant="outline" className="border-white/10 text-slate-500 text-[7px] uppercase font-black h-4">{match.league}</Badge>
      </div>
      
      <CardContent className="p-4 space-y-5">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1 min-w-0">
            <img src={match.homeLogo} className="w-7 h-7 mx-auto mb-1.5 object-contain" alt="" />
            <p className="text-[11px] font-black uppercase italic text-white truncate">{match.homeTeam}</p>
          </div>
          <div className="px-3 py-1 bg-black/40 rounded border border-white/5 mx-2 min-w-[60px] text-center">
            {match.isLive ? (
              <span className="text-lg font-black italic tracking-widest text-primary tabular-nums">{match.scoreHome} - {match.scoreAway}</span>
            ) : (
              <span className="text-[10px] font-black text-slate-500 uppercase italic">VS</span>
            )}
          </div>
          <div className="text-center flex-1 min-w-0">
            <img src={match.awayLogo} className="w-7 h-7 mx-auto mb-1.5 object-contain" alt="" />
            <p className="text-[11px] font-black uppercase italic text-white truncate">{match.awayTeam}</p>
          </div>
        </div>

        {!disabled && match.hasOdds ? (
          <div className="grid grid-cols-3 gap-1.5">
            <OddButton label="1" odd={match.odds.home} active={isSelected?.('Casa')} onClick={() => onSelectOdd?.('Casa', match.odds.home)} />
            <OddButton label="X" odd={match.odds.draw} active={isSelected?.('Empate')} onClick={() => onSelectOdd?.('Empate', match.odds.draw)} />
            <OddButton label="2" odd={match.odds.away} active={isSelected?.('Fora')} onClick={() => onSelectOdd?.('Fora', match.odds.away)} />
          </div>
        ) : (
          <div className="text-center py-2.5 bg-black/20 rounded-lg border border-dashed border-white/5">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
              {disabled ? 'Visualização' : 'Odds Indisponíveis'}
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
        "flex-col h-12 bg-black/20 border-white/5 transition-all rounded-lg p-0",
        active ? "bg-primary text-black border-primary shadow-lg shadow-primary/10" : "hover:border-primary/40"
      )}
      onClick={onClick}
    >
      <span className={cn("text-[8px] font-black opacity-50", active && "text-black")}>{label}</span>
      <span className={cn("text-xs font-black italic", active ? "text-black" : "text-primary")}>@{odd.toFixed(2)}</span>
    </Button>
  );
}
