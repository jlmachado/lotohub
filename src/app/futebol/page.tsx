/**
 * @fileOverview Dashboard Hub de Futebol - EXCLUSIVO TheSportsDB.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Flag, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';

export default function FutebolDashboardPage() {
  const { footballData } = useAppContext();

  const groupByLeague = (matches: any[]) => {
    if (!matches) return {};
    return matches.reduce((acc: any, match) => {
      if (!acc[match.league]) acc[match.league] = [];
      acc[match.league].push(match);
      return acc;
    }, {});
  };

  const todayGrouped = useMemo(() => groupByLeague(footballData.todayMatches), [footballData.todayMatches]);
  const nextGrouped = useMemo(() => groupByLeague(footballData.nextMatches), [footballData.nextMatches]);
  const pastGrouped = useMemo(() => groupByLeague(footballData.pastMatches), [footballData.pastMatches]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Hub Futebol</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Dados oficiais sincronizados da TheSportsDB</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="h-8 border-white/10 text-[10px] uppercase font-black bg-slate-900/50">
              Atualizado: {footballData.lastSuccessfulSync ? new Date(footballData.lastSuccessfulSync).toLocaleTimeString('pt-BR') : 'Pendente'}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="hoje" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-900 h-12 p-1">
            <TabsTrigger value="hoje" className="text-[10px] font-black uppercase">Hoje</TabsTrigger>
            <TabsTrigger value="proximos" className="text-[10px] font-black uppercase">Próximos</TabsTrigger>
            <TabsTrigger value="recentes" className="text-[10px] font-black uppercase">Resultados</TabsTrigger>
            <TabsTrigger value="classificacao" className="text-[10px] font-black uppercase">Tabelas</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje">
            <GroupedMatchList groups={todayGrouped} emptyMsg="Nenhum jogo para hoje." />
          </TabsContent>

          <TabsContent value="proximos">
            <GroupedMatchList groups={nextGrouped} emptyMsg="Sem agenda para os próximos dias." />
          </TabsContent>

          <TabsContent value="recentes">
            <GroupedMatchList groups={pastGrouped} emptyMsg="Nenhum resultado recente." isPast />
          </TabsContent>

          <TabsContent value="classificacao">
            <div className="space-y-12">
              {(!footballData.standings || footballData.standings.length === 0) ? (
                <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground italic font-medium">Nenhuma classificação disponível.</p>
                </div>
              ) : (
                Object.entries(
                  footballData.standings.reduce((acc: any, s) => {
                    const leagueName = footballData.leagues.find(l => l.id === s.leagueId)?.name || 'Campeonato';
                    if (!acc[leagueName]) acc[leagueName] = [];
                    acc[leagueName].push(s);
                    return acc;
                  }, {})
                ).map(([leagueName, teams]: [string, any]) => (
                  <div key={leagueName} className="space-y-4">
                    <h3 className="text-xl font-black uppercase italic text-primary flex items-center gap-2">
                      <Flag size={20} /> {leagueName}
                    </h3>
                    <Card className="border-0 bg-slate-900/50 shadow-2xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-950">
                          <TableRow className="border-white/5">
                            <TableHead className="w-[50px] text-center font-black uppercase text-[10px]">Pos</TableHead>
                            <TableHead className="font-black uppercase text-[10px]">Time</TableHead>
                            <TableHead className="text-center font-black uppercase text-[10px]">PTS</TableHead>
                            <TableHead className="text-center font-black uppercase text-[10px]">J</TableHead>
                            <TableHead className="text-center font-black uppercase text-[10px] text-green-500">V</TableHead>
                            <TableHead className="text-center font-black uppercase text-[10px]">SG</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teams.sort((a:any, b:any) => a.position - b.position).map((team: any) => (
                            <TableRow key={team.teamId} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="text-center font-bold text-slate-400">{team.position}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-6 h-6 bg-white/10 rounded-full p-1">
                                    {team.teamBadge ? (
                                      <img src={team.teamBadge} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                      <Trophy size={12} className="text-muted-foreground m-auto" />
                                    )}
                                  </div>
                                  <span className="font-bold text-white text-xs md:text-sm">{team.teamName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-black text-primary">{team.points}</TableCell>
                              <TableCell className="text-center text-xs">{team.played}</TableCell>
                              <TableCell className="text-center text-xs text-green-500">{team.wins}</TableCell>
                              <TableCell className="text-center font-medium text-xs">{team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function GroupedMatchList({ groups, emptyMsg, isPast = false }: { groups: any, emptyMsg: string, isPast?: boolean }) {
  const leagueNames = Object.keys(groups);

  if (leagueNames.length === 0) {
    return (
      <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-3xl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground font-bold">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {leagueNames.map(league => (
        <div key={league} className="space-y-4">
          <h3 className="text-xl font-black uppercase italic text-primary flex items-center gap-2 px-2">
            <Flag size={20} /> {league}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups[league].map((match: any) => (
              <MatchCard key={match.id} match={match} isPast={isPast} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match, isPast }: { match: any, isPast: boolean }) {
  const homeBadge = `https://www.thesportsdb.com/images/media/team/badge/small/${match.idHomeTeam}.png`;
  const awayBadge = `https://www.thesportsdb.com/images/media/team/badge/small/${match.idAwayTeam}.png`;

  return (
    <Card className="bg-card border-white/5 hover:border-primary/30 transition-all group shadow-xl overflow-hidden">
      <CardHeader className="p-3 bg-white/5 border-b border-white/5">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span className="text-primary flex items-center gap-1">
            <Clock size={10} /> {match.time?.substring(0, 5) || '--:--'}
          </span>
          <Badge variant="outline" className="text-[8px] border-white/10">{match.date.split('-').reverse().slice(0,2).join('/')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center flex-1 text-center space-y-2">
            <div className="relative w-12 h-12 bg-white/5 rounded-full p-2">
              <img src={homeBadge} alt="" className="w-full h-full object-contain p-1" />
            </div>
            <span className="font-bold text-[11px] leading-tight text-white uppercase">{match.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-black italic tracking-tighter text-white">
              {isPast || match.status === 'Match Finished' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
            </div>
            <Badge variant="secondary" className="text-[7px] uppercase font-black py-0 h-3">
              {match.status === 'Match Finished' ? 'Finalizado' : 'Agendado'}
            </Badge>
          </div>

          <div className="flex flex-col items-center flex-1 text-center space-y-2">
            <div className="relative w-12 h-12 bg-white/5 rounded-full p-2">
              <img src={awayBadge} alt="" className="w-full h-full object-contain p-1" />
            </div>
            <span className="font-bold text-[11px] leading-tight text-white uppercase">{match.awayTeam}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
