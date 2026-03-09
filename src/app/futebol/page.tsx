'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, AlertCircle, Info } from 'lucide-react';

export default function FutebolDashboardPage() {
  const { footballData } = useAppContext();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-3 shadow-lg">
            <img src="https://www.thesportsdb.com/images/media/league/badge/72v3vy1521458141.png" alt="Brasileirão" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Brasileirão Série A</h1>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">Ao Vivo</Badge>
              <span className="text-sm text-muted-foreground">Temporada 2024</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="hoje" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="hoje" className="text-xs md:text-sm font-bold">Jogos de Hoje</TabsTrigger>
            <TabsTrigger value="proximos" className="text-xs md:text-sm font-bold">Próximos Jogos</TabsTrigger>
            <TabsTrigger value="classificacao" className="text-xs md:text-sm font-bold">Classificação</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="space-y-4">
            {footballData.todayMatches.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p className="font-bold">Nenhum jogo do Brasileirão para hoje.</p>
                <p className="text-sm">Fique atento aos próximos confrontos.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {footballData.todayMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-4">
            {footballData.nextMatches.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50">
                <Info className="h-12 w-12 mx-auto mb-4" />
                <p className="font-bold">Agenda não sincronizada.</p>
                <p className="text-sm">Solicite ao administrador a sincronização dos dados.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {footballData.nextMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="classificacao">
            <Card className="border-0 shadow-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">Pos</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center">PTS</TableHead>
                    <TableHead className="text-center hidden md:table-cell">J</TableHead>
                    <TableHead className="text-center hidden md:table-cell">V</TableHead>
                    <TableHead className="text-center hidden md:table-cell">E</TableHead>
                    <TableHead className="text-center hidden md:table-cell">D</TableHead>
                    <TableHead className="text-center">SG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {footballData.standings.map((team) => (
                    <TableRow key={team.teamId} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-bold">
                        <span className={team.position <= 4 ? "text-blue-500" : team.position >= 17 ? "text-red-500" : ""}>
                          {team.position}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img src={team.teamBadge} alt={team.teamName} className="w-6 h-6 object-contain" />
                          <span className="font-semibold text-xs md:text-sm">{team.teamName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black">{team.points}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{team.played}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{team.wins}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{team.draws}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{team.losses}</TableCell>
                      <TableCell className="text-center font-medium">{team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {footballData.standings.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-muted-foreground italic">Classificação indisponível.</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  return (
    <Card className="hover:border-primary transition-all group overflow-hidden">
      <CardHeader className="p-4 bg-muted/20 border-b">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>{match.league}</span>
          <span className="text-primary">{match.time}</span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 flex items-center justify-center p-1">
              {/* Fallback para imagem não encontrada via ID do TheSportsDB */}
              <img src={`https://www.thesportsdb.com/images/media/team/badge/small/${match.idHomeTeam}.png`} alt="" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'https://placehold.co/100?text=Logo'} />
            </div>
            <span className="font-bold text-xs text-center leading-tight">{match.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-black italic tracking-tighter">
              {match.status === 'Match Finished' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
            </div>
            <Badge variant="outline" className="text-[8px]">{match.date.split('-').reverse().slice(0,2).join('/')}</Badge>
          </div>

          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 flex items-center justify-center p-1">
              <img src={`https://www.thesportsdb.com/images/media/team/badge/small/${match.idAwayTeam}.png`} alt="" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'https://placehold.co/100?text=Logo'} />
            </div>
            <span className="font-bold text-xs text-center leading-tight">{match.awayTeam}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
