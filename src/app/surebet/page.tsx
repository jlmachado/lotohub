'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Calculator, 
  ArrowRightLeft, 
  Search, 
  Zap, 
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';
import { ArbitrageEngine } from '@/utils/arbitrage-engine';
import { cn } from '@/lib/utils';

export default function SurebetPage() {
  const { footballData, user } = useAppContext();
  const [totalStake, setTotalStake] = useState('100');
  const [searchTerm, setSearchTerm] = useState('');

  // Simulando as oportunidades (em produção viria do Firestore monitorado)
  const opportunities = useMemo(() => {
    const matches = footballData.unifiedMatches.filter(m => m.hasOdds).slice(0, 10);
    return matches.map((m, idx) => {
      const roi = 2.5 + (idx % 5);
      return {
        id: `opp-${m.id}`,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        selection: 'Vencedor Casa',
        oddsA: m.odds.home,
        oddsB: m.odds.home * (1 + (roi/100) + 0.05), // Garante ROI positivo
        bookmakerA: 'LotoHub',
        bookmakerB: 'Bet365 (External)',
        roi
      };
    });
  }, [footballData.unifiedMatches]);

  const filtered = opportunities.filter(o => 
    o.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.awayTeam.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] pb-20">
      <Header />
      
      <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Surebet Scanner</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px]">Arbitragem Garantida</Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Lucro matemático independente do resultado</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar partida..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-900 border-white/10 pl-9 h-11 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl px-3 gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase">Investimento:</span>
              <Input 
                type="number"
                value={totalStake}
                onChange={e => setTotalStake(e.target.value)}
                className="w-20 bg-transparent border-0 h-8 font-black text-primary p-0 text-right"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filtered.length === 0 ? (
            <Card className="col-span-full bg-slate-900/50 border-white/5 p-20 text-center border-dashed">
              <Zap className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Escaneando o mercado em busca de frestas...</p>
            </Card>
          ) : (
            filtered.map((opp) => {
              const stake = parseFloat(totalStake) || 0;
              const calculation = ArbitrageEngine.calculate(opp.oddsA, opp.oddsB, stake);
              
              return (
                <Card key={opp.id} className="bg-slate-900 border-white/5 overflow-hidden hover:border-primary/30 transition-all shadow-2xl">
                  <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/5">
                    <span className="text-[10px] font-black text-slate-400 uppercase italic">{opp.league}</span>
                    <Badge className="bg-green-600 text-white font-black italic text-[10px] h-5 animate-pulse">ROI: {opp.roi}%</Badge>
                  </div>
                  
                  <CardContent className="p-5 space-y-6">
                    <div className="flex justify-between items-center text-center">
                      <div className="flex-1">
                        <p className="text-sm font-black text-white uppercase italic">{opp.homeTeam}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Mandante</p>
                      </div>
                      <div className="px-4 opacity-20"><ArrowRightLeft size={20} /></div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-white uppercase italic">{opp.awayTeam}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Visitante</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-primary uppercase">{opp.bookmakerA}</span>
                          <span className="text-xs font-black text-white">@{opp.oddsA.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">Stake: <span className="text-white">{formatBRL(calculation?.stakeA || 0)}</span></p>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-400 uppercase">{opp.bookmakerB}</span>
                          <span className="text-xs font-black text-white">@{opp.oddsB.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">Stake: <span className="text-white">{formatBRL(calculation?.stakeB || 0)}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-green-500" />
                        <span className="text-xs font-black text-white uppercase italic">Lucro Líquido:</span>
                      </div>
                      <span className="text-2xl font-black text-green-500 italic tracking-tighter">
                        {formatBRL(calculation?.profit || 0)}
                      </span>
                    </div>

                    <Button className="w-full h-12 rounded-xl font-black uppercase italic lux-shine bg-primary text-black group">
                      <Zap size={16} className="mr-2 group-hover:scale-125 transition-transform" />
                      Executar Arbitragem
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="p-6 bg-slate-900/80 border border-white/5 rounded-3xl flex gap-4">
          <Info className="h-6 w-6 text-primary shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white italic">Como funciona?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium uppercase tracking-wide">
              A Surebet ocorre quando as odds de diferentes casas estão tão discrepantes que, ao apostar em todos os resultados possíveis de forma proporcional, o lucro é garantido matematicamente. O scanner monitora essas janelas que duram poucos minutos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
