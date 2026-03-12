'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, HandCoins, Filter, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { formatBRL } from '@/utils/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminSinucaCashOutPage() {
    const { snookerCashOutLog, snookerChannels } = useAppContext();
    const [channelFilter, setChannelFilter] = useState('all');
    
    const filteredLog = useMemo(() => {
        let items = [...snookerCashOutLog];
        if (channelFilter !== 'all') {
            items = items.filter(l => l.channelId === channelFilter);
        }
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerCashOutLog, channelFilter]);

    const stats = useMemo(() => {
        return {
            totalVolume: filteredLog.reduce((acc, curr) => acc + curr.originalAmount, 0),
            totalPaid: filteredLog.reduce((acc, curr) => acc + curr.cashOutAmount, 0),
            houseProfit: filteredLog.reduce((acc, curr) => acc + curr.houseProfit, 0),
            count: filteredLog.length
        };
    }, [filteredLog]);

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Auditoria de Cash Out</h1>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Histórico de encerramentos antecipados</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard title="Operações" value={stats.count} isCurrency={false} color="text-white" />
                <KpiCard title="Volume Original" value={stats.totalVolume} color="text-blue-400" />
                <KpiCard title="Total Pago" value={stats.totalPaid} color="text-amber-400" />
                <KpiCard title="Margem Retida" value={stats.houseProfit} color="text-green-500" />
            </div>

            <Card className="border-white/5 bg-card/50 shadow-2xl">
                <CardHeader className="flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-white/5">
                    <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                        <History size={16} className="text-primary" /> Logs de Operação
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-muted-foreground" />
                        <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-[200px] h-9 bg-slate-900 border-white/10 text-[10px] uppercase font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Canais</SelectItem>
                                {snookerChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-950/20">
                            <TableRow className="border-white/5 h-10">
                                <TableHead className="text-[9px] uppercase font-black px-4">Data / Operador</TableHead>
                                <TableHead className="text-[9px] uppercase font-black">Jogo</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-right">Aposta Original</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-right">Pago (Cash Out)</TableHead>
                                <TableHead className="text-[9px] uppercase font-black text-right px-4">Lucro Casa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLog.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic text-sm">Nenhuma operação de cash out encontrada.</TableCell></TableRow>
                            ) : (
                                filteredLog.map(log => (
                                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-white uppercase italic">{log.userName}</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase italic truncate max-w-[150px] block">{log.channelTitle}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-bold text-white">{formatBRL(log.originalAmount)}</span>
                                                <span className="text-[8px] text-muted-foreground font-black uppercase">Odd: @{log.originalOdd.toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-black text-amber-500">{formatBRL(log.cashOutAmount)}</span>
                                                <span className="text-[8px] text-muted-foreground font-black uppercase">Odd Now: @{log.cashOutOdd.toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-4">
                                            <Badge variant={log.houseProfit >= 0 ? 'default' : 'destructive'} className={cn("text-[9px] h-5 px-2 font-black italic", log.houseProfit >= 0 ? "bg-green-600/20 text-green-500 border-green-500/30" : "")}>
                                                {formatBRL(log.houseProfit)}
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
    )
}

function KpiCard({ title, value, color, isCurrency = true }: any) {
    return (
        <Card className="bg-slate-900 border-white/5 shadow-inner">
            <CardContent className="p-4">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{title}</p>
                <p className={cn("text-xl font-black italic tracking-tighter tabular-nums", color)}>
                    {isCurrency ? formatBRL(value) : value}
                </p>
            </CardContent>
        </Card>
    );
}
