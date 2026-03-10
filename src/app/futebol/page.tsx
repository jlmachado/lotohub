/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Organizada como um Sportsbook: Ao Vivo, Próximos e Outros.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Goal, Radio, Trophy, Calendar, RefreshCw, Info } from 'lucide-react';
import { useMemo } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MatchModel } from '@/services/match-mapper-service';
import { MatchCard } from '@/components/dashboard/football/MatchCard';
import { FootballDashboardStats } from '@/components/dashboard/football/FootballDashboardStats';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();

  // Categorização das Partidas
  const liveMatches = useMemo(() => footballData.unifiedMatches.filter(m => m.isLive), [footballData.unifiedMatches]);
  const bettableUpcoming = useMemo(() => footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished && m.hasOdds), [footballData.unifiedMatches]);
  const otherMatches = useMemo(() => footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished && !m.hasOdds), [footballData.unifiedMatches]);

  const stats = useMemo(() => ({
    live: liveMatches.length,
    bettable: bettableUpcoming.length,
    total: footballData.unifiedMatches.length,
    leagues: footballData.leagues.filter(l => l.active).length,
    noOdds: otherMatches.length
  }), [liveMatches, bettableUpcoming, otherMatches, footballData]);

  const handleSelectOdd = (match: MatchModel, selection: string, odd: number) => {
    addBetToSlip({
      id: `${match.id}-1X2-${selection}`,
      matchId: match.id,
      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      market: 'Vencedor 1X2',
      selection,
      pickLabel: selection === 'Casa' ? match.homeTeam : selection === 'Fora' ? match.awayTeam : 'Empate',
      odd,
      isLive: match.isLive,
      addedAt: Date.now()
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-32">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Sportsbook Futebol</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px] h-5">Profissional</Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Integração ESPN & LiveScore</p>
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

        <FootballDashboardStats stats={stats} />

        {/* SEÇÃO AO VIVO */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Partidas Ao Vivo</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(sel) => betSlip.some(b => b.matchId === match.id && b.selection === sel)}
                  onSelectOdd={(sel, odd) => handleSelectOdd(match, sel, odd)} 
                />
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO PRÓXIMOS JOGOS COM ODDS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-green-500">
            <Goal size={18} />
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Próximas Partidas (Apostáveis)</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bettableUpcoming.length === 0 ? (
              <Card className="col-span-full bg-slate-900/50 border-white/5 p-12 text-center">
                <p className="text-muted-foreground italic font-medium">Nenhuma partida com odds disponíveis para hoje.</p>
              </Card>
            ) : (
              bettableUpcoming.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(sel) => betSlip.some(b => b.matchId === match.id && b.selection === sel)}
                  onSelectOdd={(sel, odd) => handleSelectOdd(match, sel, odd)} 
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
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-400">Outros Eventos (Sem Odds)</h2>
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
