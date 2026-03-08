'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';

export default function AdminSinucaCashOutPage() {
    const { snookerCashOutLog } = useAppContext();
    
    const sortedLog = useMemo(() => {
        return [...snookerCashOutLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerCashOutLog]);

    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Relatório de Cash Outs - Sinuca</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Operações</CardTitle>
                    <CardDescription>Auditoria de todas as apostas encerradas com cash out.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Jogo</TableHead>
                                <TableHead>Aposta Original</TableHead>
                                <TableHead>Odd Original</TableHead>
                                <TableHead>Odd no Cash Out</TableHead>
                                <TableHead>Valor do Cash Out</TableHead>
                                <TableHead className="text-right">Lucro/Prejuízo Casa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLog.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{new Date(log.createdAt).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>{log.userName}</TableCell>
                                    <TableCell>{log.channelTitle}</TableCell>
                                    <TableCell>R$ {log.originalAmount.toFixed(2).replace('.', ',')}</TableCell>
                                    <TableCell>{log.originalOdd.toFixed(2)}</TableCell>
                                    <TableCell>{log.cashOutOdd.toFixed(2)}</TableCell>
                                    <TableCell className="font-semibold">R$ {log.cashOutAmount.toFixed(2).replace('.', ',')}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={log.houseProfit >= 0 ? 'default' : 'destructive'} className={log.houseProfit >= 0 ? 'bg-green-600/20 text-green-500 border-green-500/50' : ''}>
                                            R$ {log.houseProfit.toFixed(2).replace('.', ',')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {sortedLog.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhuma operação de cash out registrada ainda.
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
