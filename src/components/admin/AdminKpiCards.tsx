'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Award, Percent, Wallet, Gift } from "lucide-react";
import { SystemTotals } from "@/utils/systemTotals";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  isProfit?: boolean;
  colorClass?: string;
}

const KpiCard = ({ title, value, icon: Icon, isProfit, colorClass }: KpiCardProps) => (
  <Card className="border-white/5 bg-gradient-to-br from-secondary/50 to-background/50 overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
      <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className={cn("h-4 w-4", colorClass || "text-muted-foreground")} />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className={cn(
        "text-lg md:text-xl font-black tabular-nums tracking-tighter",
        isProfit && (value >= 0 ? "text-green-500" : "text-red-500")
      )}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </div>
    </CardContent>
  </Card>
);

export function AdminKpiCards({ totals }: { totals: SystemTotals }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      <KpiCard 
        title="Total Apostado" 
        value={totals.totalApostado} 
        icon={DollarSign} 
        colorClass="text-amber-400"
      />
      <KpiCard 
        title="Lucro da Banca" 
        value={totals.lucroBanca} 
        icon={TrendingUp} 
        isProfit 
      />
      <KpiCard 
        title="Total Prêmios" 
        value={totals.totalPremios} 
        icon={Award} 
        colorClass="text-green-400"
      />
      <KpiCard 
        title="Total Comissões" 
        value={totals.totalComissoes} 
        icon={Percent} 
        colorClass="text-blue-400"
      />
      <KpiCard 
        title="Saldo Usuários" 
        value={totals.saldoUsuarios} 
        icon={Wallet} 
        colorClass="text-purple-400"
      />
      <KpiCard 
        title="Saldo Bônus" 
        value={totals.saldoBonus} 
        icon={Gift} 
        colorClass="text-pink-400"
      />
    </div>
  );
}
