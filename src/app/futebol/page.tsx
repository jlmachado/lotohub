/**
 * @fileOverview Dashboard de Futebol Profissional.
 * Integra dados da ESPN (Estrutura) e Live Score API (Tempo Real e Mercado).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Goal, Radio, Trophy, Calendar, Info, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FootballDashboard() {
  const { footballData, syncFootballAll, addBetToSlip, betSlip } = useAppContext();

  const stats = useMemo(() => {
    return {
      live: footballData.liveMatches.length,
      today: footballData.matches.filter(m => {
        const d = new Date(m.date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
      withOdds: footballData.liveMatches.filter(m => m.odds.home !== 1.95).length,
      leagues: footballData.leagues.filter(l => l.active).length
    };
  }, [footballData]);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Sport Hub</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Conectado a ESPN & LiveScore</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncFootballAll(true)}
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 bg-white/5 text-[10px] font-black uppercase italic h-10 px-4 rounded-xl"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
            Atualizar Live
          </Button>
        </div>

        {/* RESUMO TOP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Ao Vivo Agora" value={stats.live} icon={Radio} color="text-red-500" />
          <StatCard label="Jogos Hoje" value={stats.today} icon={Calendar} color="text-primary" />
          <StatCard label="Com Odds Reais" value={stats.withOdds} icon={Goal} color="text-green-400" />
          <StatCard label="Campeonatos" value={stats.leagues} icon={Trophy} color="text-blue-400" />
        </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 h-12 p-1 rounded-xl border border-white/5">
            <TabsTrigger value="live" className="gap-2 uppercase text-[10px] font-black italic">
              <Radio size={14} /> Partidas Ao Vivo
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 uppercase text-[10px] font-black italic">
              <Calendar size={14} /> Calendário
            </TabsTrigger>
            <TabsTrigger value="standings" className="gap-2 uppercase text-[10px] font-black italic">
              <Trophy size={14} /> Classificação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {footballData.liveMatches.length === 0 ? (
              <EmptyLiveState />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {footballData.liveMatches.map(m => (
                  <LiveMatchCard 
                    key={m.id} 
                    match={m} 
                    isSelected={(sel) => betSlip.some(b => b.matchId === m.id && b.selection === sel)}
                    onSelectOdd={(selection, odd) => {
                      addBetToSlip({
                        id: `${m.id}-${selection}`,
                        matchId: m.id,
                        matchName: `${m.homeTeam} vs ${m.awayTeam}`,
                        market: 'Vencedor 1X2',
                        selection,
                        pickLabel: selection,
                        odd
                      });
                    }} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {footballData.matches.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum jogo agendado nas ligas ativas.</p>
              </div>
            ) : (
              footballData.matches.slice(0, 30).map(m => (
                <Card key={m.id} className="bg-slate-900 border-white/5 overflow-hidden">
                  <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
                    <Badge variant="outline" className="text-[8px] h-4 uppercase border-white/10">{m.leagueName}</Badge>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(m.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <img src={m.homeTeam.logo} className="w-8 h-8 mx-auto mb-1 object-contain" alt="" />
                        <p className="text-[10px] font-bold truncate text-white uppercase">{m.homeTeam.name}</p>
                      </div>
                      <div className="px-4 text-xl font-black italic text-primary">VS</div>
                      <div className="text-center flex-1">
                        <img src={m.awayTeam.logo} className="w-8 h-8 mx-auto mb-1 object-contain" alt="" />
                        <p className="text-[10px] font-bold truncate text-white uppercase">{m.awayTeam.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="standings" className="space-y-8">
            {Object.entries(footballData.standings).length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-slate-900/20">
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Classificação indisponível para os campeonatos atuais.</p>
              </div>
            ) : (
              Object.entries(footballData.standings).map(([slug, table]) => (
                <Card key={slug} className="bg-slate-900 border-white/5 overflow-hidden">
                  <div className="p-4 bg-primary/10 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-black uppercase italic tracking-widest text-primary text-sm">
                      {footballData.leagues.find(l => l.slug === slug)?.name}
                    </h3>
                    <Badge className="bg-slate-800 text-[8px] h-4 uppercase border-0">TABELA OFICIAL</Badge>
                  </div>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-black/20 text-slate-500 uppercase font-black">
                        <tr>
                          <th className="p-3 w-8">#</th>
                          <th className="p-3">Clube</th>
                          <th className="p-3 text-center">P</th>
                          <th className="p-3 text-center">J</th>
                          <th className="p-3 text-center">V</th>
                          <th className="p-3 text-center">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {table.map((row) => (
                          <tr key={row.teamId} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-mono text-slate-500">{row.position}</td>
                            <td className="p-3 flex items-center gap-2">
                              <img src={row.logo} className="w-4 h-4 object-contain" alt="" />
                              <span className="font-bold text-white uppercase">{row.teamName}</span>
                            </td>
                            <td className="p-3 text-center font-black text-primary">{row.stats.points}</td>
                            <td className="p-3 text-center text-slate-400">{row.stats.played}</td>
                            <td className="p-3 text-center text-slate-400">{row.stats.wins}</td>
                            <td className="p-3 text-center text-slate-400">{row.stats.goalsDiff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
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

function LiveMatchCard({ match, onSelectOdd, isSelected }: { match: any, onSelectOdd: (sel: string, odd: number) => void, isSelected: (sel: string) => boolean }) {
  const isDemoOdds = match.odds.home === 1.95;

  return (
    <Card className="bg-slate-900 border-white/5 overflow-hidden group hover:border-primary/20 transition-all shadow-xl">
      <div className="p-3 bg-red-600/10 border-b border-red-600/20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-red-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">AO VIVO • {match.minute}'</span>
        </div>
        <Badge className="bg-slate-800 text-[8px] h-4 uppercase border-0">{match.competitionName}</Badge>
      </div>
      <CardContent className="p-4 space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="text-center flex-1 min-w-0">
            <p className="text-sm font-black uppercase italic tracking-tighter text-white truncate">{match.homeTeam}</p>
          </div>
          <div className="bg-black/40 px-4 py-1 rounded-lg text-2xl font-black italic tracking-widest text-primary border border-white/5 mx-4 min-w-[80px] text-center shadow-inner">
            {match.homeScore} - {match.awayScore}
          </div>
          <div className="text-center flex-1 min-w-0">
            <p className="text-sm font-black uppercase italic tracking-tighter text-white truncate">{match.awayTeam}</p>
          </div>
        </div>

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
        {isDemoOdds && (
          <p className="text-[8px] text-center text-slate-600 uppercase font-bold tracking-widest">
            <AlertTriangle className="inline h-2 w-2 mr-1" /> Mercado em modo demonstração
          </p>
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

function EmptyLiveState() {
  return (
    <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
      <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Radio className="h-8 w-8 text-slate-600" />
      </div>
      <h3 className="text-white font-black uppercase italic tracking-tight text-xl">Sem jogos ao vivo agora</h3>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 max-w-xs mx-auto">
        No momento não há partidas em andamento nos campeonatos monitorados. Confira o calendário para os próximos jogos.
      </p>
    </div>
  );
}
