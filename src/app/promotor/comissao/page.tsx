'use client';

import { useMemo, useState } from 'react';
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

export default function RelatorioComissaoPage() {
  const { user, isLoading, userCommissions, promoterCredits, apostas } = useAppContext();
  
  const [moduloFilter, setModuloFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Normalizar todos os eventos para uma única linha do tempo
  const allEvents = useMemo(() => {
    if (!user) return [];

    const events: any[] = [];

    // Comissões e Apostas vinculadas
    (userCommissions || []).forEach(c => {
      events.push({
        id: c.id,
        at: c.createdAt,
        tipo: 'COMISSAO',
        modulo: c.modulo,
        terminal: user.terminal,
        valorAposta: c.valorAposta,
        valorComissao: c.valorComissao,
        obs: `Comissão ${c.porcentagem}%`
      });
    });

    // Créditos Admin
    (promoterCredits || []).filter(pc => pc.userId === user.id).forEach(pc => {
      events.push({
        id: pc.id,
        at: pc.createdAt,
        tipo: 'CREDITO_ADMIN',
        modulo: '-',
        terminal: pc.terminal,
        valorAposta: 0,
        valorComissao: 0,
        valorCredito: pc.valor,
        obs: pc.motivo
      });
    });

    // Prêmios vinculados (Apostas premiadas do usuário)
    (apostas || []).filter(a => a.userId === user.id && (a.status === 'premiado' || a.status === 'won')).forEach(a => {
      const winAmount = Array.isArray(a.detalhes) 
        ? a.detalhes.reduce((acc: number, d: any) => acc + (d.retornoPossivel || 0), 0)
        : 0;
      
      events.push({
        id: `win-${a.id}`,
        at: a.createdAt,
        tipo: 'PREMIO',
        modulo: a.loteria,
        terminal: user.terminal,
        valorAposta: 0,
        valorComissao: 0,
        valorPremio: winAmount,
        obs: `Bilhete Premiado`
      });
    });

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [user, userCommissions, promoterCredits, apostas]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      if (moduloFilter !== 'all' && e.modulo !== moduloFilter) return false;
      if (tipoFilter !== 'all' && e.tipo !== tipoFilter) return false;
      
      const eventTime = new Date(e.at).getTime();
      if (dateStart && eventTime < new Date(dateStart + 'T00:00:00').getTime()) return false;
      if (dateEnd && eventTime > new Date(dateEnd + 'T23:59:59').getTime()) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return e.terminal.toLowerCase().includes(term) || (e.obs && e.obs.toLowerCase().includes(term));
      }

      return true;
    });
  }, [allEvents, moduloFilter, tipoFilter, dateStart, dateEnd, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalApostado: (userCommissions || []).reduce((acc, curr) => acc + curr.valorAposta, 0),
      totalComissao: (userCommissions || []).reduce((acc, curr) => acc + curr.valorComissao, 0),
      totalCreditos: (promoterCredits || []).filter(pc => pc.userId === user?.id).reduce((acc, curr) => acc + curr.valor, 0),
      totalBilhetes: (userCommissions || []).length,
      totalPremios: allEvents.filter(e => e.tipo === 'PREMIO').reduce((acc, curr) => acc + (curr.valorPremio || 0), 0)
    };
  }, [user, userCommissions, promoterCredits, allEvents]);

  const moduleSummary = useMemo(() => {
    const summary: Record<string, { apostado: number, comissao: number }> = {};
    (userCommissions || []).forEach(c => {
      if (!summary[c.modulo]) summary[c.modulo] = { apostado: 0, comissao: 0 };
      summary[c.modulo].apostado += c.valorAposta;
      summary[c.modulo].comissao += c.valorComissao;
    });
    return Object.entries(summary).sort((a, b) => b[1].apostado - a[1].apostado);
  }, [userCommissions]);

  const handleExport = () => {
    downloadCSV(
      `relatorio_promotor_${new Date().toISOString().split('T')[0]}.csv`,
      filteredEvents.map(e => ({
        Data: new Date(e.at).toLocaleString('pt-BR'),
        Tipo: e.tipo,
        Modulo: e.modulo,
        Terminal: e.terminal,
        ValorAposta: e.valorAposta || 0,
        Comissao: e.valorComissao || 0,
        CreditoOuPremio: e.valorCredito || e.valorPremio || 0,
        Observacao: e.obs
      })),
      ['Data', 'Tipo', 'Modulo', 'Terminal', 'ValorAposta', 'Comissao', 'CreditoOuPremio', 'Observacao']
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (user.tipoUsuario !== 'PROMOTOR' && user.tipoUsuario !== 'CAMBISTA')) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-4'>
        <Card className='max-w-md w-full text-center p-8 border-white/10'>
          <h2 className='text-xl font-bold mb-4'>Acesso Restrito</h2>
          <p className='text-muted-foreground mb-6'>Esta página é exclusiva para promotores ou cambistas.</p>
          <Link href="/"><Button className='w-full'>Voltar para Home</Button></Link>
        </Card>
      </div>
    );
  }

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
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Relatório de Comissão</h1>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Acompanhe seu desempenho e ganhos em tempo real</p>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant="outline" onClick={handleExport} className="h-11 rounded-xl font-bold border-white/10">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Badge variant="outline" className='h-11 bg-primary/10 text-primary border-primary/20 px-6 text-sm font-black uppercase italic'>
              Taxa: {user.promotorConfig?.porcentagemComissao || 0}%
            </Badge>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className='border-white/5 bg-slate-900/50'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><Wallet size={12} className='text-primary' /> Saldo</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-white'>{formatBRL(user.saldo)}</p></CardContent>
          </Card>
          <Card className='border-white/5 bg-slate-900/50'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><Download size={12} className='text-purple-400' /> Recebido</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-purple-400'>{formatBRL(stats.totalCreditos)}</p></CardContent>
          </Card>
          <Card className='border-white/5 bg-slate-900/50'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><TrendingUp size={12} className='text-blue-400' /> Volume</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-white'>{formatBRL(stats.totalApostado)}</p></CardContent>
          </Card>
          <Card className='border-green-500/10 bg-green-500/5'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-green-600 flex items-center gap-2'><Coins size={12} /> Comissão</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-green-500'>{formatBRL(stats.totalComissao)}</p></CardContent>
          </Card>
          <Card className='border-white/5 bg-slate-900/50'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><Award size={12} className='text-amber-400' /> Prêmios</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-white'>{formatBRL(stats.totalPremios)}</p></CardContent>
          </Card>
          <Card className='border-white/5 bg-slate-900/50'>
            <CardHeader className='p-4 pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'><Ticket size={12} className='text-slate-400' /> Bilhetes</CardTitle></CardHeader>
            <CardContent className='p-4 pt-0'><p className='text-lg font-black text-white'>{stats.totalBilhetes}</p></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <Card className='border-white/10 bg-card/50'>
              <CardHeader><CardTitle className='text-sm font-black uppercase flex items-center gap-2'><Filter size={16} /> Filtros</CardTitle></CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase font-bold text-muted-foreground'>Busca</Label>
                  <Input placeholder="Obs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='h-9 bg-background border-white/5' />
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
                      <SelectItem value="Bingo">Bingo</SelectItem>
                      <SelectItem value="Sinuca">Sinuca</SelectItem>
                      <SelectItem value="Futebol">Futebol</SelectItem>
                      <SelectItem value="Jogo do Bicho">Jogo do Bicho</SelectItem>
                      <SelectItem value="Loteria Uruguai">Loteria Uruguai</SelectItem>
                      <SelectItem value="Cassino">Cassino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase font-bold text-muted-foreground'>Tipo</Label>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className='h-9 bg-background border-white/5 text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="COMISSAO">Comissão</SelectItem>
                      <SelectItem value="CREDITO_ADMIN">Crédito Admin</SelectItem>
                      <SelectItem value="PREMIO">Prêmio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase h-8" onClick={() => { setModuloFilter('all'); setTipoFilter('all'); setDateStart(''); setDateEnd(''); setSearchTerm(''); }}>
                  Limpar
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
                  <Calendar size={14} className="text-primary" /> Extrato Detalhado
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
                    <TableHead className='text-[10px] font-black uppercase text-right'>Volume</TableHead>
                    <TableHead className='text-[10px] font-black uppercase text-right'>Ganho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">Nenhuma movimentação encontrada.</TableCell></TableRow>
                  ) : (
                    filteredEvents.map((e) => (
                      <TableRow key={e.id} className='border-white/5 hover:bg-white/5 transition-colors group'>
                        <TableCell className='py-4'>
                          <div className='flex flex-col'>
                            <span className='text-[11px] font-bold text-white'>{new Date(e.at).toLocaleDateString('pt-BR')}</span>
                            <span className='text-[9px] text-muted-foreground'>{new Date(e.at).toLocaleTimeString('pt-BR')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <Badge variant="outline" className={`text-[8px] h-4 uppercase font-black px-1.5 w-fit ${
                              e.tipo === 'COMISSAO' ? 'border-green-500/20 bg-green-500/5 text-green-500' : 
                              e.tipo === 'PREMIO' ? 'border-amber-500/20 bg-amber-500/5 text-amber-500' :
                              'border-purple-500/20 bg-purple-500/5 text-purple-500'
                            }`}>
                              {e.tipo.replace('_', ' ')}
                            </Badge>
                            <span className='text-[9px] text-muted-foreground mt-1 truncate max-w-[120px]'>{e.obs}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-[10px] font-black text-slate-400 uppercase italic'>{e.modulo}</span>
                        </TableCell>
                        <TableCell className='text-right'>
                          <span className='text-[11px] font-bold text-white'>{e.valorAposta > 0 ? formatBRL(e.valorAposta) : '-'}</span>
                        </TableCell>
                        <TableCell className='text-right'>
                          <span className={`text-[12px] font-black ${
                            e.valorComissao > 0 ? 'text-green-500' : 
                            e.valorCredito > 0 ? 'text-purple-400' :
                            e.valorPremio > 0 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {e.valorComissao > 0 ? `+${formatBRL(e.valorComissao)}` : 
                             e.valorCredito > 0 ? `+${formatBRL(e.valorCredito)}` :
                             e.valorPremio > 0 ? `+${formatBRL(e.valorPremio)}` : '-'}
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
