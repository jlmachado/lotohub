'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { getActiveContext } from '@/utils/bancaContext';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { ReportKpis } from '@/components/admin/reports/ReportKpis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { downloadCSV } from '@/utils/csvUtils';
import { loadReportFilters, saveReportFilters, clearReportFilters, QuickRange } from '@/utils/reportFiltersStorage';

export default function RelatorioDepositosPage() {
  const { depositos } = useAppContext();
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
      const saved = loadReportFilters(context, "depositos");
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
      saveReportFilters(context, "depositos", { 
        dateStart, 
        dateEnd, 
        searchTerm, 
        quickRange 
      });
    }
  }, [dateStart, dateEnd, searchTerm, quickRange, isRestoring, context]);

  const filtered = useMemo(() => {
    if (isRestoring) return [];

    let records = (depositos || []).map((d, i) => ({
      id: `dep-${i}`,
      at: d.data,
      terminal: d.terminal || '-',
      nome: d.nome || 'Usuário',
      valor: typeof d.valor === 'string' ? parseFloat(d.valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) : d.valor,
      status: d.status,
      bancaId: d.bancaId || 'default'
    }));

    if (context?.mode === 'BANCA') {
      records = records.filter(r => r.bancaId === context.bancaId);
    }

    // Nota: Filtro de data simplificado aqui por causa do formato pt-BR no mock de depositos
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      records = records.filter(r => 
        r.terminal.toLowerCase().includes(lower) || 
        r.nome.toLowerCase().includes(lower)
      );
    }

    return records;
  }, [depositos, context, searchTerm, isRestoring]);

  const totalValue = filtered.filter(r => r.status === 'Concluído').reduce((acc, r) => acc + r.valor, 0);

  const handleClear = () => {
    if (context) clearReportFilters(context, "depositos");
    handleDefaultRange();
    setSearchTerm('');
  };

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-6">Relatório de Depósitos</h1>
      
      <ReportKpis totalValue={totalValue} count={filtered.length} label="Depósitos" />
      
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
                  <Badge variant={r.status === 'Concluído' ? 'default' : 'secondary'} className="text-[9px] uppercase">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-black text-white">{formatBRL(r.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}