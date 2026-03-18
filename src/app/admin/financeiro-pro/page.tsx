
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Users, 
  History, 
  Download,
  BarChart3,
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';
import { cn } from '@/lib/utils';

export default function AdvancedFinanceDashboard() {
  const { ledger, user, banners } = useAppContext();
  const [activeTab, setActiveKpi] = useState('total');

  // Cálculo de KPIs usando o Ledger existente (Plugado nos dados atuais)
  const stats = useMemo(() => {
    const bets = ledger.filter(e => e.type === 'BET_PLACED');
    const wins = ledger.filter(e => e.type === 'BET_WIN');
    const commissions = ledger.filter(e => e.type === 'COMMISSION_EARNED');

    const totalApostado = bets.reduce((acc, e) => acc + Math.abs(e.amount), 0);
    const totalPremios = wins.reduce((acc, e) => acc + e.amount, 0);
    const totalComissoes = commissions.reduce((acc, e) => acc + e.amount, 0);
    const lucroLiquido = totalApostado - totalPremios - totalComissoes;

    return { totalApostado, totalPremios, totalComissoes, lucroLiquido, count: bets.length };
  }, [ledger]);

  return (
    <main className="p-4 md:p-8 space-y-8 bg-slate-950 min-h-screen text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Dashboard Financeiro Pro</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Módulo Avançado de Gestão SaaS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 bg-white/5 font-bold uppercase text-[10px]">
            <Download className="mr-2 h-3 w-3" /> Exportar Relatório
          </Button>
          <Badge className="bg-primary text-black font-black uppercase italic h-10 px-4 shadow-lg shadow-primary/20">
            Status: Saudável
          </Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume Total" value={stats.totalApostado} icon={BarChart3} color="text-blue-400" />
        <KpiCard title="Prêmios Pagos" value={stats.totalPremios} icon={TrendingDown} color="text-red-400" />
        <KpiCard title="Comissões" value={stats.totalComissoes} icon={Coins} color="text-amber-400" />
        <KpiCard title="Lucro da Unidade" value={stats.lucroLiquido} icon={TrendingUp} color="text-green-500" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico / Histórico de Transações */}
        <Card className="lg:col-span-2 border-white/5 bg-slate-900/50 shadow-2xl">
          <CardHeader className="border-b border-white/5 p-6 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase italic tracking-widest">Fluxo de Caixa Recente</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] border-white/10">{ledger.length} Movimentações</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-white/5">
                  <TableHead className="text-[10px] uppercase font-black px-6">Data/Hora</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Tipo</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Operador</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right px-6">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.slice(0, 10).map((entry) => (
                  <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-6 py-4">
                      <span className="text-[11px] font-bold block">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(entry.createdAt).toLocaleTimeString('pt-BR')}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-4 uppercase font-black",
                        entry.amount > 0 ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-red-500/20 text-red-500 bg-red-500/5"
                      )}>
                        {entry.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-slate-300">Terminal {entry.terminal}</TableCell>
                    <TableCell className={cn("text-right font-black px-6 text-sm", entry.amount > 0 ? "text-green-500" : "text-red-500")}>
                      {entry.amount > 0 ? '+' : ''}{formatBRL(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sidebar de Perfil Financeiro */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                <Wallet size={14} /> Ativos em Custódia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Saldo Total Jogadores</p>
                <p className="text-2xl font-black text-white italic">{formatBRL(stats.totalApostado * 0.15)}</p> {/* Simulação */}
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Total Comissões Pendentes</p>
                <p className="text-2xl font-black text-amber-500 italic">{formatBRL(stats.totalComissoes * 0.2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase text-white">Configurações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-between text-[10px] font-bold uppercase hover:bg-white/5 border border-white/5 h-10">
                Ajustar Taxas de Comissão <ArrowUpRight size={14} />
              </Button>
              <Button variant="ghost" className="w-full justify-between text-[10px] font-bold uppercase hover:bg-white/5 border border-white/5 h-10">
                Limites de Depósito PIX <ArrowUpRight size={14} />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ title, value, icon: Icon, color, highlight }: any) {
  return (
    <Card className={cn(
      "border-white/5 shadow-inner transition-transform hover:scale-[1.02]",
      highlight ? "bg-green-600/10 ring-1 ring-green-500/20" : "bg-slate-900"
    )}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl">
          <Icon className={cn("h-6 w-6", color)} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
          <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{formatBRL(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
