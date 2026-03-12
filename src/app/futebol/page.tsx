/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Exibe partidas da ESPN com liquidação automática e mercados dinâmicos.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, Search } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MatchCard } from '@/components/dashboard/football/MatchCard';
import { FootballDashboardStats } from '@/components/dashboard/football/FootballDashboardStats';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const liveMatches = useMemo(() => 
    footballData.unifiedMatches.filter(m => m.isLive && !m.isFinished), 
  [footballData.unifiedMatches]);

  const upcomingMatches = useMemo(() => 
    footballData.unifiedMatches.filter(m => !m.isLive && !m.isFinished), 
  [footballData.unifiedMatches]);

  const filteredUpcoming = useMemo(() => 
    upcomingMatches.filter(m => 
      m.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.league.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
  [upcomingMatches, searchTerm]);

  const stats = useMemo(() => ({
    live: liveMatches.length,
    bettable: footballData.unifiedMatches.filter(m => m.marketStatus === 'OPEN').length,
    total: footballData.unifiedMatches.length,
    leagues: footballData.leagues.filter(l => l.active).length,
    noOdds: footballData.unifiedMatches.filter(m => !m.hasOdds).length
  }), [liveMatches, footballData]);

  useEffect(() => {
    if (footballData.unifiedMatches.length === 0 && footballData.syncStatus === 'idle') {
      syncFootballAll();
    }
    // Sync periódico a cada 60s se houver jogos LIVE
    if (liveMatches.length > 0) {
      const timer = setInterval(() => syncFootballAll(), 60000);
      return () => clearInterval(timer);
    }
  }, [footballData.unifiedMatches.length, footballData.syncStatus, syncFootballAll, liveMatches.length]);

  const handleSelectOdd = (match: any, market: string, selection: string, odd: number) => {
    addBetToSlip({
      id: `${match.id}-${market.replace(/ /g, '_')}-${selection}`,
      matchId: match.id,
      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      market,
      selection,
      pickLabel: selection,
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
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Sportsbook Pro</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px] h-5 shadow-[0_0_15px_rgba(251,191,36,0.3)]">Liquidação Automática</Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Powered by ESPN & Live Score API</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar time ou liga..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-900 border-white/5 pl-9 h-11 rounded-xl text-xs uppercase font-bold"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => syncFootballAll(true)}
              disabled={footballData.syncStatus === 'syncing'}
              className="border-white/10 bg-white/5 h-11 px-6 rounded-xl lux-shine"
            >
              {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync
            </Button>
          </div>
        </div>

        <FootballDashboardStats stats={stats} />

        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Eventos In-Play</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(m, s) => betSlip.some(b => b.matchId === match.id && b.market === m && b.selection === s)}
                  onSelectOdd={(m, s, o) => handleSelectOdd(match, m, s, o)} 
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={18} />
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Mercados Futuros</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUpcoming.length === 0 && footballData.syncStatus !== 'syncing' ? (
              <Card className="col-span-full bg-slate-900/50 border-white/5 p-16 text-center border-dashed">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Nenhuma partida disponível para os critérios de busca.</p>
              </Card>
            ) : (
              filteredUpcoming.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(m, s) => betSlip.some(b => b.matchId === match.id && b.market === m && b.selection === s)}
                  onSelectOdd={(m, s, o) => handleSelectOdd(match, m, s, o)} 
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
