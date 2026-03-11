'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LayoutGrid, ArrowUpRight, FileBarChart, Clock, Award, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { getDashboardTotals } from '@/utils/dashboardTotals';
import { AdminKpiCards } from '@/components/admin/AdminKpiCards';
import { useEffect, useState, useMemo } from 'react';
import { resolveCurrentBanca, getActiveContext } from '@/utils/bancaContext';
import { Badge } from '@/components/ui/badge';
import { getUsers } from '@/utils/usersStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRecentBets, getRecentPayouts } from '@/utils/adminRecentActivity';
import { formatBRL } from '@/utils/currency';

export default function AdminPage() {
  const router = useRouter();
  const context = useAppContext();
  const [activeCtx, setActiveCtx] = useState<any>(null);
  const [currentBanca, setCurrentBanca] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const ctx = getActiveContext();
    if (!ctx && typeof window !== 'undefined') {
      router.push('/admin/select-banca');
      return;
    }
    
    setActiveCtx(ctx);
    setCurrentBanca(resolveCurrentBanca());
    
    // Busca usuários assincronamente
    getUsers().then(setUsers);
  }, [router]);

  const totals = useMemo(() => {
    if (!activeCtx) return null;
    return getDashboardTotals({
      apostas: context.apostas,
      bingoTickets: context.bingoTickets,
      bingoDraws: context.bingoDraws,
      snookerBets: context.snookerBets,
      snookerFinancialHistory: context.snookerFinancialHistory,
      footballBets: context.footballBets,
      userCommissions: context.userCommissions,
      users: users,
      ledger: context.ledger || []
    }, {
      mode: activeCtx.mode,
      bancaId: activeCtx.bancaId
    });
  }, [context, users, activeCtx]);

  const recentBets = useMemo(() => {
    if (!activeCtx) return [];
    return getRecentBets({
      apostas: context.apostas,
      bingoTickets: context.bingoTickets,
      snookerBets: context.snookerBets,
      footballBets: context.footballBets,
    }, {
      mode: activeCtx.mode,
      bancaId: activeCtx.bancaId
    }, users);
  }, [context, activeCtx, users]);

  const recentPayouts = useMemo(() => {
    if (!activeCtx) return [];
    return getRecentPayouts({
      apostas: context.apostas,
      bingoDraws: context.bingoDraws,
      snookerBets: context.snookerBets,
      footballBets: context.footballBets,
    }, {
      mode: activeCtx.mode,
      bancaId: activeCtx.bancaId
    }, users);
  }, [context, activeCtx, users]);

  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'PROMOTOR': return <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 text-[8px] h-4">PROMOTOR</Badge>;
      case 'CAMBISTA': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[8px] h-4">CAMBISTA</Badge>;
      case 'ADMIN':
      case 'SUPER_ADMIN': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[8px] h-4">ADMIN</Badge>;
      default: return <Badge variant="secondary" className="text-[8px] h-4">USUÁRIO</Badge>;
    }
  };

  if (!activeCtx || !totals) return null;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Painel Administrativo</h1>
          {currentBanca ? (
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-amber-500 text-black font-mono uppercase tracking-widest text-[10px]">UNIDADE: {currentBanca.nome}</Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{currentBanca.subdomain}.lotohub.com</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-600 text-white font-mono uppercase text-[10px] tracking-widest">Master Global</Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Todos os terminais e bancas</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => router.push('/admin/select-banca')} className="h-11 rounded-xl font-bold">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Trocar Contexto
           </Button>
           {activeCtx.mode === 'GLOBAL' && (
             <Button variant="outline" onClick={() => router.push('/admin/bancas')} className="h-11 rounded-xl font-bold">
                <Building2 className="mr-2 h-4 w-4" />
                Gerenciar Unidades
             </Button>
           )}
        </div>
      </div>
      
      <AdminKpiCards totals={totals} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TABELA DE ÚLTIMAS APOSTAS */}
        <Card className="lg:col-span-7 border-white/5 bg-card/50 overflow-hidden shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase italic tracking-widest">Últimas Apostas</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/relatorios/apostas')} className="text-[10px] font-black uppercase hover:bg-primary hover:text-black">
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground">Terminal/Tipo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground">Módulo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground text-right">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBets.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">Nenhuma aposta registrada.</TableCell></TableRow>
                ) : (
                  recentBets.map((bet) => (
                    <TableRow key={bet.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-white text-[11px]">{bet.terminal}</span>
                          {getUserTypeBadge(bet.tipoUsuario)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className='flex items-center gap-2'>
                            <span className="text-[10px] font-black text-primary uppercase">{bet.modulo}</span>
                            {bet.isDescarga && (
                              <Badge className='bg-purple-600 text-white text-[7px] h-3 px-1 font-black italic'>DESCARGA</Badge>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{bet.descricao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-white">{formatBRL(bet.valor)}</TableCell>
                      <TableCell className="text-right text-[10px] text-muted-foreground font-mono">
                        {new Date(bet.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* TABELA DE ÚLTIMOS PRÊMIOS */}
        <Card className="lg:col-span-5 border-white/5 bg-card/50 overflow-hidden shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between bg-white/5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Últimos Prêmios</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/relatorios/premios')} className="text-[10px] font-black uppercase hover:bg-green-500 hover:text-black">
              Auditoria
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground">Ganhador</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground">Módulo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-muted-foreground text-right">Prêmio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayouts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Nenhum prêmio recente.</TableCell></TableRow>
                ) : (
                  recentPayouts.map((pay) => (
                    <TableRow key={pay.id} className="border-white/5 hover:bg-green-500/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-white text-[11px] truncate max-w-[80px]">{pay.nome}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{pay.terminal}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col gap-1 items-start'>
                          <Badge variant="outline" className="text-[8px] font-black border-green-500/20 text-green-500 bg-green-500/5">{pay.modulo}</Badge>
                          {pay.isDescarga && <Badge className='bg-purple-600 text-white text-[6px] h-3 px-1'>DESCARGA</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-green-500">
                        {formatBRL(pay.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ÁREA DE RELATÓRIOS RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group" onClick={() => router.push('/admin/relatorios/apostas')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-primary/70">Relatório Completo</p>
              <h4 className="text-lg font-black uppercase italic text-white">Vendas</h4>
            </div>
            <ArrowUpRight className="h-6 w-6 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </CardContent>
        </Card>
        
        <Card className="border-white/5 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer group" onClick={() => router.push('/admin/relatorios/comissoes')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-blue-400/70">House Share</p>
              <h4 className="text-lg font-black uppercase italic text-white">Comissões</h4>
            </div>
            <ArrowUpRight className="h-6 w-6 text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer group" onClick={() => router.push('/admin/relatorios/premios')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-green-500/70">Auditoria</p>
              <h4 className="text-lg font-black uppercase italic text-white">Prêmios</h4>
            </div>
            <Award className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer group" onClick={() => router.push('/admin/descargas')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-purple-400/70">Gestão de</p>
              <h4 className="text-lg font-black uppercase italic text-white">Descargas</h4>
            </div>
            <Layers className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
