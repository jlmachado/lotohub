'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerBet } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/utils/currency';

export default function AdminSinucaApostasPage() {
    const { snookerChannels, snookerBets, settleSnookerRound } = useAppContext();
    const { toast } = useToast();
    
    const [channelFilter, setChannelFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<SnookerBet['status'] | 'all'>('open');
    const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
    const [winner, setWinner] = useState<'A' | 'B' | 'EMPATE' | null>(null);

    const filteredBets = useMemo(() => {
        if (!channelFilter) return [];
        return snookerBets
            .filter(bet => 
                bet.channelId === channelFilter &&
                (statusFilter === 'all' || bet.status === statusFilter)
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerBets, channelFilter, statusFilter]);

    const activeBetsCount = useMemo(() => 
        snookerBets.filter(b => b.channelId === channelFilter && b.status === 'open').length,
    [snookerBets, channelFilter]);

    const handleSettle = () => {
        if (!winner) {
            toast({ variant: 'destructive', title: 'Selecione um resultado' });
            return;
        }
        settleSnookerRound(channelFilter, winner);
        toast({ title: 'Rodada Finalizada!', description: `As apostas foram liquidadas. Vencedor: ${winner}` });
        setIsSettleDialogOpen(false);
        setWinner(null);
    };

    const getStatusVariant = (status: SnookerBet['status']) => {
        switch (status) {
            case 'won': return 'default';
            case 'lost': return 'destructive';
            case 'open': return 'secondary';
            case 'refunded': return 'outline';
            case 'cash_out': return 'secondary';
            default: return 'secondary';
        }
    }
    
    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Monitoramento de Apostas</h1>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Auditoria e Liquidação em Tempo Real</p>
                </div>
            </div>

            <Card className="border-white/5 bg-card/50 shadow-2xl">
                <CardHeader className="flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-white/5">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                            <History size={16} className="text-primary" /> Histórico de Tickets
                        </CardTitle>
                        {channelFilter && (
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{activeBetsCount} apostas aguardando resultado</p>
                        )}
                    </div>
                    
                    <div className='flex flex-col md:flex-row gap-3'>
                         <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-full md:w-[280px] bg-slate-900 border-white/10">
                                <SelectValue placeholder="Selecione um canal para auditar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {snookerChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <AlertDialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    disabled={!channelFilter || activeBetsCount === 0} 
                                    className="lux-shine bg-green-600 hover:bg-green-700 font-black uppercase italic text-xs h-10 px-6 rounded-lg"
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar Rodada
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black uppercase italic">Liquidar Rodada</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400 font-medium">
                                        Esta ação irá liquidar <span className="text-white font-bold">{activeBetsCount} apostas</span>. 
                                        As vencedoras serão pagas instantaneamente e registradas no Ledger.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                <div className='grid gap-4 my-6 p-4 bg-black/20 rounded-2xl border border-white/10'>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-primary tracking-widest">Vencedor da Rodada</Label>
                                        <Select onValueChange={(v: any) => setWinner(v)}>
                                            <SelectTrigger className="bg-slate-900 h-12 text-lg font-bold">
                                                <SelectValue placeholder="Escolha o resultado final..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="A" className="font-bold">JOGADOR A (MANDANTE)</SelectItem>
                                                <SelectItem value="B" className="font-bold">JOGADOR B (VISITANTE)</SelectItem>
                                                <SelectItem value="EMPATE" className="font-bold">EMPATE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                                        <AlertTriangle className="text-amber-500 h-5 w-5 shrink-0" />
                                        <p className="text-[10px] text-amber-500 font-bold leading-relaxed uppercase">
                                            Atenção: A liquidação é irreversível e afeta o saldo real dos usuários.
                                        </p>
                                    </div>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSettle} disabled={!winner} className="bg-green-600 text-white font-black uppercase italic lux-shine">
                                        Confirmar e Pagar Prêmios
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-4 bg-white/5 border-b border-white/5">
                        <Button size="xs" variant={statusFilter === 'all' ? 'default' : 'ghost'} className="text-[9px] font-black uppercase h-7 px-3" onClick={() => setStatusFilter('all')}>Todas</Button>
                        <Button size="xs" variant={statusFilter === 'open' ? 'default' : 'ghost'} className="text-[9px] font-black uppercase h-7 px-3" onClick={() => setStatusFilter('open')}>Em Aberto</Button>
                        <Button size="xs" variant={statusFilter === 'won' ? 'default' : 'ghost'} className="text-[9px] font-black uppercase h-7 px-3 text-green-500" onClick={() => setStatusFilter('won')}>Ganhas</Button>
                        <Button size="xs" variant={statusFilter === 'cash_out' ? 'default' : 'ghost'} className="text-[9px] font-black uppercase h-7 px-3 text-amber-500" onClick={() => setStatusFilter('cash_out')}>Cash Out</Button>
                    </div>
                   
                    <Table>
                        <TableHeader className="bg-slate-950/20">
                            <TableRow className="border-white/5 h-10">
                                <TableHead className="text-[9px] uppercase font-black px-4">Usuário / Data</TableHead>
                                <TableHead className="text-[9px] uppercase font-black">Aposta</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-right">Valor</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-right">Retorno Bruto</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-center px-4">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBets.map(bet => {
                                const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
                                const odds = oddsMap[bet.pick as keyof typeof oddsMap];
                                const prize = bet.amount * odds;

                                return (
                                    <TableRow key={bet.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-white uppercase italic">{bet.userName}</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{new Date(bet.createdAt).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] h-4 font-black uppercase border-white/10 bg-black/20">
                                                {bet.pick} <span className="text-primary ml-1 italic">@{odds.toFixed(2)}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-300">{formatBRL(bet.amount)}</TableCell>
                                        <TableCell className="text-right font-black text-green-500">{formatBRL(prize)}</TableCell>
                                        <TableCell className="text-center px-4">
                                            <Badge variant={getStatusVariant(bet.status)} className="text-[8px] h-4 uppercase font-black italic">
                                                {bet.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                     {filteredBets.length === 0 && (
                        <p className="text-center text-muted-foreground py-20 italic text-sm">
                            {channelFilter ? 'Nenhuma aposta encontrada com estes filtros.' : 'Selecione um canal acima para auditar as apostas.'}
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
