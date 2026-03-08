'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { useAppContext, BingoTicket } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminBingoCartelasPage() {
  const { bingoTickets, refundBingoTicket } = useAppContext();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'lost' | 'won' | 'refunded'>('all');

  const filteredTickets = useMemo(() => {
    return bingoTickets
      .filter(ticket => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          (ticket.userId.toLowerCase().includes(lowerSearchTerm) ||
           ticket.drawId.toLowerCase().includes(lowerSearchTerm) ||
           ticket.id.toLowerCase().includes(lowerSearchTerm)) &&
          (filter === 'all' || ticket.status === filter)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bingoTickets, searchTerm, filter]);

  const handleRefund = (ticketId: string) => {
    refundBingoTicket(ticketId);
    toast({
      title: 'Cartela Reembolsada',
      description: `A cartela ${ticketId} foi marcada como reembolsada.`,
    });
  };

  const getStatusVariant = (status: BingoTicket['status']) => {
    switch (status) {
      case 'won': return 'default';
      case 'active': return 'secondary';
      case 'lost': return 'destructive';
      case 'refunded': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Cartelas do Bingo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar e Gerenciar Cartelas</CardTitle>
          <CardDescription>Visualize, filtre e audite todas as cartelas compradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID do Sorteio, ID da Cartela ou ID do Usuário..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todas</Button>
                <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Ativas</Button>
                <Button variant={filter === 'won' ? 'default' : 'outline'} onClick={() => setFilter('won')}>Premiadas</Button>
                <Button variant={filter === 'lost' ? 'default' : 'outline'} onClick={() => setFilter('lost')}>Perdedoras</Button>
                <Button variant={filter === 'refunded' ? 'default' : 'outline'} onClick={() => setFilter('refunded')}>Reembolsadas</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID da Cartela</TableHead>
                <TableHead>Sorteio</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono">{ticket.id.substring(0,8)}...</TableCell>
                  <TableCell className="font-mono">{ticket.drawId}</TableCell>
                  <TableCell className="font-mono">{ticket.userId.substring(0,8)}...</TableCell>
                  <TableCell>R$ {ticket.amountPaid.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell>{new Date(ticket.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(ticket.id)}
                      disabled={ticket.status === 'refunded'}
                    >
                      Reembolsar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredTickets.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhuma cartela encontrada.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
