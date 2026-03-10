/**
 * @fileOverview Resumo estatístico do Sportsbook.
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Radio, Goal, Calendar, Trophy, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsProps {
  stats: {
    live: number;
    bettable: number;
    total: number;
    leagues: number;
    noOdds: number;
  }
}

export function FootballDashboardStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatItem label="Ao Vivo" value={stats.live} icon={Radio} color="text-red-500" />
      <StatItem label="Apostáveis" value={stats.bettable} icon={Goal} color="text-green-400" />
      <StatItem label="Próximos" value={stats.total - stats.live} icon={Calendar} color="text-primary" />
      <StatItem label="Ligas Ativas" value={stats.leagues} icon={Trophy} color="text-blue-400" />
      <StatItem label="Sem Odds" value={stats.noOdds} icon={Info} color="text-slate-500" />
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-2xl overflow-hidden group">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 bg-white/5 rounded-xl transition-colors group-hover:bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest truncate">{label}</p>
          <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
