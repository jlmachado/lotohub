'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { AdminContextBar } from '@/components/admin/AdminContextBar';
import { useAppContext } from '@/context/AppContext';
import { normalizePayouts } from '@/utils/normalizeRecords';
import { getActiveContext } from '@/utils/bancaContext';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { ReportKpis } from '@/components/admin/reports/ReportKpis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { downloadCSV } from '@/utils/csvUtils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChartDaily } from '@/components/admin/reports/LineChartDaily';
import { loadReportFilters, saveReportFilters, clearReportFilters, QuickRange } from '@/utils/reportFiltersStorage';

export default function RelatorioPremiosPage() {
  const { apostas, bingoDraws, snookerFinancialHistory } = useAppContext();
  const context = getActiveContext();

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickRange, setQuickRange] = useState<QuickRange>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [restored, setRestored] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const itemsPerPage = 20;

  // Carregar filtros salvos no mount
  useEffect(() => {
    if (context) {
      const saved = loadReportFilters(context, "premios");
      if (saved) {
        setDateStart(saved.dateStart);
        setDateEnd(saved.dateEnd);
        setSearchTerm(saved.searchTerm);
        setQuickRange(saved.quickRange);
        setRestored(true);
        setTimeout(() => setRestored(false), 3000);
      } else {
        handleDefaultRange();
      }
      setIsRestoring(false);
    }
  }, [context]);

  const handleDefaultRange = () => {
    const d = new Date();
    const end = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 6);
    const start = d.toISOString().split('T')[0];
    setDateStart(start);
    setDateEnd(end);
    setQuickRange('7days');
  };

  // Salvar filtros quando mudarem
  useEffect(() => {
    if (!isRestoring && context) {
      saveReportFilters(context, "premios", { 
        dateStart, 
        dateEnd, 
        searchTerm, 
        quickRange 
      });
    }
  }, [dateStart, dateEnd, searchTerm, quickRange, isRestoring, context]);

  const filtered = useMemo(() => {
    if (isRestoring) return [];

    let records = normalizePayouts(apostas, bingoDraws, snookerFinancialHistory);

    if (context?.mode === 'BANCA') {
      records = records.filter(r => r.bancaId === context.bancaId);
    }

    if (dateStart && dateEnd) {
      const start = new Date(dateStart + 'T00:00:00').getTime();
      const end = new Date(dateEnd + 'T23:59:59').getTime();
      records = records.filter(r => {
        const time = new Date(r.at).getTime();
        return time >= start && time <= end;
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      records = records.filter(r => 
        r.terminal.toLowerCase().includes(lower) || 
        r.nome.toLowerCase().includes(lower)
      );
    }

    return records;
  }, [apostas, bingoDraws, snookerFinancialHistory, context, dateStart, dateEnd, searchTerm, isRestoring]);

  // Dados para o Gráfico
  const chartData = useMemo(() => {
    if (isRestoring || !dateStart || !dateEnd) return [];

    const groups: Record<string, { total: number; count: number }> = {};
    
    let current = new Date(dateStart + 'T00:00:00');
    const end = new Date(dateEnd + 'T23:59:59');
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      groups[key] = { total: 0, count: 0 };
      current.setDate(current.getDate() + 1);
    }

    filtered.forEach(r => {
      const key = new Date(r.at).toISOString().split('T')[0];
      if (groups[key]) {
        groups[key].total += r.valor;
        groups[key].count += 1;
      }
    });

    return Object.entries(groups).map(([date, val]) => ({
      date,
      label: date.split('-').reverse().slice(0, 2).join('/'),
      total: val.total,
      count: val.count
    })).sort((a,b) => a.date.localeCompare(b.date));
  }, [filtered, dateStart, dateEnd, isRestoring]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalValue = filtered.reduce((acc, r) => acc + r.valor, 0);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleExport = () => {
    downloadCSV(
      `relatorio_premios_${context?.subdomain || 'global'}_${new Date().toISOString().split('T')[0]}.csv`,
      filtered.map(r => ({
        Data: new Date(r.at).toLocaleString('pt-BR'),
        Terminal: r.terminal,
        Usuário: r.nome,
        Módulo: r.modulo,
        Descrição: r.descricao,
        ValorPago: r.valor.toFixed(2)
      })),
      ['Data', 'Terminal', 'Usuário', 'Módulo', 'Descrição', 'ValorPago']
    );
  };

  const handleClear = () => {
    if (context) clearReportFilters(context, "premios");
    handleDefaultRange();
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminContextBar />
      <Header />
      <main className="p-4 md:p-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Relatório de Prêmios Pagos</h1>
        
        <ReportKpis totalValue={totalValue} count={filtered.length} label="Prêmios" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-4">
            <ReportFilters 
              dateStart={dateStart}
              dateEnd={dateEnd}
              searchTerm={searchTerm}
              activeRange={quickRange}
              onDateStartChange={(v) => { setDateStart(v); setCurrentPage(1); }}
              onDateEndChange={(v) => { setDateEnd(v); setCurrentPage(1); }}
              onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
              onQuickRangeChange={(v) => setQuickRange(v)}
              onClear={handleClear}
              onExport={handleExport}
              restored={restored}
            />
          </div>
          <div className="lg:col-span-8">
            <LineChartDaily 
              data={chartData} 
              title="Prêmios Pagos Diários" 
              description="Evolução financeira dos prêmios no período"
              color="#10b981" // Green for prizes/payouts
            />
          </div>
        </div>

        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Terminal</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Módulo</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Prêmio Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Nenhum prêmio encontrado no período.</TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="text-[11px] font-medium text-muted-foreground">{new Date(r.at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="font-mono font-bold text-green-400">{r.terminal}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px] uppercase bg-green-500/10 text-green-400 border-green-500/20">{r.modulo}</Badge></TableCell>
                    <TableCell className="text-xs font-bold text-white">{r.descricao}</TableCell>
                    <TableCell className="text-right font-black text-green-400">{formatBRL(r.valor)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="p-4 flex items-center justify-between border-t border-white/5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Página {currentPage} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 border-white/10"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 border-white/10"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
