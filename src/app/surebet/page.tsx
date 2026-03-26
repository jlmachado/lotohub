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
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';
import { ArbitrageEngine } from '@/utils/arbitrage-engine';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Página de Arbitragem (Surebet) para o usuário final.
 * Consome oportunidades detectadas pelo scanner automático e permite simulação de investimento.
 */
export default function SurebetPage() {
  const { surebets, isLoading, user } = useAppContext();
  const [totalStake, setTotalStake] = useState('1000');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem e ordenação por ROI
  const filteredOpportunities = useMemo(() => {
    return (surebets || [])
      .filter(o => 
        o.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.league.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.roi - a.roi);
  }, [surebets, searchTerm]);

  return (
    <div className="min-h-screen bg-[#020617] pb-32">
      <Header />
      
      <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Surebet Scanner</h1>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary text-black font-black uppercase italic text-[10px] h-5 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                Lucro Matemático Garantido
              </Badge>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                Scanner Global de Arbitragem v2.0
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar partida ou liga..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-900 border-white/10 pl-9 h-12 rounded-xl text-xs uppercase font-bold w-full sm:w-64"
              />
            </div>
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl px-4 gap-3 h-12 shadow-inner">
              <span className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">Simular Investimento:</span>
              <div className="flex items-center gap-1">
                <span className="text-primary font-bold">R$</span>
                <Input 
                  type="number"
                  value={totalStake}
                  onChange={e => setTotalStake(e.target.value)}
                  className="w-24 bg-transparent border-0 h-8 font-black text-white p-0 text-right text-lg focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Oportunidades */}
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <div className="col-span-full py-24 text-center">
              <Zap className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Conectando ao scanner de odds...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <Card className="col-span-full bg-slate-900/50 border-white/5 p-20 text-center border-dashed rounded-[32px]">
              <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={40} className="text-slate-700" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Nenhuma brecha no momento</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs max-w-sm mx-auto">
                O mercado está estável. Nosso bot continua escaneando 24/7 em busca de arbitragens.
              </p>
            </Card>
          ) : (
            filteredOpportunities.map((opp) => {
              const stake = parseFloat(totalStake) || 0;
              const calculation = ArbitrageEngine.calculate(opp.oddsA, opp.oddsB, stake);
              
              return (
                <Card key={opp.id} className="bg-slate-900 border-white/5 overflow-hidden hover:border-primary/30 transition-all shadow-2xl rounded-[24px] group">
                  {/* Card Header com ROI */}
                  <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase italic">
                        {opp.league} • {new Date(opp.startTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <Badge className="bg-green-600 text-white font-black italic text-[11px] h-6 px-3 animate-pulse shadow-lg shadow-green-600/20">
                      ROI: {opp.roi.toFixed(2)}%
                    </Badge>
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Times */}
                    <div className="flex justify-between items-center text-center gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-white uppercase italic leading-tight">{opp.homeTeam}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Mandante</p>
                      </div>
                      <div className="px-4 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                        <ArrowRightLeft size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-white uppercase italic leading-tight">{opp.awayTeam}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Visitante</p>
                      </div>
                    </div>

                    {/* Detalhes das Casas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">{opp.bookmakerA}</span>
                          <span className="text-sm font-black text-white tabular-nums">@{opp.oddsA.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Aposta Sugerida</p>
                          <p className="text-lg font-black text-white italic">{formatBRL(calculation?.stakeA || 0)}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{opp.bookmakerB}</span>
                          <span className="text-sm font-black text-white tabular-nums">@{opp.oddsB.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Aposta Sugerida</p>
                          <p className="text-lg font-black text-white italic">{formatBRL(calculation?.stakeB || 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Resultado Garantido */}
                    <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-2xl shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                          <TrendingUp size={20} className="text-green-500" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Lucro Líquido Garantido</span>
                          <span className="text-2xl font-black text-green-500 italic tracking-tighter tabular-nums">
                            {formatBRL(calculation?.profit || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Retorno Total</span>
                         <span className="text-sm font-bold text-white tabular-nums">{formatBRL((calculation?.profit || 0) + stake)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-14 rounded-xl font-black uppercase italic text-base lux-shine bg-primary text-black group shadow-xl active:scale-95 transition-all"
                      onClick={() => {
                        if (!user) {
                          window.location.href = '/login';
                          return;
                        }
                        alert(`🔥 OPERAÇÃO DE ARBITRAGEM\n\n1. Aposte ${formatBRL(calculation?.stakeA || 0)} na ${opp.bookmakerA}\n2. Aposte ${formatBRL(calculation?.stakeB || 0)} na ${opp.bookmakerB}\n\n✅ Lucro garantido de ${formatBRL(calculation?.profit || 0)} independente do vencedor!`);
                      }}
                    >
                      <Zap size={18} className="mr-2 group-hover:scale-125 transition-transform fill-black" />
                      Executar Aposta Rápida
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Informativo */}
        <div className="p-8 bg-slate-900/80 border border-white/10 rounded-[32px] flex flex-col md:flex-row gap-6 shadow-2xl">
          <div className="p-4 bg-primary/10 rounded-2xl h-fit">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            <h4 className="text-xl font-black uppercase text-white italic tracking-tight">O que é a Arbitragem Esportiva?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              A **Surebet** ocorre quando as cotações de diferentes casas de apostas estão em desequilíbrio matemático. 
              Ao dividir seu investimento de forma proporcional entre os resultados possíveis, você garante um retorno 
              superior ao valor total investido, eliminando o risco da aposta.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-widest">
                <ShieldCheck size={14} /> 100% Matemático
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                <Calculator size={14} /> Cálculo de Stake Automático
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
