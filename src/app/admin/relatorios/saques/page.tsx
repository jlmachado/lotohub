'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { AdminContextBar } from '@/components/admin/AdminContextBar';
import { useAppContext } from '@/context/AppContext';
import { getActiveContext } from '@/utils/bancaContext';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { ReportKpis } from '@/components/admin/reports/ReportKpis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { loadReportFilters, saveReportFilters, clearReportFilters, QuickRange } from '@/utils/reportFiltersStorage';

export default function RelatorioSaquesPage() {
  const { saques } = useAppContext();
  const context = getActiveContext();

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickRange, setQuickRange] = useState<QuickRange>(null);
  const [restored, setRestored] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Carregar filtros salvos no mount
  useEffect(() => {
    if (context) {
      const saved = loadReportFilters(context, "saques");
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
      saveReportFilters(context, "saques", { 
        dateStart, 
        dateEnd, 
        searchTerm, 
        quickRange 
      });
    }
  }, [dateStart, dateEnd, searchTerm, quickRange, isRestoring, context]);

  const filtered = useMemo(() => {
    if (isRestoring) return [];

    let records = (saques || []).map((s, i) => ({
      id: `saq-${i}`,
      at: s.data,
      terminal: s.terminal || '-',
      nome: s.nome || 'Usuário',
      valor: typeof s.valor === 'string' ? parseFloat(s.valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) : s.valor,
      status: s.status,
      bancaId: s.bancaId || 'default'
    }));

    if (context?.mode === 'BANCA') {
      records = records.filter(r => r.bancaId === context.bancaId);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      records = records.filter(r => 
        r.terminal.toLowerCase().includes(lower) || 
        r.nome.toLowerCase().includes(lower)
      );
    }

    return records;
  }, [saques, context, searchTerm, isRestoring]);

  const totalValue = filtered.filter(r => r.status === 'Concluído').reduce((acc, r) => acc + r.valor, 0);

  const handleClear = () => {
    if (context) clearReportFilters(context, "saques");
    handleDefaultRange();
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminContextBar />
      <Header />
      <main className="p-4 md:p-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Relatório de Saques</h1>
        
        <ReportKpis totalValue={totalValue} count={filtered.length} label="Saques" />
        
        <ReportFilters 
          dateStart={dateStart}
          dateEnd={dateEnd}
          searchTerm={searchTerm}
          activeRange={quickRange}
          onDateStartChange={setDateStart}
          onDateEndChange={setDateEnd}
          onSearchChange={setSearchTerm}
          onQuickRangeChange={(v) => setQuickRange(v)}
          onClear={handleClear}
          onExport={() => {}}
          restored={restored}
        />

        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Terminal</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="border-white/5">
                  <TableCell className="text-[11px] font-medium text-muted-foreground">{r.at}</TableCell>
                  <TableCell className="font-mono font-bold text-white">{r.terminal}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'Concluído' ? 'default' : 'destructive'} className="text-[9px] uppercase">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-red-400">{formatBRL(r.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
