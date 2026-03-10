'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { ReceiptText, TrendingUp, Award, Clock } from 'lucide-react';

export default function AdminFootballBetsPage() {
  const { footballBets } = useAppContext();

  const stats = useMemo(() => {
    const total = footballBets.reduce((acc, b) => acc + b.stake, 0);
    const open = footballBets.filter(b => b.status === 'OPEN').length;
    const wins = footballBets.filter(b => b.status === 'WON').reduce((acc, b) => acc + b.potentialWin, 0);
    
    return {
      totalStaked: total,
      openBets: open,
      bankProfit: total - wins,
      totalBets: footballBets.length
    };
  }, [footballBets]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestão de Apostas Futebol</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Monitoramento global de bilhetes e mercados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Apostado" value={formatBRL(stats.totalStaked)} icon={ReceiptText} color="text-primary" />
        <KpiCard title="Lucro Banca" value={formatBRL(stats.bankProfit)} icon={TrendingUp} color="text-green-500" />
        <KpiCard title="Bilhetes Abertos" value={stats.openBets} icon={Clock} color="text-blue-400" />
        <KpiCard title="Total Bilhetes" value={stats.totalBets} icon={Award} color="text-purple-400" />
      </div>

      <Card className="border-white/5 overflow-hidden">
        <CardHeader className="bg-slate-950/50 border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Livro de Apostas</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-slate-950/20">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] uppercase font-black px-4">Data</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Terminal/Usuário</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Partidas</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Stake</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-right">Retorno</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {footballBets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Nenhuma aposta registrada.</TableCell>
              </TableRow>
            ) : (
              footballBets.map((bet) => (
                <TableRow key={bet.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="px-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">{new Date(bet.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(bet.createdAt).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white font-mono">{bet.terminal}</span>
                      <span className="text-[9px] text-primary uppercase font-black">{bet.bancaId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {bet.items.map((item, idx) => (
                        <div key={idx} className="text-[10px] font-bold text-slate-300">
                          {item.matchName} <span className="text-primary italic">@{item.odd.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-white">{formatBRL(bet.stake)}</TableCell>
                  <TableCell className="text-right font-black text-green-500">{formatBRL(bet.potentialWin)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={bet.status === 'OPEN' ? 'outline' : bet.status === 'WON' ? 'default' : 'destructive'} className="text-[8px] uppercase">
                      {bet.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2 rounded-lg bg-white/5", color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground">{title}</p>
          <p className="text-xl font-black text-white italic">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
