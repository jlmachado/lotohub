'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBRL } from '@/utils/currency';
import { downloadCSV } from '@/utils/csvUtils';
import { 
  Wallet, 
  Banknote, 
  History, 
  Lock, 
  Unlock, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Download, 
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Coins,
  Filter,
  Ticket,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type CaixaKpi = 'all' | 'apostas' | 'premios' | 'entradas' | 'recolhe';

export default function CambistaCaixaPage() {
  const { user, isLoading, ledger, registerCambistaMovement, isFullscreen, toggleFullscreen, refreshData } = useAppContext();
  const { toast } = useToast();

  const [activeKpi, setActiveKpi] = useState<CaixaKpi>('all');
  const [dialogOpen, setWalletDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<'ENTRADA_MANUAL' | 'RECOLHE' | 'FECHAMENTO_CAIXA'>('ENTRADA_MANUAL');
  
  // Auth state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');

  // Values state
  const [valorInput, setValorInput] = useState('');
  const [moduloFilter, setModuloFilter] = useState('all');
  const [obsInput, setObsInput] = useState('');

  // Filtros de listagem
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');

  useEffect(() => {
    refreshData();
  }, []);

  // Ledger filtrado para o Cambista
  const userLedger = useMemo(() => {
    if (!user) return [];
    return ledger.filter(e => e.userId === user.id);
  }, [ledger, user]);

  const stats = useMemo(() => {
    const totalApostado = userLedger.filter(e => e.type === 'BET_PLACED').reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    const totalPremios = userLedger.filter(e => e.type === 'BET_WIN' || e.type === 'PRIZE_PAID').reduce((acc, curr) => acc + curr.amount, 0);
    const totalEntradas = userLedger.filter(e => e.type === 'CREDIT_RECEIVED' || e.type === 'DEPOSIT' || e.type === 'CASH_IN').reduce((acc, curr) => acc + curr.amount, 0);
    const totalRecolhes = userLedger.filter(e => e.type === 'CASH_OUT_RECOLHE' || e.type === 'WITHDRAW').reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    const totalComissao = userLedger.filter(e => e.type === 'COMMISSION_EARNED').reduce((acc, curr) => acc + curr.amount, 0);
    
    // Saldo Operacional em Mãos
    const emMaos = (totalApostado + totalEntradas) - (totalPremios + totalRecolhes);

    return { 
      totalApostado, 
      totalPremios, 
      totalEntradas, 
      totalRecolhes, 
      emMaos,
      totalComissao,
      bilhetesCount: userLedger.filter(e => e.type === 'BET_PLACED').length
    };
  }, [userLedger]);

  const filteredEvents = useMemo(() => {
    return userLedger.filter(e => {
      // Drill-down por KPI
      if (activeKpi === 'apostas' && e.type !== 'BET_PLACED') return false;
      if (activeKpi === 'premios' && !['BET_WIN', 'PRIZE_PAID'].includes(e.type)) return false;
      if (activeKpi === 'entradas' && !['CREDIT_RECEIVED', 'DEPOSIT', 'CASH_IN'].includes(e.type)) return false;
      if (activeKpi === 'recolhe' && !['CASH_OUT_RECOLHE', 'WITHDRAW'].includes(e.type)) return false;

      // Filtros manuais
      if (tipoFilter !== 'all' && e.type !== tipoFilter) return false;
      const eventTime = new Date(e.createdAt).getTime();
      if (dateStart && eventTime < new Date(dateStart + 'T00:00:00').getTime()) return false;
      if (dateEnd && eventTime > new Date(dateEnd + 'T23:59:59').getTime()) return false;
      return true;
    });
  }, [userLedger, activeKpi, tipoFilter, dateStart, dateEnd]);

  const handleOpenDialog = (type: any) => {
    setMovementType(type);
    setWalletDialogOpen(true);
    setIsAuthorized(false);
    setLoginInput('');
    setSenhaInput('');
    setValorInput('');
    setModuloFilter('all');
    setObsInput('');
  };

  const handleAuthorize = () => {
    if (loginInput === user?.cambistaConfig?.loginFechamento && senhaInput === user?.cambistaConfig?.senhaFechamento) {
      setIsAuthorized(true);
    } else {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Credenciais de fechamento incorretas.' });
    }
  };

  const handleConfirmAction = () => {
    const value = parseFloat(valorInput);
    if (movementType !== 'FECHAMENTO_CAIXA' && (isNaN(value) || value <= 0)) {
      toast({ variant: 'destructive', title: 'Valor inválido' });
      return;
    }

    registerCambistaMovement({
      tipo: movementType,
      valor: movementType === 'FECHAMENTO_CAIXA' ? stats.emMaos : value,
      modulo: moduloFilter !== 'all' ? moduloFilter : 'Caixa',
      observacao: obsInput || (movementType === 'FECHAMENTO_CAIXA' ? `Fechamento total consolidado` : '')
    });

    toast({ title: 'Sucesso!', description: 'Operação registrada no livro de caixa.' });
    setWalletDialogOpen(false);
  };

  const handleExport = () => {
    downloadCSV(
      `caixa_cambista_${new Date().toISOString().split('T')[0]}.csv`,
      filteredEvents.map(e => ({
        Data: new Date(e.createdAt).toLocaleString('pt-BR'),
        Tipo: e.type,
        Modulo: e.modulo || '-',
        Valor: e.amount,
        Observacao: e.description
      })),
      ['Data', 'Tipo', 'Modulo', 'Valor', 'Observacao']
    );
  };

  if (isLoading) return <div className="p-20 text-center">Carregando caixa...</div>;

  if (!user || user.tipoUsuario !== 'CAMBISTA') {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-4'>
        <Card className='max-w-md w-full text-center p-8 border-white/10'>
          <h2 className='text-xl font-bold mb-4'>Acesso Restrito</h2>
          <p className='text-muted-foreground mb-6'>Esta página é exclusiva para cambistas autorizados.</p>
          <Link href="/"><Button className='w-full'>Voltar para Home</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <main className="p-2 md:p-6 max-w-7xl mx-auto space-y-4 bg-background">
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Gestão de Caixa</h1>
            <div className='flex items-center gap-2 mt-0.5'>
              <Badge className='bg-amber-500 text-black font-black italic uppercase text-[9px] h-4'>Cambista</Badge>
              <span className='text-[10px] text-muted-foreground uppercase font-bold tracking-widest'>Terminal {user.terminal}</span>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-1.5 justify-start md:justify-end w-full md:w-auto'>
            <Button onClick={toggleFullscreen} variant="outline" className='h-9 rounded-lg font-bold border-white/10 text-[10px] sm:text-xs px-2.5'>
              {isFullscreen ? <Minimize2 size={14} className="mr-1.5" /> : <Maximize2 size={14} className="mr-1.5" />}
              {isFullscreen ? 'Sair' : '⛶ Tela Cheia'}
            </Button>
            <Button onClick={handleExport} variant="outline" className='h-9 rounded-lg font-bold border-white/10 px-2.5'>
              <Download size={16} />
            </Button>
            <Button onClick={() => handleOpenDialog('ENTRADA_MANUAL')} variant="outline" className='h-9 rounded-lg font-bold border-white/10 hover:bg-green-500/10 hover:text-green-500 text-[10px] sm:text-xs px-2.5'>
              <ArrowDownCircle className='mr-1.5 h-3.5 w-3.5' /> Add
            </Button>
            <Button onClick={() => handleOpenDialog('RECOLHE')} variant="outline" className='h-9 rounded-lg font-bold border-white/10 hover:bg-amber-500/10 hover:text-amber-500 text-[10px] sm:text-xs px-2.5'>
              <ArrowUpCircle className='mr-1.5 h-3.5 w-3.5' /> Recolhe
            </Button>
            <Button onClick={() => handleOpenDialog('FECHAMENTO_CAIXA')} className='h-9 rounded-lg font-black uppercase lux-shine px-4 sm:px-6 text-[10px] sm:text-xs flex-grow sm:flex-grow-0'>
              <Lock className='mr-1.5 h-3.5 w-3.5' /> Fechar
            </Button>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <CaixaCard title="Apostado" value={stats.totalApostado} icon={TrendingUp} active={activeKpi === 'apostas'} onClick={() => setActiveKpi('apostas')} />
          <CaixaCard title="Prêmios" value={stats.totalPremios} icon={TrendingDown} color="text-red-400" active={activeKpi === 'premios'} onClick={() => setActiveKpi('premios')} />
          <CaixaCard title="Entradas" value={stats.totalEntradas} icon={Banknote} color="text-green-400" active={activeKpi === 'entradas'} onClick={() => setActiveKpi('entradas')} />
          <CaixaCard title="Recolhe" value={stats.totalRecolhes} icon={History} color="text-amber-400" active={activeKpi === 'recolhe'} onClick={() => setActiveKpi('recolhe')} />
          <CaixaCard title="Em Mãos" value={stats.emMaos} icon={Receipt} color="text-primary" highlight active={activeKpi === 'all'} onClick={() => setActiveKpi('all')} />
          <CaixaCard title="Ganho" value={stats.totalComissao} icon={Coins} color="text-green-500" active={activeKpi === 'all'} onClick={() => setActiveKpi('all')} />
          <CaixaCard title="Bilhetes" value={stats.bilhetesCount} icon={Ticket} isCurrency={false} active={activeKpi === 'apostas'} onClick={() => setActiveKpi('apostas')} />
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-4'>
          <div className='space-y-4'>
            <Card className='border-white/10 bg-card/50'>
              <CardHeader className="p-4 pb-2"><CardTitle className='text-xs font-black uppercase flex items-center gap-2'><Filter size={14} /> Filtros</CardTitle></CardHeader>
              <CardContent className='p-4 pt-2 space-y-3'>
                <div className='space-y-1'>
                  <Label className='text-[9px] uppercase font-bold text-muted-foreground'>Período</Label>
                  <div className='grid gap-1.5'>
                    <Input type='date' value={dateStart} onChange={e => setDateStart(e.target.value)} className='h-8 bg-background border-white/5 text-[10px]' />
                    <Input type='date' value={dateEnd} onChange={e => setDateEnd(e.target.value)} className='h-8 bg-background border-white/5 text-[10px]' />
                  </div>
                </div>
                <div className='space-y-1'>
                  <Label className='text-[9px] uppercase font-bold text-muted-foreground'>Operação</Label>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className='h-8 bg-background border-white/5 text-[10px]'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="BET_PLACED">Aposta</SelectItem>
                      <SelectItem value="PRIZE_PAID">Prêmio Pago</SelectItem>
                      <SelectItem value="COMMISSION_EARNED">Comissão</SelectItem>
                      <SelectItem value="CASH_OUT_RECOLHE">Recolhe</SelectItem>
                      <SelectItem value="CASH_IN">Entrada Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" className="w-full text-[9px] font-black uppercase h-7" onClick={() => { setTipoFilter('all'); setActiveKpi('all'); setDateStart(''); setDateEnd(''); }}>
                  Resetar
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className='lg:col-span-3'>
            <Card className='border-white/5 overflow-hidden shadow-2xl'>
              <CardHeader className='bg-slate-950/50 border-b border-white/5 p-3'>
                <CardTitle className='text-[10px] font-black uppercase italic tracking-widest text-white flex items-center gap-2'>
                  <History size={12} className="text-primary" /> Log de Movimentações: {activeKpi.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader className='bg-slate-950/20'>
                  <TableRow className='border-white/5 h-8'>
                    <TableHead className='text-[9px] uppercase font-black px-3'>Data</TableHead>
                    <TableHead className='text-[9px] uppercase font-black px-3'>Tipo</TableHead>
                    <TableHead className='text-[9px] uppercase font-black px-3'>Obs/ID</TableHead>
                    <TableHead className='text-[9px] uppercase font-black text-right px-3'>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className='text-center py-16 text-muted-foreground italic text-xs'>Sem movimentações registradas.</TableCell></TableRow>
                  ) : (
                    filteredEvents.map(m => (
                      <TableRow key={m.id} className='border-white/5 hover:bg-white/5 transition-colors'>
                        <TableCell className='py-2.5 px-3'>
                          <div className='flex flex-col'>
                            <span className='text-[10px] font-bold text-white'>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
                            <span className='text-[8px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3">
                          <Badge variant="outline" className={cn("text-[7px] h-3.5 uppercase font-black px-1", 
                            m.amount > 0 ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-red-500/20 text-red-500 bg-red-500/5"
                          )}>
                            {m.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3">
                          <div className='flex flex-col'>
                            <span className='text-[9px] font-black text-slate-300 uppercase italic'>{m.modulo}</span>
                            <span className='text-[8px] text-muted-foreground truncate max-w-[120px]'>{m.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn('text-right font-black px-3 text-xs', m.amount > 0 ? 'text-green-500' : 'text-red-500')}>
                          {m.amount > 0 ? '+' : ''}{formatBRL(m.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className='sm:max-w-md bg-[#0f172a] border-white/10'>
          <DialogHeader>
            <DialogTitle className='text-white uppercase font-black italic'>{movementType.replace('_', ' ')}</DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {!isAuthorized ? 'Identifique-se com sua senha de fechamento.' : (movementType === 'FECHAMENTO_CAIXA' ? 'Confirme os valores totais para encerramento.' : 'Preencha os detalhes da operação.')}
            </DialogDescription>
          </DialogHeader>

          {!isAuthorized ? (
            <div className='space-y-3 py-2'>
              <div className='space-y-1.5'>
                <Label className='text-white/70 text-xs'>Login de Segurança</Label>
                <Input value={loginInput} onChange={e => setLoginInput(e.target.value)} className='bg-black/20 border-white/10 text-white h-10' placeholder="Seu login de caixa" />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-white/70 text-xs'>Senha de Segurança</Label>
                <Input type='password' value={senhaInput} onChange={e => setSenhaInput(e.target.value)} className='bg-black/20 border-white/10 text-white h-10' placeholder="****" />
              </div>
              <Button onClick={handleAuthorize} className='w-full h-11 rounded-xl font-black uppercase lux-shine text-xs'><ShieldCheck className='mr-2 h-4 w-4' /> Validar Operador</Button>
            </div>
          ) : (
            <div className='space-y-3 py-2'>
              {movementType === 'FECHAMENTO_CAIXA' ? (
                <div className='p-4 rounded-xl bg-primary/10 text-center border border-primary/20 space-y-3'>
                  <div>
                    <p className='text-[9px] uppercase font-black text-muted-foreground mb-0.5'>Valor total em mãos</p>
                    <p className='text-3xl font-black text-primary italic'>{formatBRL(stats.emMaos)}</p>
                  </div>
                  <div className='grid grid-cols-2 gap-3 pt-3 border-t border-primary/10'>
                    <div className='text-left'>
                      <p className='text-[7px] uppercase font-bold text-muted-foreground'>Vendas (Apostas)</p>
                      <p className='text-[10px] font-black text-white'>{formatBRL(stats.totalApostado)}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-[7px] uppercase font-bold text-muted-foreground'>Prêmios Pagos</p>
                      <p className='text-[10px] font-black text-white'>{formatBRL(stats.totalPremios)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-3'>
                  <div className='space-y-1.5'>
                    <Label className='text-white/70 text-xs'>Valor (R$)</Label>
                    <Input type='number' value={valorInput} onChange={e => setValorInput(e.target.value)} className='text-xl h-12 font-black text-center bg-black/20 border-white/10 text-white' placeholder="0.00" />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-white/70 text-xs'>Módulo (Opcional)</Label>
                    <Select value={moduloFilter} onValueChange={setModuloFilter}>
                      <SelectTrigger className='bg-black/20 border-white/10 text-white h-9 text-xs'><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Nenhum</SelectItem>
                        <SelectItem value="Futebol">Futebol</SelectItem>
                        <SelectItem value="Bingo">Bingo</SelectItem>
                        <SelectItem value="Jogo do Bicho">Jogo do Bicho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className='space-y-1.5'>
                <Label className='text-white/70 text-xs'>Observação</Label>
                <Input value={obsInput} onChange={e => setObsInput(e.target.value)} className='bg-black/20 border-white/10 text-white h-9 text-xs' placeholder="Ex: Sangria realizada..." />
              </div>
              <Button onClick={handleConfirmAction} className='w-full h-11 rounded-xl font-black uppercase lux-shine text-xs'>
                {movementType === 'FECHAMENTO_CAIXA' ? 'Confirmar e Encerrar' : 'Processar Registro'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaixaCard({ title, value, icon: Icon, color = 'text-white', isCurrency = true, highlight, active, onClick }: any) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        'cursor-pointer border-white/5 transition-all duration-300',
        active ? 'bg-primary/20 ring-1 ring-primary/50' : 'bg-slate-900/50 hover:bg-white/5',
        highlight && !active && 'bg-primary/10 border-primary/20 shadow-lg'
      )}
    >
      <CardHeader className='p-2.5 pb-0.5'><CardTitle className='text-[8px] uppercase font-black text-muted-foreground flex items-center gap-1'><Icon size={8} className={color}/> {title}</CardTitle></CardHeader>
      <CardContent className='p-2.5 pt-0'><p className={cn('text-base font-black italic', color)}>{isCurrency ? formatBRL(value) : value}</p></CardContent>
    </Card>
  );
}
