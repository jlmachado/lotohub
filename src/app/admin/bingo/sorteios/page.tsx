'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, PlusCircle } from 'lucide-react';
import { useAppContext, BingoDraw } from '@/context/AppContext';

export default function AdminBingoSorteiosPage() {
  const router = useRouter();
  const { bingoDraws } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled'>('all');

  const filteredDraws = useMemo(() => {
    return bingoDraws
      .filter(draw => filter === 'all' || draw.status === filter)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [bingoDraws, filter]);
  
  const getStatusVariant = (status: BingoDraw['status']) => {
    switch(status) {
      case 'live': return 'default';
      case 'finished': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Gerenciar Sorteios do Bingo</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Sorteios</CardTitle>
            <CardDescription>Visualize e gerencie os sorteios agendados, ao vivo e finalizados.</CardDescription>
          </div>
          <Button onClick={() => router.push('/admin/bingo/sorteios/novo')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Novo Sorteio
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
              <Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>Todos</Button>
              <Button variant={filter === 'scheduled' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('scheduled')}>Agendados</Button>
              <Button variant={filter === 'waiting' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('waiting')}>Aguardando</Button>
              <Button variant={filter === 'live' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('live')}>Ao Vivo</Button>
              <Button variant={filter === 'finished' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('finished')}>Finalizados</Button>
              <Button variant={filter === 'cancelled' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('cancelled')}>Cancelados</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sorteio Nº</TableHead>
                <TableHead>Horário Agendado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cartelas</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Prêmios</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDraws.map((draw) => (
                <TableRow key={draw.id}>
                  <TableCell className="font-medium">{draw.drawNumber}</TableCell>
                  <TableCell>{new Date(draw.scheduledAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(draw.status)}>{draw.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{draw.totalTickets}</TableCell>
                  <TableCell>R$ {draw.totalRevenue.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell>R$ {draw.payoutTotal.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/bingo/sorteios/${draw.id}`)}>
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDraws.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum sorteio encontrado para este filtro.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
