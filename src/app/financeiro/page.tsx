/**
 * @fileOverview Página de Extrato Unificado - Consome dados do Ledger.
 */

'use client';

import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';
import { ArrowDownCircle, ArrowUpCircle, History, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function ExtratoPage() {
  const { ledger, user, isLoading } = useAppContext();
  const [filter, setFilter] = useState('all');

  const myLedger = useMemo(() => {
    if (!user) return [];
    return ledger
      .filter(e => e.userId === user.id)
      .filter(e => filter === 'all' || e.type === filter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ledger, user, filter]);

  if (isLoading) return <div className="p-20 text-center">Carregando extrato...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Meu Extrato</h1>
            <p className="text-muted-foreground text-xs uppercase font-bold">Histórico detalhado de transações</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 text-[10px] uppercase font-bold p-2 rounded-lg"
            >
              <option value="all">Todas as Operações</option>
              <option value="BET_PLACED">Apostas Realizadas</option>
              <option value="BET_WIN">Prêmios Recebidos</option>
              <option value="COMMISSION_EARNED">Comissões Ganhas</option>
              <option value="CREDIT_RECEIVED">Créditos Recebidos</option>
            </select>
          </div>
        </div>

        <Card className="border-white/5 bg-slate-900/50 overflow-hidden shadow-2xl">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
              <History size={16} className="text-primary" /> Lançamentos
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[9px] uppercase font-black px-4">Data/Hora</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Tipo</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Descrição</TableHead>
                <TableHead className="text-[9px] uppercase font-black text-right px-4">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">Nenhuma transação encontrada.</TableCell>
                </TableRow>
              ) : (
                myLedger.map((entry) => (
                  <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(entry.createdAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black ${
                        entry.amount > 0 ? 'border-green-500/20 text-green-500 bg-green-500/5' : 'border-red-500/20 text-red-500 bg-red-500/5'
                      }`}>
                        {entry.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-slate-300 uppercase italic">{entry.description}</span>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-black ${entry.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {entry.amount > 0 ? '+' : ''}{formatBRL(entry.amount)}
                        </span>
                        <span className="text-[8px] text-muted-foreground uppercase">Saldo: {formatBRL(entry.balanceAfter)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
