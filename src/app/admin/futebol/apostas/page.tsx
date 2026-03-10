/**
 * @fileOverview Painel de Auditoria de Apostas de Futebol.
 */

'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { ReceiptText, TrendingUp, Award, Clock, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminFootballBetsPage() {
  const { footballBets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const total = footballBets.reduce((acc, b) => acc + b.stake, 0);
    const wins = footballBets.filter(b => b.status === 'WON').reduce((acc, b) => acc + b.potentialWin, 0);
    
    return {
      totalStaked: total,
      bankProfit: total - wins,
      openBets: footballBets.filter(b => b.status === 'OPEN').length,
      totalBets: footballBets.length
    };
  }, [footballBets]);

  const filtered = useMemo(() => {
    return footballBets.filter(b => 
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.terminal.includes(searchTerm)
    );
  }, [footballBets, searchTerm]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Auditoria Futebol</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Gestão Global de Riscos e Apostas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Apostado" value={formatBRL(stats.totalStaked)} icon={ReceiptText} color="text-primary" />
        <KpiCard title="Lucro Bruto" value={formatBRL(stats.bankProfit)} icon={TrendingUp} color="text-green-500" />
        <KpiCard title="Apostas Abertas" value={stats.openBets} icon={Clock} color="text-blue-400" />
        <KpiCard title="Total Bilhetes" value={stats.totalBets} icon={Award} color="text-purple-400" />
      </div>

      <Card className="border-white/5 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
            <Filter size={16} className="text-primary" /> Livro de Apostas
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar ID ou Terminal..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-black/20 border-white/10 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5">
                <TableHead className="text-[10px] uppercase font-black px-4">ID/Data</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Terminal</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Partidas</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Stake</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Retorno</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Nenhuma aposta registrada.</TableCell></TableRow>
              ) : (
                filtered.map((bet) => (
                  <TableRow key={bet.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white font-mono">{bet.id.substring(0, 12)}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(bet.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono border-white/10">{bet.terminal}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {bet.items.map((item, idx) => (
                          <div key={idx} className="text-[10px] font-bold text-slate-300 truncate max-w-[200px]">
                            {item.matchName} <span className="text-primary italic">@{item.odd.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-white">{formatBRL(bet.stake)}</TableCell>
                    <TableCell className="text-right font-black text-green-500">{formatBRL(bet.potentialWin)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bet.status === 'OPEN' ? 'secondary' : bet.status === 'WON' ? 'default' : 'destructive'} className="text-[8px] uppercase">
                        {bet.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5 shadow-inner", color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
          <p className="text-xl font-black text-white italic">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
