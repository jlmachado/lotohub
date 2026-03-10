'use client';

import { useAppContext } from '@/context/AppContext';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Goal, Radio, TrendingUp, History, Trophy, Calendar } from 'lucide-react';
import { useMemo } from 'react';
import { BetSlip } from '@/components/betting/BetSlip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FootballDashboard() {
  const { footballData, addBetToSlip } = useAppContext();

  const stats = useMemo(() => ({
    live: footballData.liveMatches.length,
    today: footballData.matches.length,
    leagues: footballData.leagues.filter(l => l.active).length
  }), [footballData]);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* RESUMO TOP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Ao Vivo" value={stats.live} icon={Radio} color="text-red-500" />
          <StatCard label="Jogos Hoje" value={stats.today} icon={Calendar} color="text-primary" />
          <StatCard label="Ligas Ativas" value={stats.leagues} icon={Trophy} color="text-blue-400" />
          <StatCard label="Total Partidas" value={stats.live + stats.today} icon={Goal} color="text-green-400" />
        </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 h-12 p-1 rounded-xl border border-white/5">
            <TabsTrigger value="live" className="gap-2 uppercase text-[10px] font-black italic"><Radio size={14} /> Ao Vivo</TabsTrigger>
            <TabsTrigger value="today" className="gap-2 uppercase text-[10px] font-black italic"><Calendar size={14} /> Calendário</TabsTrigger>
            <TabsTrigger value="markets" className="gap-2 uppercase text-[10px] font-black italic"><TrendingUp size={14} /> Mercados</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            {footballData.liveMatches.length === 0 ? (
              <EmptyState msg="Nenhum jogo ocorrendo no momento." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {footballData.liveMatches.map(m => (
                  <LiveMatchCard key={m.id} match={m} onSelectOdd={(selection, odd) => {
                    addBetToSlip({
                      id: `${m.id}-1X2`,
                      matchId: m.id,
                      matchName: `${m.home_name} vs ${m.away_name}`,
                      market: 'Vencedor (1X2)',
                      selection,
                      odd
                    });
                  }} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {footballData.matches.map(m => (
                  <Card key={m.id} className="bg-slate-900 border-white/5 overflow-hidden">
                    <div className="p-3 bg-white/5 flex justify-between items-center">
                      <Badge variant="outline" className="text-[8px] h-4 uppercase border-white/10">{m.leagueName}</Badge>
                      <span className="text-[9px] font-mono text-slate-500">{new Date(m.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <img src={m.homeTeam.logo} className="w-8 h-8 mx-auto mb-1 object-contain" />
                          <p className="text-[10px] font-bold truncate">{m.homeTeam.name}</p>
                        </div>
                        <div className="px-4 text-xl font-black italic text-primary">VS</div>
                        <div className="text-center flex-1">
                          <img src={m.awayTeam.logo} className="w-8 h-8 mx-auto mb-1 object-contain" />
                          <p className="text-[10px] font-bold truncate">{m.awayTeam.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </main>

      <BetSlip />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <Icon className={cn("h-5 w-5 mb-2", color)} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white italic">{value}</p>
      </CardContent>
    </Card>
  );
}

function LiveMatchCard({ match, onSelectOdd }: { match: LiveScoreMatch, onSelectOdd: (sel: string, odd: number) => void }) {
  return (
    <Card className="bg-slate-900 border-white/5 overflow-hidden group hover:border-primary/20 transition-all">
      <div className="p-3 bg-red-600/10 border-b border-red-600/20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-red-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Ao Vivo • {match.time}'</span>
        </div>
        <Badge className="bg-slate-800 text-[8px] h-4 uppercase">{match.league_name}</Badge>
      </div>
      <CardContent className="p-4 space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="text-center flex-1">
            <p className="text-sm font-black uppercase italic tracking-tighter">{match.home_name}</p>
          </div>
          <div className="bg-black/40 px-4 py-1 rounded-lg text-2xl font-black italic tracking-widest text-primary border border-white/5">
            {match.score}
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-black uppercase italic tracking-tighter">{match.away_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <OddButton label="1" odd={1.95} onClick={() => onSelectOdd('Casa', 1.95)} />
          <OddButton label="X" odd={3.20} onClick={() => onSelectOdd('Empate', 3.20)} />
          <OddButton label="2" odd={3.45} onClick={() => onSelectOdd('Fora', 3.45)} />
        </div>
      </CardContent>
    </Card>
  );
}

function OddButton({ label, odd, onClick }: any) {
  return (
    <Button variant="outline" className="flex-col h-14 bg-black/20 border-white/5 hover:bg-primary hover:text-black transition-all" onClick={onClick}>
      <span className="text-[10px] font-black opacity-50">{label}</span>
      <span className="text-sm font-black italic">{odd.toFixed(2)}</span>
    </Button>
  );
}

function EmptyState({ msg }: any) {
  return (
    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-slate-900/20">
      <Radio className="h-12 w-12 mx-auto mb-4 text-slate-700" />
      <p className="text-slate-500 font-bold uppercase tracking-widest">{msg}</p>
    </div>
  );
}
