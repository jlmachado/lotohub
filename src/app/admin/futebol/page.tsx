/**
 * @fileOverview Dashboard de Administração de Futebol (ESPN API v2).
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldCheck, Calendar, Trophy, History, AlertCircle, Settings, Globe } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { useMemo } from 'react';

export default function AdminFutebolPage() {
  const { footballData, syncFootballAll } = useAppContext();

  const isSyncing = footballData.syncStatus === 'syncing';

  const stats = useMemo(() => {
    const activeLeagues = footballData.leagues.filter(l => l.active);
    const liveMatches = footballData.matches.filter(m => m.status === 'LIVE').length;
    const scheduledMatches = footballData.matches.filter(m => m.status === 'SCHEDULED').length;
    
    return {
      activeLeaguesCount: activeLeagues.length,
      totalMatches: footballData.matches.length,
      liveMatches,
      scheduledMatches,
      lastSyncTime: footballData.lastSync ? new Date(footballData.lastSync).toLocaleTimeString('pt-BR') : 'Pendente'
    };
  }, [footballData]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Administração Futebol</h1>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">Conectado ao Proxy ESPN Site API</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => syncFootballAll(true)} 
              disabled={isSyncing}
              className="h-11 rounded-xl font-bold border-white/10"
            >
              {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Ligas Ativas
            </Button>
            <Link href="/admin/futebol/ligas">
              <Button className="h-11 rounded-xl font-black uppercase lux-shine px-6">
                <Settings className="mr-2 h-4 w-4" /> Gerenciar Ligas
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Proxy Status</CardTitle>
              <Globe className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-white italic">ESPN API v2</div>
              <Badge variant="outline" className="mt-1 border-blue-500/20 text-blue-400 uppercase font-black text-[9px]">Sincronização Ativa</Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Ligas Ativas</CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white italic">
                {stats.activeLeaguesCount}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Monitoramento ESPN</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Partidas</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white italic">
                {stats.totalMatches}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{stats.liveMatches} Ao Vivo / {stats.scheduledMatches} Agendados</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Último Sync</CardTitle>
              <History className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-black text-white font-mono">
                {stats.lastSyncTime}
              </div>
              <Badge 
                variant={footballData.syncStatus === 'error' ? 'destructive' : 'secondary'} 
                className="mt-1 text-[8px] uppercase font-black"
              >
                STATUS: {footballData.syncStatus.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/5 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Status das Competições Monitoradas</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Ligas sincronizadas via Site API ESPN.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.activeLeaguesCount === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground italic text-sm">Nenhuma liga ativada para monitoramento.</p>
                <Link href="/admin/futebol/ligas">
                  <Button variant="link" className="text-primary text-xs mt-2 uppercase font-black">Configurar Ligas</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {footballData.leagues.filter(l => l.active).map(league => {
                  const leagueMatches = footballData.matches.filter(m => m.leagueSlug === league.slug);
                  const todayCount = leagueMatches.filter(m => m.status === 'LIVE' || m.status === 'SCHEDULED').length;
                  const hasTable = !!footballData.standings[league.slug];
                  
                  return (
                    <div key={league.id} className="p-4 rounded-xl bg-slate-950 border border-white/5 flex items-center gap-4 group hover:border-primary/20 transition-colors">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                        <Trophy size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs truncate uppercase tracking-tighter">{league.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase">{todayCount} JOGOS</Badge>
                          {hasTable && <Badge className="text-[8px] h-4 bg-green-600/20 text-green-500 border-0 uppercase">TABELA OK</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/5 p-4 flex justify-between">
            <p className="text-[10px] text-muted-foreground font-bold uppercase italic">Dados: ESPN Real-Time API v2</p>
            <Link href="/admin/futebol/jogos">
              <Button variant="link" className="text-primary h-auto p-0 text-[10px] font-black uppercase">Ver Log de Partidas</Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
