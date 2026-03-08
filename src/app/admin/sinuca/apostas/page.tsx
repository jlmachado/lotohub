'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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

    const handleSettle = () => {
        if (!winner) {
            toast({ variant: 'destructive', title: 'Selecione um resultado' });
            return;
        }
        settleSnookerRound(channelFilter, winner);
        toast({ title: 'Rodada Finalizada!', description: `As apostas para o canal foram liquidadas. Vencedor: ${winner}` });
        setIsSettleDialogOpen(false);
        setWinner(null);
    };

    const getStatusVariant = (status: SnookerBet['status']) => {
        switch (status) {
            case 'won': return 'default';
            case 'lost': return 'destructive';
            case 'open': return 'secondary';
            case 'refunded': return 'outline';
            default: return 'secondary';
        }
    }
    
    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Histórico de Apostas - Sinuca</h1>
            </div>

            <Card>
                <CardHeader className="flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Monitoramento de Apostas</CardTitle>
                        <CardDescription>Visualize e liquide as apostas abertas por canal.</CardDescription>
                    </div>
                    <div className='flex gap-2'>
                         <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-full md:w-[240px]">
                                <SelectValue placeholder="Filtrar por canal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {snookerChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <AlertDialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button disabled={!channelFilter || filteredBets.filter(b => b.status === 'open').length === 0}>Finalizar Rodada</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Finalizar Rodada de Apostas</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Selecione o vencedor da rodada atual. Todas as apostas em aberto para este canal serão marcadas como ganhas ou perdidas. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className='grid gap-2 my-4'>
                                    <Label>Resultado da Rodada</Label>
                                     <Select onValueChange={(v: 'A' | 'B' | 'EMPATE') => setWinner(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o vencedor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A">Jogador A</SelectItem>
                                            <SelectItem value="B">Jogador B</SelectItem>
                                            <SelectItem value="EMPATE">Empate</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setWinner(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSettle} disabled={!winner}>Confirmar Resultado</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todas</Button>
                        <Button size="sm" variant={statusFilter === 'open' ? 'default' : 'outline'} onClick={() => setStatusFilter('open')}>Em Aberto</Button>
                        <Button size="sm" variant={statusFilter === 'won' ? 'default' : 'outline'} onClick={() => setStatusFilter('won')}>Ganhas</Button>
                        <Button size="sm" variant={statusFilter === 'lost' ? 'default' : 'outline'} onClick={() => setStatusFilter('lost')}>Perdidas</Button>
                        <Button size="sm" variant={statusFilter === 'refunded' ? 'default' : 'outline'} onClick={() => setStatusFilter('refunded')}>Reembolsadas</Button>
                    </div>
                   
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Aposta</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Prêmio Potencial</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBets.map(bet => {
                                const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
                                const odds = oddsMap[bet.pick as keyof typeof oddsMap];
                                const prize = bet.amount * odds;

                                return (
                                    <TableRow key={bet.id}>
                                        <TableCell>{bet.userName}</TableCell>
                                        <TableCell>{new Date(bet.createdAt).toLocaleString('pt-BR')}</TableCell>
                                        <TableCell><Badge variant="secondary">{bet.pick}</Badge></TableCell>
                                        <TableCell>R$ {bet.amount.toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell>R$ {prize.toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(bet.status)}>
                                                {bet.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                     {filteredBets.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            {channelFilter ? 'Nenhuma aposta encontrada para os filtros selecionados.' : 'Selecione um canal para ver as apostas.'}
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
