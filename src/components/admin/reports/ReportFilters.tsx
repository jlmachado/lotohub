'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Download, CalendarDays, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  dateStart: string;
  dateEnd: string;
  searchTerm: string;
  activeRange?: string | null;
  onDateStartChange: (v: string) => void;
  onDateEndChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onQuickRangeChange?: (v: any) => void;
  onClear: () => void;
  onExport: () => void;
  restored?: boolean;
}

export function ReportFilters({
  dateStart,
  dateEnd,
  searchTerm,
  activeRange,
  onDateStartChange,
  onDateEndChange,
  onSearchChange,
  onQuickRangeChange,
  onClear,
  onExport,
  restored
}: Props) {
  
  const handleQuickRange = (range: 'today' | 'yesterday' | '7days' | '30days' | 'month') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case '7days':
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case '30days':
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    onDateStartChange(start.toISOString().split('T')[0]);
    onDateEndChange(end.toISOString().split('T')[0]);
    if (onQuickRangeChange) onQuickRangeChange(range);
  };

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-4 md:p-6 mb-6 relative overflow-hidden">
      {restored && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600/90 text-white text-[10px] font-black uppercase text-center py-1 animate-in slide-in-from-top duration-300 z-10">
          <History className="inline-block h-3 w-3 mr-1" /> Filtros restaurados do último acesso
        </div>
      )}

      <div className={cn("flex flex-wrap gap-2 mb-6", restored ? "mt-4" : "mt-0")}>
        {[
          { label: 'Hoje', val: 'today' },
          { label: 'Ontem', val: 'yesterday' },
          { label: '7 Dias', val: '7days' },
          { label: '30 Dias', val: '30days' },
          { label: 'Mês Atual', val: 'month' },
        ].map((range) => (
          <Button
            key={range.val}
            variant={activeRange === range.val ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickRange(range.val as any)}
            className={cn(
              "h-8 text-[10px] uppercase font-black tracking-widest border-white/5 bg-slate-900/50 hover:bg-primary hover:text-black transition-all",
              activeRange === range.val && "bg-primary text-black border-primary"
            )}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Início</Label>
          <div className="relative">
            <Input 
              type="date" 
              value={dateStart} 
              onChange={(e) => {
                onDateStartChange(e.target.value);
                if (onQuickRangeChange) onQuickRangeChange(null);
              }}
              className="bg-slate-950 border-white/10 h-11"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fim</Label>
          <Input 
            type="date" 
            value={dateEnd} 
            onChange={(e) => {
              onDateEndChange(e.target.value);
              if (onQuickRangeChange) onQuickRangeChange(null);
            }}
            className="bg-slate-950 border-white/10 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca (Terminal/Nome)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Ex: 10001..." 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-slate-950 border-white/10 h-11"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClear} title="Resetar para o padrão" className="flex-1 h-11 border-white/10">
            <RotateCcw className="mr-2 h-4 w-4" /> Resetar
          </Button>
          <Button onClick={onExport} className="flex-1 h-11 bg-green-600 hover:bg-green-700 font-bold uppercase italic text-xs">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>
    </div>
  );
}
