'use client';

import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/utils/currency";
import { cn } from "@/lib/utils";

interface Props {
  totalValue: number;
  count: number;
  label: string;
}

export function ReportKpis({ totalValue, count, label }: Props) {
  const avg = count > 0 ? totalValue / count : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-slate-900 border-white/5">
        <CardContent className="pt-6">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Total no Período</p>
          <p className="text-3xl font-black text-primary italic">{formatBRL(totalValue)}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-white/5">
        <CardContent className="pt-6">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Quantidade</p>
          <p className="text-3xl font-black text-white italic">{count}</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-white/5">
        <CardContent className="pt-6">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Ticket Médio</p>
          <p className="text-3xl font-black text-blue-400 italic">{formatBRL(avg)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
