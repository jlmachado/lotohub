/**
 * @fileOverview Dashboard Pública de Futebol (ESPN Integration).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Flag, AlertCircle, Calendar, History, List, Radio } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export default function FutebolDashboardPage() {
  const { footballData } = useAppContext();
  const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null);

  const activeLeagues = useMemo(() => 
    footballData.leagues.filter(l => l.active), 
  [footballData.leagues]);

  const activeLeague = useMemo(() => {
    if (selectedLeagueSlug) return activeLeagues.find(l => l.slug === selectedLeagueSlug);
    return activeLeagues[0];
  }, [activeLeagues, selectedLeagueSlug]);

  const matchesForActiveLeague = useMemo(() => 
    footballData.matches.filter(m => !activeLeague || m.leagueSlug === activeLeague.slug), 
  [footballData.matches, activeLeague]);

  const standings = useMemo(() => 
    activeLeague ? (footballData.standings[activeLeague.slug] || []) : [], 
  [footballData.standings, activeLeague]);

  const matchesToday = matchesForActiveLeague.filter(m => m.status === 'LIVE' || m.status === 'SCHEDULED');
  const matchesFinished = matchesForActiveLeague.filter(m => m.status === 'FINISHED');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* LEAGUE SELECTOR */}
        <div className="flex flex-col gap-6 bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-center">
              <Trophy size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                {activeLeague?.name || "Dashboard Futebol"}
              </h1>
              <p className="text-primary font-black uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
                <Radio size={12} className="animate-pulse" /> ESPN REAL-TIME DATA • {activeLeague?.category}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeLeagues.map(l => (
              <button 
                key={l.id} 
                onClick={() => setSelectedLeagueSlug(l.slug)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  (selectedLeagueSlug === l.slug || (!selectedLeagueSlug && activeLeagues[0]?.slug === l.slug))
                    ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                    : "bg-slate-950 text-muted-foreground border-white/5 hover:border-primary/30"
                )}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 h-14 p-1.5 rounded-2xl border border-white/5">
            <TabsTrigger value="matches" className="gap-2 font-black uppercase text-[10px]"><Calendar size={14} /> Jogos</TabsTrigger>
            <TabsTrigger value="standings" className="gap-2 font-black uppercase text-[10px]"><Trophy size={14} /> Tabela</TabsTrigger>
            <TabsTrigger value="results" className="gap-2 font-black uppercase text-[10px]"><History size={14} /> Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black uppercase italic text-white">Partidas</h2>
              <Badge variant="outline" className="border-white/10 uppercase text-[9px] font-bold">Hoje e Próximos</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchesToday.length === 0 ? (
                <EmptyState msg="Nenhuma partida programada para agora." />
              ) : (
                matchesToday.map(m => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="standings">
            {standings.length === 0 ? (
              <EmptyState msg="Classificação indisponível para esta liga ou em fase de mata-mata." />
            ) : (
              <Card className="border-0 bg-slate-900/50 shadow-2xl overflow-hidden rounded-3xl">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5 h-12">
                      <TableHead className="w-[60px] text-center font-black uppercase text-[10px]">#</TableHead>
                      <TableHead className="font-black uppercase text-[10px]">Clube</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Pts</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">J</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">V</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">SG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((team) => (
                      <TableRow key={team.teamId} className="border-white/5 hover:bg-white/5 transition-colors h-14">
                        <TableCell className="text-center font-black text-slate-400">{team.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img src={team.logo} alt="" className="w-6 h-6 object-contain" />
                            <span className="font-bold text-white text-xs md:text-sm uppercase tracking-tight truncate max-w-[120px]">{team.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-primary text-base">{team.stats.points}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-300">{team.stats.played}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-green-500">{team.stats.wins}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-400">
                          {team.stats.goalsDiff > 0 ? `+${team.stats.goalsDiff}` : team.stats.goalsDiff}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <h2 className="text-xl font-black uppercase italic text-white px-2">Resultados Recentes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchesFinished.length === 0 ? (
                <EmptyState msg="Nenhum resultado registrado nas últimas 24h." />
              ) : (
                matchesFinished.map(m => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const isLive = match.status === 'LIVE';

  return (
    <Card className="bg-card border-white/5 hover:border-primary/30 transition-all group shadow-xl overflow-hidden rounded-3xl">
      <CardHeader className="p-4 bg-white/5 border-b border-white/5">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span className={cn("flex items-center gap-1.5", isLive ? "text-red-500" : "text-primary")}>
            {isLive ? <Radio size={10} className="animate-pulse" /> : <Clock size={10} />}
            {isLive ? match.clock : new Date(match.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Badge variant="outline" className="text-[8px] border-white/10 h-5 px-2 rounded-lg">
            {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center flex-1 text-center space-y-3 min-w-0">
            <div className="relative w-12 h-12 bg-white/5 rounded-xl p-2 border border-white/5 group-hover:scale-110 transition-transform">
              <img src={match.homeTeam.logo} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-[9px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center truncate w-full justify-center">{match.homeTeam.name}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl font-black italic tracking-tighter text-white tabular-nums flex gap-2">
              <span>{match.homeTeam.score}</span>
              <span className="text-primary/30">-</span>
              <span>{match.awayTeam.score}</span>
            </div>
            <Badge variant="secondary" className={cn("text-[7px] uppercase font-black py-0 h-4 px-2", isLive && "bg-red-600 text-white")}>
              {match.statusDetail}
            </Badge>
          </div>

          <div className="flex flex-col items-center flex-1 text-center space-y-3 min-w-0">
            <div className="relative w-12 h-12 bg-white/5 rounded-xl p-2 border border-white/5 group-hover:scale-110 transition-transform">
              <img src={match.awayTeam.logo} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-[9px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center truncate w-full justify-center">{match.awayTeam.name}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-slate-900/20">
      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
      <p className="text-muted-foreground font-black uppercase italic tracking-widest text-xs">{msg}</p>
    </div>
  );
}
