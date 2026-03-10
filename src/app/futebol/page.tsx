/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Integra dados unificados da ESPN e Live Score API.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Goal, Radio, Trophy, Calendar, RefreshCw, AlertTriangle, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MatchModel } from '@/services/match-mapper-service';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'live' | 'bettable'>('all');

  const stats = useMemo(() => {
    return {
      live: footballData.unifiedMatches.filter(m => m.isLive).length,
      today: footballData.unifiedMatches.filter(m => {
        const d = new Date(m.kickoff);
        return d.toDateString() === new Date().toDateString();
      }).length,
      bettable: footballData.unifiedMatches.filter(m => m.isBettable).length,
      leagues: footballData.leagues.filter(l => l.active).length
    };
  }, [footballData.unifiedMatches, footballData.leagues]);

  const filteredMatches = useMemo(() => {
    let matches = footballData.unifiedMatches;
    if (filter === 'live') matches = matches.filter(m => m.isLive);
    if (filter === 'bettable') matches = matches.filter(m => m.isBettable);
    return matches;
  }, [footballData.unifiedMatches, filter]);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Hub de Apostas</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Dados estruturais ESPN • Odds LiveScore</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncFootballAll(true)}
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 bg-white/5 text-[10px] font-black uppercase italic h-10 px-4 rounded-xl"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
            Atualizar Mercado
          </Button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Ao Vivo" value={stats.live} icon={Radio} color="text-red-500" />
          <StatCard label="Jogos Hoje" value={stats.today} icon={Calendar} color="text-primary" />
          <StatCard label="Apostas Abertas" value={stats.bettable} icon={Wallet} color="text-green-400" />
          <StatCard label="Campeonatos" value={stats.leagues} icon={Trophy} color="text-blue-400" />
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 h-12 p-1 rounded-xl border border-white/5">
            <TabsTrigger value="all" className="gap-2 uppercase text-[10px] font-black italic">
              Todas Partidas
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2 uppercase text-[10px] font-black italic">
              <Radio size={14} className="text-red-500" /> Ao Vivo
            </TabsTrigger>
            <TabsTrigger value="bettable" className="gap-2 uppercase text-[10px] font-black italic">
              <Goal size={14} className="text-green-500" /> Com Odds
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredMatches.length === 0 ? (
              <EmptyState />
            ) : (
              filteredMatches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isSelected={(sel) => betSlip.some(b => b.matchId === match.id && b.selection === sel)}
                  onSelectOdd={(selection, odd) => {
                    addBetToSlip({
                      id: `${match.id}-${selection}`,
                      matchId: match.id,
                      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                      market: 'Vencedor 1X2',
                      selection,
                      pickLabel: selection,
                      odd
                    });
                  }} 
                />
              ))
            )}
          </div>
        </Tabs>
      </main>

      <BetSlip />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-lg">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className="p-2 bg-white/5 rounded-lg mb-2">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white italic tracking-tighter">{value}</p>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, onSelectOdd, isSelected }: { match: MatchModel, onSelectOdd: (sel: string, odd: number) => void, isSelected: (sel: string) => boolean }) {
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const kickoffDate = new Date(match.kickoff).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <Card className="bg-slate-900 border-white/5 overflow-hidden group hover:border-primary/20 transition-all shadow-xl">
      <div className={cn(
        "p-3 border-b flex justify-between items-center",
        match.isLive ? "bg-red-600/10 border-red-600/20" : "bg-white/5 border-white/5"
      )}>
        <div className="flex items-center gap-2">
          {match.isLive ? (
            <>
              <Radio size={12} className="text-red-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">AO VIVO • {match.minute}'</span>
            </>
          ) : (
            <>
              <Calendar size={12} className="text-muted-foreground" />
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">{kickoffDate} {kickoffTime}</span>
            </>
          )}
        </div>
        <Badge className="bg-slate-800 text-[8px] h-4 uppercase border-0">{match.league}</Badge>
      </div>
      
      <CardContent className="p-4 space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="text-center flex-1 min-w-0">
            <img src={match.homeLogo} className="w-8 h-8 mx-auto mb-2 object-contain" alt="" />
            <p className="text-sm font-black uppercase italic tracking-tighter text-white truncate">{match.homeTeam}</p>
          </div>
          <div className="bg-black/40 px-4 py-1 rounded-lg text-2xl font-black italic tracking-widest text-primary border border-white/5 mx-4 min-w-[80px] text-center shadow-inner">
            {match.isLive || match.isFinished ? `${match.scoreHome} - ${match.scoreAway}` : 'vs'}
          </div>
          <div className="text-center flex-1 min-w-0">
            <img src={match.awayLogo} className="w-8 h-8 mx-auto mb-2 object-contain" alt="" />
            <p className="text-sm font-black uppercase italic tracking-tighter text-white truncate">{match.awayTeam}</p>
          </div>
        </div>

        {match.hasOdds ? (
          <div className="grid grid-cols-3 gap-2">
            <OddButton 
              label="CASA" 
              odd={match.odds.home} 
              active={isSelected('Casa')}
              onClick={() => onSelectOdd('Casa', match.odds.home)} 
            />
            <OddButton 
              label="EMPATE" 
              odd={match.odds.draw} 
              active={isSelected('Empate')}
              onClick={() => onSelectOdd('Empate', match.odds.draw)} 
            />
            <OddButton 
              label="FORA" 
              odd={match.odds.away} 
              active={isSelected('Fora')}
              onClick={() => onSelectOdd('Fora', match.odds.away)} 
            />
          </div>
        ) : (
          <div className="text-center py-2 bg-black/20 rounded-xl border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
              <AlertTriangle className="inline h-3 w-3 mr-1" /> Mercado Indisponível
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
      variant={active ? "default" : "outline"}
      className={cn(
        "flex-col h-14 bg-black/20 border-white/5 transition-all group/btn rounded-xl",
        active ? "bg-primary text-black border-primary scale-[1.02] shadow-lg shadow-primary/20" : "hover:bg-primary/10 hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <span className={cn("text-[9px] font-black opacity-50", active && "opacity-100")}>{label}</span>
      <span className={cn("text-sm font-black italic", active ? "text-black" : "text-primary")}>@{odd.toFixed(2)}</span>
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
      <Radio className="h-8 w-8 text-slate-600 mx-auto mb-4" />
      <h3 className="text-white font-black uppercase italic tracking-tight">Nenhuma partida encontrada</h3>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-2">Tente atualizar os dados no botão acima.</p>
    </div>
  );
}
