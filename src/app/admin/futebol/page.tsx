/**
 * @fileOverview Painel Principal do Módulo de Futebol (Sportsbook Admin).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Goal, Radio, Trophy, ShieldAlert, TrendingUp, 
  Database, Globe, Zap, Settings, RefreshCw,
  FileBarChart, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { formatBRL } from '@/utils/currency';
import { ProviderStatusCard } from '@/components/admin/betting/ProviderStatusCard';

export default function AdminFutebolDashboardPage() {
  const { footballData, footballBets, syncFootballAll } = useAppContext();

  const stats = useMemo(() => {
    const activeLeagues = footballData.leagues.filter(l => l.active).length;
    const openBets = footballBets.filter(b => b.status === 'OPEN');
    const totalStaked = openBets.reduce((acc, b) => acc + b.stake, 0);
    const totalLiability = openBets.reduce((acc, b) => acc + b.potentialWin, 0);

    return {
      activeLeagues,
      openBetsCount: openBets.length,
      totalStaked,
      totalLiability,
      liveMatches: footballData.unifiedMatches.filter(m => m.isLive).length
    };
  }, [footballData, footballBets]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Dashboard Futebol</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Visão macro do motor de apostas e dados</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => syncFootballAll(true)}
            disabled={footballData.syncStatus === 'syncing'}
            className="h-11 rounded-xl font-bold border-white/10"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Global
          </Button>
          <Link href="/admin/futebol/ligas">
            <Button className="h-11 rounded-xl font-black uppercase italic lux-shine px-6">
              <Settings className="mr-2 h-4 w-4" /> Configurar Ligas
            </Button>
          </Link>
        </div>
      </div>

      {/* PROVIDER STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProviderStatusCard 
          name="ESPN SITE API" 
          status={footballData.syncStatus === 'syncing' ? 'syncing' : (footballData.matches.length > 0 ? 'online' : 'error')}
          eventsCount={footballData.matches.length}
          icon={Globe}
        />
        <ProviderStatusCard 
          name="LIVE SCORE API" 
          status="online"
          eventsCount={footballData.unifiedMatches.filter(m => m.hasOdds).length}
          icon={Zap}
          latency="142ms"
        />
        <ProviderStatusCard 
          name="BETTING ENGINE" 
          status="online"
          eventsCount={stats.openBetsCount}
          icon={Database}
        />
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBox title="Volume Aberto" value={formatBRL(stats.totalStaked)} color="text-primary" sub="Total em jogo" />
        <KpiBox title="Responsabilidade" value={formatBRL(stats.totalLiability)} color="text-red-500" sub="Risco de pagamento" />
        <KpiBox title="Ao Vivo Agora" value={stats.liveMatches} color="text-blue-400" sub="Partidas monitoradas" />
        <KpiBox title="Bilhetes Abertos" value={stats.openBetsCount} color="text-green-400" sub="Futebol Sportsbook" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-white/5 bg-slate-900/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Gestão Operacional</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Atalhos de controle do sistema</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <QuickLink href="/admin/futebol/mercados" icon={Trophy} label="Mercados" desc="Habilitar mercados" />
            <QuickLink href="/admin/futebol/limites" icon={ShieldCheck} label="Limites" desc="Risco e Stakes" />
            <QuickLink href="/admin/futebol/risco" icon={TrendingUp} label="Risco" desc="Exposição total" />
            <QuickLink href="/admin/futebol/apostas" icon={FileBarChart} label="Auditoria" desc="Logs de apostas" />
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden">
          <CardHeader className="bg-slate-950/50 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Status das Ligas Ativas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {footballData.leagues.filter(l => l.active).slice(0, 5).map(league => (
                <div key={league.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Goal size={16} className="text-primary" />
                    <span className="text-xs font-black uppercase italic text-white">{league.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[8px] h-4 bg-green-600/20 text-green-500 uppercase font-black">Sync OK</Badge>
                    <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase font-black">ODDS OK</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-4 bg-slate-950/50">
            <Link href="/admin/futebol/ligas" className="text-[9px] font-black uppercase text-primary hover:underline italic">Ver Catálogo Completo →</Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function KpiBox({ title, value, color, sub }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-inner">
      <CardContent className="p-4">
        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
        <p className={cn("text-2xl font-black italic tracking-tighter tabular-nums", color)}>{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/50 uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label, desc }: any) {
  return (
    <Link href={href}>
      <div className="p-4 rounded-xl bg-black/30 border border-white/5 hover:border-primary/30 transition-all group flex flex-col gap-2">
        <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
        <div>
          <p className="text-xs font-black text-white uppercase italic">{label}</p>
          <p className="text-[9px] text-muted-foreground font-bold uppercase">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
