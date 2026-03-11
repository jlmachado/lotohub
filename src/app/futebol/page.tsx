/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Exibe partidas da ESPN com odds calculadas internamente.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Goal, RefreshCw, Info, Calendar } from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { MatchCard } from '@/components/dashboard/football/MatchCard';
import { FootballDashboardStats } from '@/components/dashboard/football/FootballDashboardStats';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();

  // Categorização das Partidas (UnifiedMatches já contém as odds geradas)
  const liveMatches = useMemo(() => footballData.unifiedMatches.filter(m => m.isLive), [footballData.unifiedMatches]);
  const upcomingMatches = useMemo(() => footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished), [footballData.unifiedMatches]);

  const stats = useMemo(() => ({
    live: liveMatches.length,
    bettable: footballData.unifiedMatches.filter(m => m.marketStatus === 'OPEN').length,
    total: footballData.unifiedMatches.length,
    leagues: footballData.leagues.filter(l => l.active).length,
    noOdds: footballData.unifiedMatches.filter(m => !m.hasOdds).length
  }), [liveMatches, footballData]);

  // Sincronização automática inicial se estiver vazio
  useEffect(() => {
    if (footballData.unifiedMatches.length === 0 && footballData.syncStatus === 'idle') {
      syncFootballAll();
    }
  }, [footballData.unifiedMatches.length, footballData.syncStatus, syncFootballAll]);

  const handleSelectOdd = (match: any, selection: string, odd: number) => {
    // Garantir que os nomes dos times sejam strings, extraindo do objeto se necessário
    const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name : match.homeTeam;
    const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name : match.awayTeam;

    addBetToSlip({
      id: `${match.id}-1X2-${selection}`,
      matchId: match.id,
      matchName: `${homeName || '---'} vs ${awayName || '---'}`,
      homeTeam: homeName || '---',
      awayTeam: awayName || '---',
      market: 'Vencedor 1X2',
      selection,
      pickLabel: selection === 'Casa' ? homeName : selection === 'Fora' ? awayName : 'Empate',
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
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Futebol LotoHub</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px] h-5">Sistema Interno</Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Odds Dinâmicas baseadas na ESPN</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => syncFootballAll(true)}
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 bg-white/5 text-[10px] font-black uppercase italic h-11 px-6 rounded-xl lux-shine"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar Odds
          </Button>
        </div>

        <FootballDashboardStats stats={stats} />

        {/* SEÇÃO AO VIVO */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Ao Vivo</h2>
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

        {/* SEÇÃO PRÓXIMOS JOGOS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={18} />
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Próximas Partidas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingMatches.length === 0 && footballData.syncStatus !== 'syncing' ? (
              <Card className="col-span-full bg-slate-900/50 border-white/5 p-12 text-center">
                <p className="text-muted-foreground italic font-medium">Nenhuma partida disponível para hoje. Tente sincronizar novamente.</p>
              </Card>
            ) : (
              upcomingMatches.map(match => (
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
      </main>

      <BetSlip />
    </div>
  );
}
