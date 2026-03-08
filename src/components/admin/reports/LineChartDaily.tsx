'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBRL } from '@/utils/currency';

interface ChartData {
  date: string;
  label: string;
  total: number;
  count: number;
}

interface Props {
  data: ChartData[];
  title: string;
  description?: string;
  color?: string;
  valuePrefix?: string;
}

export function LineChartDaily({ 
  data, 
  title, 
  description, 
  color = "#fbbf24", // Primary Amber
  valuePrefix = "R$ " 
}: Props) {
  
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const total = data.reduce((acc, curr) => acc + curr.total, 0);
    const avg = total / data.length;
    const best = Math.max(...data.map(d => d.total));
    return { total, avg, best };
  }, [data]);

  if (data.length === 0) {
    return (
      <Card className="bg-card border-white/5 h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground italic">Nenhum dado disponível para o gráfico.</p>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-white/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-white">
              {title}
            </CardTitle>
            {description && <CardDescription className="text-[10px] uppercase font-bold">{description}</CardDescription>}
          </div>
          {stats && (
            <div className="text-right">
              <p className="text-[9px] uppercase font-black text-muted-foreground">Média Diária</p>
              <p className="text-sm font-black text-primary">{formatBRL(stats.avg)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[220px] md:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                tickFormatter={(value) => `${valuePrefix}${value > 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                itemStyle={{ color: color }}
                formatter={(value: number) => [formatBRL(value), 'Total']}
                labelStyle={{ color: '#fff', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke={color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
