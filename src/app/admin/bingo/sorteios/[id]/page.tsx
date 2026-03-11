'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Play, Square, XCircle } from 'lucide-react';
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
    const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);
    return (
        <div className="grid grid-cols-10 gap-1.5 p-4 rounded-lg bg-background">
            {allNumbers.map(num => (
                <div key={num} className={`flex items-center justify-center text-sm aspect-square rounded-full transition-all duration-300 ${numbers.includes(num) ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
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
  const { bingoDraws, bingoTickets, startBingoDraw, finishBingoDraw, cancelBingoDraw } = useAppContext();
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [draw, setDraw] = useState<BingoDraw | null>(null);
  const [tickets, setTickets] = useState<BingoTicket[]>([]);

  useEffect(() => {
    const draws = bingoDraws || [];
    const allTickets = bingoTickets || [];
    const foundDraw = draws.find(d => d.id === id);
    if (foundDraw) {
      setDraw(foundDraw);
      const relatedTickets = allTickets.filter(t => t.drawId === id);
      setTickets(relatedTickets);
    }
  }, [id, bingoDraws, bingoTickets]);

  const handleStart = () => {
    if (draw) {
      startBingoDraw(draw.id);
      toast({ title: "Sorteio Iniciado!", description: `O sorteio #${draw.drawNumber} está agora "Ao Vivo".` });
    }
  };

  const handleFinish = () => {
     if (draw) {
      finishBingoDraw(draw.id);
      toast({ title: "Sorteio Finalizado!", description: `O sorteio #${draw.drawNumber} foi finalizado e os prêmios calculados.` });
    }
  };
  
  const handleCancel = () => {
    if (draw) {
      cancelBingoDraw(draw.id, 'Cancelado pelo administrador');
      toast({ variant: 'destructive', title: "Sorteio Cancelado!", description: `O sorteio #${draw.drawNumber} foi cancelado.` });
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
          <h1 className="text-3xl font-bold">Detalhes do Sorteio #{draw.drawNumber}</h1>
          <p className="text-muted-foreground">ID: {draw.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações do Sorteio</CardTitle>
              <Badge variant={getStatusVariant(draw.status)}>{draw.status.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
               <p><strong>Agendado para:</strong> {new Date(draw.scheduledAt).toLocaleString('pt-BR')}</p>
               <p><strong>Iniciado em:</strong> {draw.startedAt ? new Date(draw.startedAt).toLocaleString('pt-BR') : 'N/A'}</p>
               <p><strong>Finalizado em:</strong> {draw.finishedAt ? new Date(draw.finishedAt).toLocaleString('pt-BR') : 'N/A'}</p>
               <p><strong>Preço da Cartela:</strong> R$ {draw.ticketPrice.toFixed(2).replace('.', ',')}</p>
            </CardContent>
            <CardFooter className="gap-2">
               <Button onClick={handleStart} disabled={draw.status !== 'waiting' && draw.status !== 'scheduled'}><Play className="mr-2 h-4 w-4" /> Iniciar</Button>
               <Button onClick={handleFinish} disabled={draw.status !== 'live'}><Square className="mr-2 h-4 w-4" /> Finalizar</Button>
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={draw.status === 'finished' || draw.status === 'cancelled'}><XCircle className="mr-2 h-4 w-4" /> Cancelar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. As apostas serão reembolsadas e o sorteio será permanentemente cancelado.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel}>Sim, Cancelar Sorteio</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
               </AlertDialog>
            </CardFooter>
          </Card>
          
          <Card>
              <CardHeader>
                  <CardTitle>Números Sorteados ({draw.drawnNumbers.length}/80)</CardTitle>
              </CardHeader>
              <CardContent>
                  <DrawnNumbersGrid numbers={draw.drawnNumbers} />
              </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cartelas Vendidas ({tickets.length})</CardTitle></CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID da Cartela</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prêmio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono">{ticket.id.substring(0,8)}...</TableCell>
                      <TableCell className="font-mono">{ticket.userId.substring(0,8)}...</TableCell>
                      <TableCell><Badge variant={ticket.status === 'won' ? 'default' : ticket.status === 'lost' ? 'destructive' : 'secondary'}>{ticket.status}</Badge></TableCell>
                      <TableCell>R$ {(ticket.result?.winAmount || 0).toFixed(2).replace('.', ',')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               {tickets.length === 0 && <p className="text-center py-4 text-muted-foreground">Nenhuma cartela vendida para este sorteio.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card>
              <CardHeader><CardTitle>Estatísticas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <StatCard title="Total de Cartelas" value={draw.totalTickets} />
                <StatCard title="Receita Total" value={`R$ ${draw.totalRevenue.toFixed(2).replace('.', ',')}`} />
                <StatCard title="Prêmios Pagos" value={`R$ ${draw.payoutTotal.toFixed(2).replace('.', ',')}`} />
                 <StatCard title="Comissão da Banca" value={`R$ ${(draw.totalRevenue * (draw.housePercent / 100)).toFixed(2).replace('.', ',')}`} />
              </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
