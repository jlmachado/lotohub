/**
 * @fileOverview Card de monitoramento de saúde dos provedores de dados.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Globe, Zap, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderStatusProps {
  name: string;
  status: 'online' | 'offline' | 'error' | 'syncing';
  lastResponse?: string;
  latency?: string;
  eventsCount?: number;
  icon: any;
}

export function ProviderStatusCard({ name, status, lastResponse, latency, eventsCount, icon: Icon }: ProviderStatusProps) {
  const statusConfig = {
    online: { label: 'Conectado', color: 'bg-green-600', text: 'text-green-500' },
    offline: { label: 'Indisponível', color: 'bg-red-600', text: 'text-red-500' },
    error: { label: 'Falha Técnica', color: 'bg-amber-600', text: 'text-amber-500' },
    syncing: { label: 'Sincronizando', color: 'bg-blue-600', text: 'text-blue-500' },
  };

  const cfg = statusConfig[status];

  return (
    <Card className="bg-slate-900 border-white/5 overflow-hidden">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/5 rounded-lg">
            <Icon size={16} className={cfg.text} />
          </div>
          <CardTitle className="text-xs font-black uppercase tracking-widest text-white">{name}</CardTitle>
        </div>
        <Badge className={cn("text-[8px] uppercase font-black italic", cfg.color)}>
          {cfg.label}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex justify-between text-[10px] font-bold uppercase">
          <span className="text-muted-foreground">Último Sync:</span>
          <span className="text-white">{lastResponse || 'Agora'}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase">
          <span className="text-muted-foreground">Eventos Ativos:</span>
          <span className="text-primary">{eventsCount || 0}</span>
        </div>
        {latency && (
          <div className="flex justify-between text-[10px] font-bold uppercase">
            <span className="text-muted-foreground">Latência:</span>
            <span className="text-green-400">{latency}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
