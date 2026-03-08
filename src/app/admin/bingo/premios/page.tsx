'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { useAppContext, BingoPayout } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminBingoPremiosPage() {
  const { bingoPayouts, payBingoPayout } = useAppContext();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'failed' | 'cancelled'>('pending');

  const filteredPayouts = useMemo(() => {
    return bingoPayouts
      .filter(payout => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          (payout.userId.toLowerCase().includes(lowerSearchTerm) ||
           payout.drawId.toLowerCase().includes(lowerSearchTerm) ||
           payout.id.toLowerCase().includes(lowerSearchTerm)) &&
          (filter === 'all' || payout.status === filter)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bingoPayouts, searchTerm, filter]);

  const handlePay = (payoutId: string) => {
    payBingoPayout(payoutId);
    toast({
      title: 'Pagamento Registrado',
      description: `O pagamento ${payoutId} foi marcado como "Pago".`,
    });
  };

  const getStatusVariant = (status: BingoPayout['status']) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Pagamentos de Prêmios (Bingo)</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Prêmios</CardTitle>
          <CardDescription>Gerencie e audite todos os pagamentos de prêmios do bingo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID do Sorteio, do Pagamento ou do Usuário..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todos</Button>
                <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pendentes</Button>
                <Button variant={filter === 'paid' ? 'default' : 'outline'} onClick={() => setFilter('paid')}>Pagos</Button>
                <Button variant={filter === 'failed' ? 'default' : 'outline'} onClick={() => setFilter('failed')}>Falhas</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pagamento</TableHead>
                <TableHead>Sorteio</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-mono">{payout.id.substring(0,8)}...</TableCell>
                  <TableCell className="font-mono">{payout.drawId}</TableCell>
                  <TableCell className="font-mono">{payout.userId.substring(0,8)}...</TableCell>
                  <TableCell>{payout.type.toUpperCase()}</TableCell>
                  <TableCell>R$ {payout.amount.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell>{new Date(payout.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payout.status)}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handlePay(payout.id)}
                      disabled={payout.status !== 'pending'}
                    >
                      Marcar como Pago
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPayouts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
