'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, icon: Icon, isCurrency = true, isProfit = false }: { title: string; value: number; icon: React.ElementType, isCurrency?: boolean, isProfit?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? (value >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                {isCurrency ? `R$ ${value.toFixed(2).replace('.', ',')}` : value}
            </div>
        </CardContent>
    </Card>
);

export default function AdminSinucaFinanceiroPage() {
    const { snookerFinancialHistory } = useAppContext();
    
    const overallStats = useMemo(() => {
        return snookerFinancialHistory.reduce((acc, summary) => {
            acc.totalPot += summary.totalPot;
            acc.totalPayout += summary.totalPayout;
            acc.houseProfit += summary.houseProfit;
            return acc;
        }, { totalPot: 0, totalPayout: 0, houseProfit: 0 });
    }, [snookerFinancialHistory]);

    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Relatórios Financeiros - Sinuca</h1>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <StatCard title="Total Arrecadado" value={overallStats.totalPot} icon={DollarSign} />
                <StatCard title="Total Prêmios Pagos" value={overallStats.totalPayout} icon={TrendingDown} />
                <StatCard title="Lucro Total da Casa" value={overallStats.houseProfit} icon={TrendingUp} isProfit />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Rodadas</CardTitle>
                    <CardDescription>Resumo financeiro de cada rodada finalizada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Canal</TableHead>
                                <TableHead>Arrecadado</TableHead>
                                <TableHead>Prêmios</TableHead>
                                <TableHead>Lucro/Prejuízo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snookerFinancialHistory.map(summary => (
                                <TableRow key={summary.id}>
                                    <TableCell>{new Date(summary.settledAt).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>{summary.channelTitle}</TableCell>
                                    <TableCell>R$ {summary.totalPot.toFixed(2).replace('.', ',')}</TableCell>
                                    <TableCell>R$ {summary.totalPayout.toFixed(2).replace('.', ',')}</TableCell>
                                    <TableCell>
                                        <Badge variant={summary.houseProfit >= 0 ? 'default' : 'destructive'} className={summary.houseProfit >= 0 ? 'bg-green-600/20 text-green-500 border-green-500/50' : ''}>
                                            R$ {summary.houseProfit.toFixed(2).replace('.', ',')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {snookerFinancialHistory.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma rodada foi finalizada ainda.
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
