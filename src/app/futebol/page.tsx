/**
 * @fileOverview Hub de Futebol (Inspirado na organização visual da TheSportsDB).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Flag, AlertCircle, Calendar, History, List } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export default function FutebolDashboardPage() {
  const { footballData } = useAppContext();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const activeLeagues = useMemo(() => 
    footballData.leagues.filter(l => l.importar), 
  [footballData.leagues]);

  const activeLeague = useMemo(() => {
    if (selectedLeagueId) return activeLeagues.find(l => l.id === selectedLeagueId);
    return activeLeagues[0];
  }, [activeLeagues, selectedLeagueId]);

  const matchesToday = useMemo(() => 
    footballData.todayMatches.filter(m => !activeLeague || m.idLeague === activeLeague.id), 
  [footballData.todayMatches, activeLeague]);

  const matchesNext = useMemo(() => 
    footballData.nextMatches.filter(m => !activeLeague || m.idLeague === activeLeague.id), 
  [footballData.nextMatches, activeLeague]);

  const matchesPast = useMemo(() => 
    footballData.pastMatches.filter(m => !activeLeague || m.idLeague === activeLeague.id), 
  [footballData.pastMatches, activeLeague]);

  const standings = useMemo(() => 
    footballData.standings.filter(s => activeLeague && s.leagueId === activeLeague.id), 
  [footballData.standings, activeLeague]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* LEAGUE SELECTOR / HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-3xl p-4 border border-white/10 flex items-center justify-center">
              {activeLeague?.badge ? (
                <img src={activeLeague.badge} alt="" className="w-full h-full object-contain" />
              ) : (
                <Flag size={40} className="text-muted-foreground opacity-20" />
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
                {activeLeague?.name || "Hub de Futebol"}
              </h1>
              <p className="text-primary font-black uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
                <Globe size={12} /> {activeLeague?.country || "BRASIL"} • TEMPORADA {new Date().getFullYear()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeLeagues.slice(0, 6).map(l => (
              <button 
                key={l.id} 
                onClick={() => setSelectedLeagueId(l.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  selectedLeagueId === l.id || (!selectedLeagueId && activeLeagues[0]?.id === l.id)
                    ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                    : "bg-slate-950 text-muted-foreground border-white/5 hover:border-primary/30"
                )}
              >
                {l.name.replace('Brazilian ', '')}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-900 h-14 p-1.5 rounded-2xl border border-white/5">
            <TabsTrigger value="today" className="gap-2 font-black uppercase text-[10px]"><Calendar size={14} /> Hoje</TabsTrigger>
            <TabsTrigger value="standings" className="gap-2 font-black uppercase text-[10px]"><Trophy size={14} /> Classificação</TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2 font-black uppercase text-[10px]"><List size={14} /> Próximos</TabsTrigger>
            <TabsTrigger value="results" className="gap-2 font-black uppercase text-[10px]"><History size={14} /> Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <h2 className="text-xl font-black uppercase italic text-white px-2">Partidas do Dia</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchesToday.length === 0 ? (
                <EmptyState msg="Nenhuma partida programada para hoje." />
              ) : (
                matchesToday.map(m => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="standings">
            {standings.length === 0 ? (
              <EmptyState msg="Classificação indisponível para esta liga no momento." />
            ) : (
              <Card className="border-0 bg-slate-900/50 shadow-2xl overflow-hidden rounded-3xl">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5 h-12">
                      <TableHead className="w-[60px] text-center font-black uppercase text-[10px]">Pos</TableHead>
                      <TableHead className="font-black uppercase text-[10px]">Clube</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Pts</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">J</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] text-green-500">V</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">SG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.sort((a,b) => a.position - b.position).map((team) => (
                      <TableRow key={team.teamId} className="border-white/5 hover:bg-white/5 transition-colors h-14">
                        <TableCell className="text-center font-black text-slate-400">{team.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/5 rounded-lg p-1.5 flex items-center justify-center border border-white/5">
                              {team.teamBadge ? (
                                <img src={team.teamBadge} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Trophy size={14} className="text-muted-foreground opacity-20" />
                              )}
                            </div>
                            <span className="font-bold text-white text-xs md:text-sm uppercase tracking-tight">{team.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-primary text-base">{team.points}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-300">{team.played}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-green-500">{team.wins}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-400">
                          {team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <h2 className="text-xl font-black uppercase italic text-white px-2">Agenda de Jogos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchesNext.length === 0 ? (
                <EmptyState msg="Sem novos jogos agendados." />
              ) : (
                matchesNext.map(m => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <h2 className="text-xl font-black uppercase italic text-white px-2">Resultados Recentes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchesPast.length === 0 ? (
                <EmptyState msg="Nenhum resultado registrado recentemente." />
              ) : (
                matchesPast.map(m => <MatchCard key={m.id} match={m} isPast />)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MatchCard({ match, isPast = false }: { match: any, isPast?: boolean }) {
  const homeBadge = `https://www.thesportsdb.com/images/media/team/badge/small/${match.idHomeTeam}.png`;
  const awayBadge = `https://www.thesportsdb.com/images/media/team/badge/small/${match.idAwayTeam}.png`;

  return (
    <Card className="bg-card border-white/5 hover:border-primary/30 transition-all group shadow-xl overflow-hidden rounded-3xl">
      <CardHeader className="p-4 bg-white/5 border-b border-white/5">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span className="text-primary flex items-center gap-1.5">
            <Clock size={10} /> {match.time?.substring(0, 5) || '--:--'}
          </span>
          <Badge variant="outline" className="text-[8px] border-white/10 h-5 px-2 rounded-lg">{match.date.split('-').reverse().slice(0,2).join('/')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center flex-1 text-center space-y-3">
            <div className="relative w-14 h-14 bg-white/5 rounded-2xl p-2 border border-white/5 group-hover:scale-110 transition-transform">
              <img src={homeBadge} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-[10px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center">{match.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl font-black italic tracking-tighter text-white tabular-nums">
              {isPast || match.status === 'Match Finished' ? `${match.homeScore}-${match.awayScore}` : 'VS'}
            </div>
            <Badge variant="secondary" className="text-[7px] uppercase font-black py-0 h-4 px-2">
              {match.status === 'Match Finished' ? 'FINAL' : 'AGENDADO'}
            </Badge>
          </div>

          <div className="flex flex-col items-center flex-1 text-center space-y-3">
            <div className="relative w-14 h-14 bg-white/5 rounded-2xl p-2 border border-white/5 group-hover:scale-110 transition-transform">
              <img src={awayBadge} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-[10px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center">{match.awayTeam}</span>
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

function Globe({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
