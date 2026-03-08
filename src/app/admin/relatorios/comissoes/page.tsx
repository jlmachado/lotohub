'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { AdminContextBar } from '@/components/admin/AdminContextBar';
import { useAppContext } from '@/context/AppContext';
import { getActiveContext } from '@/utils/bancaContext';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { ReportKpis } from '@/components/admin/reports/ReportKpis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBRL } from '@/utils/currency';
import { downloadCSV } from '@/utils/csvUtils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadReportFilters, saveReportFilters, clearReportFilters, QuickRange } from '@/utils/reportFiltersStorage';

export default function RelatorioComissoesPage() {
  const { bingoDraws, snookerFinancialHistory } = useAppContext();
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
      const saved = loadReportFilters(context, "comissoes");
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
      saveReportFilters(context, "comissoes", { 
        dateStart, 
        dateEnd, 
        searchTerm, 
        quickRange 
      });
    }
  }, [dateStart, dateEnd, searchTerm, quickRange, isRestoring, context]);

  const filtered = useMemo(() => {
    if (isRestoring) return [];

    const comms: any[] = [];

    // Bingo Commissions
    bingoDraws.forEach(d => {
      comms.push({
        id: `c-bin-${d.id}`,
        at: d.finishedAt || d.updatedAt,
        modulo: 'BINGO',
        descricao: `Sorteio #${d.drawNumber}`,
        valor: d.totalRevenue * (d.housePercent / 100),
        bancaId: d.bancaId
      });
    });

    // Snooker Commissions
    snookerFinancialHistory.forEach(h => {
      comms.push({
        id: `c-sno-${h.id}`,
        at: h.settledAt,
        modulo: 'SINUCA',
        descricao: h.channelTitle,
        valor: Math.max(0, h.houseProfit),
        bancaId: 'default'
      });
    });

    let records = comms.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

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

    return records;
  }, [bingoDraws, snookerFinancialHistory, context, dateStart, dateEnd, isRestoring]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalValue = filtered.reduce((acc, r) => acc + r.valor, 0);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleExport = () => {
    downloadCSV(
      `relatorio_comissoes_${context?.subdomain || 'global'}_${new Date().toISOString().split('T')[0]}.csv`,
      filtered.map(r => ({
        Data: new Date(r.at).toLocaleString('pt-BR'),
        Módulo: r.modulo,
        Descrição: r.descricao,
        Comissão: r.valor.toFixed(2)
      })),
      ['Data', 'Módulo', 'Descrição', 'Comissão']
    );
  };

  const handleClear = () => {
    if (context) clearReportFilters(context, "comissoes");
    handleDefaultRange();
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminContextBar />
      <Header />
      <main className="p-4 md:p-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Relatório de Comissões (House Share)</h1>
        
        <ReportKpis totalValue={totalValue} count={filtered.length} label="Comissões" />
        
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

        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Módulo</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">Nenhuma comissão encontrada no período.</TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow key={r.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-[11px] font-medium text-muted-foreground">{new Date(r.at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-xs font-bold text-blue-400">{r.modulo}</TableCell>
                    <TableCell className="text-xs font-bold text-white">{r.descricao}</TableCell>
                    <TableCell className="text-right font-black text-blue-400">{formatBRL(r.valor)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
