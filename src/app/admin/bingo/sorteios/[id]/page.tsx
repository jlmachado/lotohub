'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Play, Square, XCircle, Zap } from 'lucide-react';
import { useAppContext, BingoDraw, BingoTicket } from '@/context/AppContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="p-4 border rounded-lg text-center bg-muted/50">
    <p className="text-sm text-muted-foreground">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const DrawnNumbersGrid = ({ numbers }: { numbers: number[] }) => {
    const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
    return (
        <div className="grid grid-cols-10 gap-1.5 p-4 rounded-lg bg-background">
            {allNumbers.map(num => (
                <div key={num} className={`flex items-center justify-center text-[10px] aspect-square rounded-full transition-all duration-300 ${numbers.includes(num) ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground opacity-30'}`}>
                    {num}
                </div>
            ))}
        </div>
    );
};

export default function SorteioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { bingoDraws, bingoTickets, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw } = useAppContext();
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const draw = useMemo(() => bingoDraws.find(d => d.id === id), [id, bingoDraws]);
  const tickets = useMemo(() => bingoTickets.filter(t => t.drawId === id), [id, bingoTickets]);

  const handleStart = () => {
    if (draw) {
      startBingoDraw(draw.id);
      toast({ title: "Sorteio Iniciado!", description: `O sorteio #${draw.drawNumber} está agora "Ao Vivo".` });
    }
  };

  const handleDrawBall = () => {
    if (draw) {
      drawBingoBall(draw.id);
    }
  };

  const handleFinish = () => {
     if (draw) {
      finishBingoDraw(draw.id);
      toast({ title: "Sorteio Finalizado!", description: `O sorteio #${draw.drawNumber} foi finalizado manualmente.` });
    }
  };
  
  const handleCancel = () => {
    if (draw) {
      cancelBingoDraw(draw.id, 'Cancelado pelo administrador');
      toast({ variant: 'destructive', title: "Sorteio Cancelado!", description: `O sorteio #${draw.drawNumber} foi cancelado e os valores estornados.` });
      router.push('/admin/bingo/sorteios');
    }
  };

  const getStatusVariant = (status: BingoDraw['status']) => {
    switch(status) {
      case 'live': return 'default';
      case 'finished': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (!draw) {
    return (
      <main className="p-8">
        <p>Sorteio não encontrado.</p>
        <Link href="/admin/bingo/sorteios"><Button>Voltar para a lista</Button></Link>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo/sorteios"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Sorteio #{draw.drawNumber}</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{draw.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Controle de Extração</CardTitle>
                <CardDescription>Comande o sorteio das bolas em tempo real.</CardDescription>
              </div>
              <Badge variant={getStatusVariant(draw.status)} className="text-[10px] uppercase font-black px-3 h-6">{draw.status}</Badge>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-muted-foreground">Configurações</p>
                  <p className="text-sm"><strong>Início:</strong> {new Date(draw.scheduledAt).toLocaleString('pt-BR')}</p>
                  <p className="text-sm"><strong>Preço Cartela:</strong> R$ {draw.ticketPrice.toFixed(2)}</p>
                  <p className="text-sm"><strong>Arrecadação:</strong> R$ {draw.totalRevenue.toFixed(2)}</p>
               </div>
               <div className="flex flex-col justify-center items-center p-4 bg-muted/20 rounded-xl border border-dashed">
                  <span className="text-[10px] uppercase font-black text-muted-foreground mb-2">Última Bola</span>
                  <span className="text-6xl font-black text-primary drop-shadow-md">
                    {draw.drawnNumbers.length > 0 ? draw.drawnNumbers[draw.drawnNumbers.length - 1] : '--'}
                  </span>
               </div>
            </CardContent>
            <CardFooter className="gap-2 border-t pt-6">
               {draw.status === 'scheduled' || draw.status === 'waiting' ? (
                 <Button onClick={handleStart} className="flex-1 h-12 lux-shine"><Play className="mr-2 h-4 w-4" /> Iniciar Sorteio</Button>
               ) : draw.status === 'live' ? (
                 <Button onClick={handleDrawBall} size="lg" className="flex-1 h-12 bg-green-600 hover:bg-green-700 animate-pulse"><Zap className="mr-2 h-4 w-4" /> Sortear Próxima Bola</Button>
               ) : null}
               
               <Button onClick={handleFinish} variant="outline" className="h-12" disabled={draw.status !== 'live'}><Square className="mr-2 h-4 w-4" /> Finalizar</Button>
               
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="h-12" disabled={draw.status === 'finished' || draw.status === 'cancelled'}><XCircle className="mr-2 h-4 w-4" /> Cancelar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação é irreversível. Todas as cartelas vendidas serão REEMBOLSADAS integralmente aos saldos dos usuários.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">Confirmar Cancelamento e Reembolso</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
               </AlertDialog>
            </CardFooter>
          </Card>
          
          <Card>
              <CardHeader>
                  <CardTitle>Bolas Sorteadas ({draw.drawnNumbers.length}/90)</CardTitle>
              </CardHeader>
              <CardContent>
                  <DrawnNumbersGrid numbers={draw.drawnNumbers} />
              </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cartelas Vendidas ({tickets.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">ID / Usuário</TableHead>
                    <TableHead>Números</TableHead>
                    <TableHead>Acertos</TableHead>
                    <TableHead className="text-right px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => {
                    const hits = ticket.ticketNumbers.filter(n => draw.drawnNumbers.includes(n)).length;
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px]">{ticket.id.substring(0,8)}</span>
                            <span className="text-xs font-bold">{ticket.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-0.5">
                            {ticket.ticketNumbers.map(n => (
                              <span key={n} className={`text-[9px] w-5 h-5 flex items-center justify-center rounded-sm ${draw.drawnNumbers.includes(n) ? 'bg-green-500 text-white font-bold' : 'bg-muted opacity-50'}`}>
                                {n}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{hits}/15</Badge>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <Badge variant={ticket.status === 'won' ? 'default' : ticket.status === 'lost' ? 'destructive' : 'secondary'} className="text-[8px] uppercase">
                            {ticket.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
               {tickets.length === 0 && <p className="text-center py-12 text-muted-foreground italic">Nenhuma cartela vendida.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card className="border-primary/10 bg-primary/5">
              <CardHeader><CardTitle className="text-sm font-black uppercase italic tracking-widest">Ganhadores da Rodada</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(draw.winnersFound).map(([category, winner]) => (
                  <div key={category} className="p-3 bg-card border rounded-lg shadow-sm">
                    <Badge className="bg-blue-600 mb-2 uppercase text-[9px]">{category}</Badge>
                    {winner ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{winner.userName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">Terminal: {winner.terminalId}</p>
                        <p className="text-sm font-black text-green-600">R$ {winner.winAmount.toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aguardando...</p>
                    )}
                  </div>
                ))}
              </CardContent>
          </Card>

           <Card>
              <CardHeader><CardTitle>Financeiro Consolidadado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <StatCard title="Receita Bruta" value={formatBRL(draw.totalRevenue)} />
                <StatCard title="Prêmios Pagos" value={formatBRL(draw.payoutTotal)} />
                <StatCard title="Comissão Banca" value={formatBRL(draw.totalRevenue * (draw.housePercent / 100))} />
                <StatCard title="Resultado Líquido" value={formatBRL(draw.totalRevenue - draw.payoutTotal - (draw.totalRevenue * (draw.housePercent / 100)))} />
              </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
