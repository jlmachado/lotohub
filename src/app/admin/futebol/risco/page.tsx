/**
 * @fileOverview Painel de Exposição e Risco da Banca (Futebol).
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, ShieldAlert, ReceiptText, Users, DollarSign, Goal } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';

export default function AdminFootballRiskPage() {
  const { footballBets } = useAppContext();

  const stats = useMemo(() => {
    const activeBets = footballBets.filter(b => b.status === 'OPEN');
    const totalStaked = activeBets.reduce((acc, b) => acc + b.stake, 0);
    const totalLiability = activeBets.reduce((acc, b) => acc + b.potentialWin, 0);
    
    // Agrupar exposição por partida
    const exposurePerMatch: Record<string, { name: string, staked: number, liability: number }> = {};
    activeBets.forEach(bet => {
      bet.items.forEach(item => {
        if (!exposurePerMatch[item.matchId]) {
          exposurePerMatch[item.matchId] = { name: item.matchName, staked: 0, liability: 0 };
        }
        // Simplificação: Atribui stake e liability proporcional ao evento
        exposurePerMatch[item.matchId].staked += bet.stake;
        exposurePerMatch[item.matchId].liability += bet.potentialWin;
      });
    });

    return {
      totalStaked,
      totalLiability,
      activeBetsCount: activeBets.length,
      matchExposures: Object.values(exposurePerMatch).sort((a, b) => b.liability - a.liability)
    };
  }, [footballBets]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Dashboard de Risco</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Monitoramento de exposição financeira em tempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total em Jogo" value={formatBRL(stats.totalStaked)} icon={ReceiptText} color="text-primary" />
        <KpiCard title="Responsabilidade" value={formatBRL(stats.totalLiability)} icon={ShieldAlert} color="text-red-500" />
        <KpiCard title="Lucro Bruto (Potencial)" value={formatBRL(stats.totalStaked - (stats.totalLiability * 0.3))} icon={TrendingUp} color="text-green-500" description="Estimativa baseada em margem 30%" />
        <KpiCard title="Bilhetes Abertos" value={stats.activeBetsCount} icon={Users} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-white/5 bg-slate-900/50 overflow-hidden shadow-2xl">
          <CardHeader className="bg-slate-950/50 border-b border-white/5">
            <CardTitle className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
              <Goal size={14} className="text-primary" /> Exposição por Evento
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-950/20">
              <TableRow className="border-white/5">
                <TableHead className="text-[10px] uppercase font-black">Confronto</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Volume</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Responsabilidade</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-center w-[120px]">Risco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.matchExposures.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">Nenhum evento com apostas abertas.</TableCell></TableRow>
              ) : (
                stats.matchExposures.map((m, idx) => {
                  const riskLevel = Math.min(100, (m.liability / 10000) * 100);
                  return (
                    <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="py-4">
                        <p className="text-[11px] font-black text-white uppercase italic truncate max-w-[200px]">{m.name}</p>
                      </TableCell>
                      <TableCell className="text-right font-bold text-white text-[11px]">{formatBRL(m.staked)}</TableCell>
                      <TableCell className="text-right font-black text-red-500 text-[11px]">{formatBRL(m.liability)}</TableCell>
                      <TableCell className="text-center px-4">
                        <Progress value={riskLevel} className="h-1.5 bg-white/5" indicatorClassName={cn(riskLevel > 70 ? "bg-red-600" : "bg-primary")} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase text-white italic">Alerta de Exposição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-red-600/10 border border-red-600/20">
                <p className="text-[10px] font-black text-red-500 uppercase mb-1">Limite Crítico</p>
                <p className="text-sm font-black text-white italic">R$ 50.000,00</p>
                <Progress value={Math.min(100, (stats.totalLiability / 50000) * 100)} className="h-2 mt-3 bg-white/5" indicatorClassName="bg-red-600" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase">
                O painel monitora a responsabilidade máxima caso todos os favoritos dos bilhetes confirmados vençam simultaneamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ title, value, icon: Icon, color, description }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-inner">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5", color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
          <p className="text-xl font-black text-white italic tabular-nums">{value}</p>
          {description && <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
