'use client';

import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/utils/currency';
import { downloadCSV } from '@/utils/csvUtils';
import { 
  Coins, 
  TrendingUp, 
  Ticket, 
  Filter, 
  Wallet, 
  Download, 
  Award,
  BarChart3,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type KpiFilter = 'all' | 'received' | 'volume' | 'commission' | 'prizes';

export default function RelatorioComissaoPage() {
  const { user, isLoading, ledger, refreshData } = useAppContext();
  
  const [activeKpi, setActiveKpi] = useState<KpiFilter>('all');
  const [moduloFilter, setModuloFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  // Filtrar Ledger do Usuário Logado
  const userLedger = useMemo(() => {
    if (!user) return [];
    return ledger.filter(e => e.userId === user.id);
  }, [ledger, user]);

  const stats = useMemo(() => {
    return {
      totalApostado: userLedger.filter(e => e.type === 'BET_PLACED').reduce((acc, curr) => acc + Math.abs(curr.amount), 0),
      totalComissao: userLedger.filter(e => e.type === 'COMMISSION_EARNED').reduce((acc, curr) => acc + curr.amount, 0),
      totalRecebido: userLedger.filter(e => e.type === 'CREDIT_RECEIVED' || e.type === 'DEPOSIT' || e.type === 'CASH_IN').reduce((acc, curr) => acc + curr.amount, 0),
      totalBilhetes: userLedger.filter(e => e.type === 'BET_PLACED').length,
      totalPremios: userLedger.filter(e => e.type === 'BET_WIN' || e.type === 'PRIZE_PAID').reduce((acc, curr) => acc + curr.amount, 0)
    };
  }, [userLedger]);

  const filteredEvents = useMemo(() => {
    return userLedger.filter(e => {
      // Filtro por KPI (Drill-down)
      if (activeKpi === 'received' && !['CREDIT_RECEIVED', 'DEPOSIT', 'CASH_IN'].includes(e.type)) return false;
      if (activeKpi === 'volume' && e.type !== 'BET_PLACED') return false;
      if (activeKpi === 'commission' && e.type !== 'COMMISSION_EARNED') return false;
      if (activeKpi === 'prizes' && !['BET_WIN', 'PRIZE_PAID'].includes(e.type)) return false;

      // Filtros de UI
      if (moduloFilter !== 'all' && e.modulo !== moduloFilter) return false;
      
      const eventTime = new Date(e.createdAt).getTime();
      if (dateStart && eventTime < new Date(dateStart + 'T00:00:00').getTime()) return false;
      if (dateEnd && eventTime > new Date(dateEnd + 'T23:59:59').getTime()) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return e.description.toLowerCase().includes(term) || e.referenceId.toLowerCase().includes(term);
      }

      return true;
    });
  }, [userLedger, activeKpi, moduloFilter, dateStart, dateEnd, searchTerm]);

  const moduleSummary = useMemo(() => {
    const summary: Record<string, { apostado: number, comissao: number }> = {};
    userLedger.forEach(e => {
      if (!summary[e.modulo]) summary[e.modulo] = { apostado: 0, comissao: 0 };
      if (e.type === 'BET_PLACED') summary[e.modulo].apostado += Math.abs(e.amount);
      if (e.type === 'COMMISSION_EARNED') summary[e.modulo].comissao += e.amount;
    });
    return Object.entries(summary).sort((a, b) => b[1].apostado - a[1].apostado);
  }, [userLedger]);

  const handleExport = () => {
    downloadCSV(
      `relatorio_promotor_${new Date().toISOString().split('T')[0]}.csv`,
      filteredEvents.map(e => ({
        Data: new Date(e.createdAt).toLocaleString('pt-BR'),
        Tipo: e.type,
        Modulo: e.modulo,
        Valor: e.amount,
        Observacao: e.description,
        ID: e.referenceId
      })),
      ['Data', 'Tipo', 'Modulo', 'Valor', 'Observacao', 'ID']
    );
  };

  if (isLoading) return <div className="p-20 text-center">Carregando dados...</div>;

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon"><ChevronLeft size={18} /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Minhas Comissões</h1>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Acompanhe seu desempenho e ganhos em tempo real</p>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant="outline" onClick={handleExport} className="h-11 rounded-xl font-bold border-white/10">
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <Badge variant="outline" className='h-11 bg-primary/10 text-primary border-primary/20 px-6 text-sm font-black uppercase italic'>
              Taxa: {user?.promotorConfig?.porcentagemComissao || 0}%
            </Badge>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard 
            title="Saldo Atual" 
            value={user?.saldo || 0} 
            icon={Wallet} 
            color="text-white" 
            active={activeKpi === 'all'}
            onClick={() => setActiveKpi('all')}
          />
          <KpiCard 
            title="Recebido" 
            value={stats.totalRecebido} 
            icon={Download} 
            color="text-purple-400" 
            active={activeKpi === 'received'}
            onClick={() => setActiveKpi('received')}
          />
          <KpiCard 
            title="Volume" 
            value={stats.totalApostado} 
            icon={TrendingUp} 
            color="text-blue-400" 
            active={activeKpi === 'volume'}
            onClick={() => setActiveKpi('volume')}
          />
          <KpiCard 
            title="Comissão" 
            value={stats.totalComissao} 
            icon={Coins} 
            color="text-green-500" 
            active={activeKpi === 'commission'}
            onClick={() => setActiveKpi('commission')}
          />
          <KpiCard 
            title="Prêmios" 
            value={stats.totalPremios} 
            icon={Award} 
            color="text-amber-400" 
            active={activeKpi === 'prizes'}
            onClick={() => setActiveKpi('prizes')}
          />
          <KpiCard 
            title="Bilhetes" 
            value={stats.totalBilhetes} 
            icon={Ticket} 
            color="text-slate-400" 
            isCurrency={false}
            active={activeKpi === 'volume'} // Bilhetes e volume andam juntos
            onClick={() => setActiveKpi('volume')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <Card className='border-white/10 bg-card/50'>
              <CardHeader><CardTitle className='text-sm font-black uppercase flex items-center gap-2'><Filter size={16} /> Filtros</CardTitle></CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase font-bold text-muted-foreground'>Busca</Label>
                  <Input placeholder="Descrição ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='h-9 bg-background border-white/5' />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase font-bold text-muted-foreground'>Período</Label>
                  <div className='grid gap-2'>
                    <Input type='date' value={dateStart} onChange={e => setDateStart(e.target.value)} className='h-9 bg-background border-white/5 text-xs' />
                    <Input type='date' value={dateEnd} onChange={e => setDateEnd(e.target.value)} className='h-9 bg-background border-white/5 text-xs' />
                  </div>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase font-bold text-muted-foreground'>Módulo</Label>
                  <Select value={moduloFilter} onValueChange={setModuloFilter}>
                    <SelectTrigger className='h-9 bg-background border-white/5 text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Futebol">Futebol</SelectItem>
                      <SelectItem value="Bingo">Bingo</SelectItem>
                      <SelectItem value="Jogo do Bicho">Jogo do Bicho</SelectItem>
                      <SelectItem value="Loteria Uruguai">Loteria Uruguai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase h-8" onClick={() => { setModuloFilter('all'); setActiveKpi('all'); setDateStart(''); setDateEnd(''); setSearchTerm(''); }}>
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>

            <Card className='border-white/5 bg-primary/5 overflow-hidden'>
              <CardHeader className='bg-primary/10 border-b border-primary/10 p-4'>
                <CardTitle className='text-[10px] font-black uppercase text-primary flex items-center gap-2'>
                  <BarChart3 size={14} /> Resumo por Módulo
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='divide-y divide-white/5'>
                  {moduleSummary.map(([mod, data]) => (
                    <div key={mod} className='p-3 flex justify-between items-center hover:bg-white/5 transition-colors'>
                      <div className='space-y-0.5'>
                        <p className='text-xs font-black text-white uppercase italic'>{mod}</p>
                        <p className='text-[10px] text-muted-foreground'>Vol: {formatBRL(data.apostado)}</p>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs font-black text-green-500'>{formatBRL(data.comissao)}</p>
                        <p className='text-[9px] text-muted-foreground uppercase font-bold'>Ganhos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className='bg-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl'>
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                  <Calendar size={14} className="text-primary" /> Detalhamento: {activeKpi.toUpperCase()}
                </h3>
                <Badge variant="outline" className="text-[9px] font-black border-white/10 text-muted-foreground">
                  {filteredEvents.length} REGISTROS
                </Badge>
              </div>
              <Table>
                <TableHeader className='bg-slate-950/50'>
                  <TableRow className='border-white/5'>
                    <TableHead className='text-[10px] font-black uppercase'>Data/Hora</TableHead>
                    <TableHead className='text-[10px] font-black uppercase'>Evento</TableHead>
                    <TableHead className='text-[10px] font-black uppercase'>Módulo</TableHead>
                    <TableHead className='text-[10px] font-black uppercase text-right'>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">Nenhuma movimentação encontrada para este filtro.</TableCell></TableRow>
                  ) : (
                    filteredEvents.map((e) => (
                      <TableRow key={e.id} className='border-white/5 hover:bg-white/5 transition-colors group'>
                        <TableCell className='py-4'>
                          <div className='flex flex-col'>
                            <span className='text-[11px] font-bold text-white'>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</span>
                            <span className='text-[9px] text-muted-foreground'>{new Date(e.createdAt).toLocaleTimeString('pt-BR')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <Badge variant="outline" className={cn("text-[8px] h-4 uppercase font-black px-1.5 w-fit mb-1", 
                              e.amount > 0 ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-red-500/20 text-red-500 bg-red-500/5"
                            )}>
                              {e.type.replace('_', ' ')}
                            </Badge>
                            <span className='text-[10px] text-muted-foreground truncate max-w-[200px]'>{e.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-[10px] font-black text-slate-400 uppercase italic'>{e.modulo}</span>
                        </TableCell>
                        <TableCell className='text-right'>
                          <span className={cn("text-[12px] font-black", e.amount > 0 ? "text-green-500" : "text-red-500")}>
                            {e.amount > 0 ? '+' : ''}{formatBRL(e.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, isCurrency = true, active, onClick }: any) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-300 border-white/5',
        active ? 'bg-primary/20 ring-1 ring-primary/50' : 'bg-slate-900/50 hover:bg-white/5'
      )}
    >
      <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><Icon size={12} className={color} /> {title}</CardTitle></CardHeader>
      <CardContent className='p-4 pt-0'><p className={cn('text-lg font-black italic', color)}>{isCurrency ? formatBRL(value) : value}</p></CardContent>
    </Card>
  );
}
