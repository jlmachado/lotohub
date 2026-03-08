'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Separator } from '@/components/ui/separator';

export default function AdminBingoRelatoriosPage() {
  const { bingoDraws, bingoTickets } = useAppContext();
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<any>(null);

  const handleGenerateReport = () => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const relevantDraws = bingoDraws.filter(draw => {
        const finishedAt = draw.finishedAt ? new Date(draw.finishedAt) : null;
        return finishedAt && finishedAt >= start && finishedAt <= end;
    });
    
    const relevantDrawIds = new Set(relevantDraws.map(d => d.id));

    const relevantTickets = bingoTickets.filter(ticket => relevantDrawIds.has(ticket.drawId));

    const totalRevenue = relevantTickets.reduce((acc, t) => acc + t.amountPaid, 0);
    const totalPayout = relevantDraws.reduce((acc, d) => acc + d.payoutTotal, 0);
    const totalHouseShare = relevantDraws.reduce((acc, d) => acc + (d.totalRevenue * (d.housePercent / 100)), 0);

    setReport({
        drawsCount: relevantDraws.length,
        ticketsCount: relevantTickets.length,
        totalRevenue,
        totalPayout,
        totalHouseShare,
        netProfit: totalHouseShare - totalPayout, 
        finalBalance: totalRevenue - totalPayout,
    });
  };

  const handleExportCSV = () => {
    alert('Funcionalidade de exportar CSV a ser implementada.');
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Relatórios do Bingo</h1>
      </div>

      <Card className="max-w-4xl mx-auto">
          <CardHeader>
              <CardTitle>Gerar Relatório Financeiro</CardTitle>
              <CardDescription>Selecione um período para visualizar os dados consolidados do Bingo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4 items-end">
                  <div className="grid gap-2">
                      <Label htmlFor="start-date">Data de Início</Label>
                      <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                      <Label htmlFor="end-date">Data de Fim</Label>
                      <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                  <Button onClick={handleGenerateReport}>Gerar Relatório</Button>
              </div>

              {report && (
                  <>
                      <Separator />
                      <div>
                          <h3 className="text-lg font-medium mb-4">Resultados para o período de {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <StatCard title="Sorteios Finalizados" value={report.drawsCount.toString()} />
                              <StatCard title="Cartelas Vendidas" value={report.ticketsCount.toString()} />
                              <StatCard title="Receita Total" value={`R$ ${report.totalRevenue.toFixed(2).replace('.', ',')}`} />
                              <StatCard title="Prêmios Pagos" value={`R$ ${report.totalPayout.toFixed(2).replace('.', ',')}`} />
                              <StatCard title="Comissão da Banca" value={`R$ ${report.totalHouseShare.toFixed(2).replace('.', ',')}`} />
                              <StatCard title="Balanço (Receita - Prêmios)" value={`R$ ${report.finalBalance.toFixed(2).replace('.', ',')}`} isPositive={report.finalBalance >= 0} />
                          </div>
                      </div>
                  </>
              )}
          </CardContent>
          {report && (
              <CardFooter>
                  <Button variant="secondary" onClick={handleExportCSV} disabled>Exportar para CSV (Em breve)</Button>
              </CardFooter>
          )}
      </Card>
    </main>
  );
}

const StatCard = ({ title, value, isPositive }: { title: string, value: string, isPositive?: boolean}) => (
  <div className="p-4 rounded-lg border bg-card text-card-foreground">
    <p className="text-sm text-muted-foreground">{title}</p>
    <p className={`text-2xl font-bold ${isPositive === undefined ? '' : isPositive ? 'text-green-500' : 'text-red-500'}`}>{value}</p>
  </div>
);
