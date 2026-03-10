/**
 * @fileOverview Dashboard Pública de Futebol (Visual LiveScore API Style).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, AlertCircle, Calendar, History, Radio, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export default function FutebolDashboardPage() {
  const { footballData, syncFootballAll } = useAppContext();
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
    <div className="min-h-screen bg-slate-950">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* STATS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatMiniCard label="Ao Vivo" value={footballData.matches.filter(m => m.status === 'LIVE').length} color="text-red-500" />
          <StatMiniCard label="Hoje" value={matchesToday.length} color="text-primary" />
          <StatMiniCard label="Campeonatos" value={activeLeagues.length} color="text-blue-400" />
          <StatMiniCard label="Total Jogos" value={footballData.matches.length} color="text-slate-400" />
        </div>

        {/* LEAGUE SELECTOR BAR */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 border-b border-white/5">
          <button 
            onClick={() => setSelectedLeagueSlug(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
              !selectedLeagueSlug ? "bg-primary text-black border-primary" : "bg-slate-900 text-slate-400 border-white/5"
            )}
          >
            Todos
          </button>
          {activeLeagues.map(l => (
            <button 
              key={l.id} 
              onClick={() => setSelectedLeagueSlug(l.slug)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                selectedLeagueSlug === l.slug ? "bg-primary text-black border-primary" : "bg-slate-900 text-slate-400 border-white/5"
              )}
            >
              {l.name}
            </button>
          ))}
        </div>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-900 h-12 p-1 rounded-xl border border-white/5">
            <TabsTrigger value="matches" className="gap-2 uppercase text-[10px] font-bold"><Calendar size={12} /> Partidas</TabsTrigger>
            <TabsTrigger value="standings" className="gap-2 uppercase text-[10px] font-bold"><Trophy size={12} /> Tabela</TabsTrigger>
            <TabsTrigger value="results" className="gap-2 uppercase text-[10px] font-bold"><History size={12} /> Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {matchesToday.length === 0 ? (
                <EmptyState msg="Sem partidas agendadas para o momento." />
              ) : (
                matchesToday.map(m => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="standings">
            {standings.length === 0 ? (
              <EmptyState msg="Classificação indisponível para esta competição." />
            ) : (
              <Card className="border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden rounded-2xl">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5 h-10">
                      <TableHead className="w-[50px] text-center font-black uppercase text-[9px]">Pos</TableHead>
                      <TableHead className="font-black uppercase text-[9px]">Clube</TableHead>
                      <TableHead className="text-center font-black uppercase text-[9px]">P</TableHead>
                      <TableHead className="text-center font-black uppercase text-[9px]">J</TableHead>
                      <TableHead className="text-center font-black uppercase text-[9px]">V</TableHead>
                      <TableHead className="text-center font-black uppercase text-[9px]">SG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((team) => (
                      <TableRow key={team.teamId} className="border-white/5 hover:bg-white/5 transition-colors h-12">
                        <TableCell className="text-center font-bold text-slate-500 text-xs">{team.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                            <span className="font-bold text-white text-xs uppercase tracking-tight truncate">{team.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-primary">{team.stats.points}</TableCell>
                        <TableCell className="text-center text-xs text-slate-400">{team.stats.played}</TableCell>
                        <TableCell className="text-center text-xs text-green-500">{team.stats.wins}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-500">{team.stats.goalsDiff}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {matchesFinished.length === 0 ? (
                <EmptyState msg="Nenhum resultado recente registrado." />
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

function StatMiniCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex justify-between items-center shadow-lg">
      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
      <span className={cn("text-lg font-black italic", color)}>{value}</span>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const isLive = match.status === 'LIVE';

  return (
    <Card className="bg-slate-900 border-white/5 hover:border-primary/20 transition-all group overflow-hidden rounded-xl shadow-xl">
      <div className="p-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-white/10 bg-black/20">{match.leagueName}</Badge>
          {isLive && <Badge className="bg-red-600 text-white text-[8px] h-4 animate-pulse">AO VIVO</Badge>}
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(match.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          {/* TEAM A */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <img src={match.homeTeam.logo} alt="" className="w-10 h-10 object-contain mb-2" />
            <span className="font-black text-[10px] text-white uppercase tracking-tighter truncate w-full">{match.homeTeam.name}</span>
          </div>

          {/* SCORE / TIME */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-2xl font-black italic tracking-tighter text-white tabular-nums flex items-center gap-3">
              <span className={cn(match.homeTeam.winner && "text-primary")}>{match.homeTeam.score}</span>
              <span className="text-white/20">-</span>
              <span className={cn(match.awayTeam.winner && "text-primary")}>{match.awayTeam.score}</span>
            </div>
            {isLive ? (
              <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                <Radio size={10} /> {match.clock || 'LIVE'}
              </span>
            ) : (
              <span className="text-[8px] font-bold text-slate-500 uppercase">{match.statusDetail}</span>
            )}
          </div>

          {/* TEAM B */}
          <div className="flex flex-col items-center flex-1 text-center min-w-0">
            <img src={match.awayTeam.logo} alt="" className="w-10 h-10 object-contain mb-2" />
            <span className="font-black text-[10px] text-white uppercase tracking-tighter truncate w-full">{match.awayTeam.name}</span>
          </div>
        </div>
        
        {match.venue && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-1 text-[8px] font-bold text-slate-600 uppercase">
            <MapPin size={8} /> {match.venue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-slate-900/20">
      <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-700" />
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{msg}</p>
    </div>
  );
}
