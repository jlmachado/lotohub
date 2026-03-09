/**
 * @fileOverview Dashboard de Administração de Futebol.
 */

'use client';

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Calendar, Trophy, History, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';

export default function AdminFutebolPage() {
  const { footballData, syncFootballAll } = useAppContext();

  const isSyncing = footballData.syncStatus === 'syncing';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Futebol</h1>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de Dados via TheSportsDB</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => syncFootballAll(true)} 
              disabled={isSyncing}
              className="h-11 rounded-xl font-bold border-white/10"
            >
              {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Tudo
            </Button>
            <Link href="/admin/futebol/configuracoes">
              <Button className="h-11 rounded-xl font-black uppercase lux-shine px-6">
                Configurar Ligas
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Provider Ativo</CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white italic">TheSportsDB</div>
              <Badge variant="outline" className="mt-1 border-primary/20 text-primary uppercase font-black text-[9px]">FREE PLAN (123)</Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Jogos Carregados</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white italic">
                {footballData.todayMatches.length + footballData.nextMatches.length}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Hoje + Futuros</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Tabelas Ativas</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white italic">
                {new Set(footballData.standings.map(s => s.leagueId)).size}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Ligas com Classificação</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Último Sync</CardTitle>
              <History className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-black text-white font-mono">
                {footballData.lastSuccessfulSync ? new Date(footballData.lastSuccessfulSync).toLocaleString('pt-BR') : 'Nunca'}
              </div>
              <Badge 
                variant={footballData.syncStatus === 'error' ? 'destructive' : 'secondary'} 
                className="mt-1 text-[8px] uppercase font-black"
              >
                STATUS: {footballData.syncStatus}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/5 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Resumo Operacional</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Status detalhado das competições monitoradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {footballData.leagues.filter(l => l.importar).length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground italic text-sm">Nenhum campeonato ativo para monitoramento.</p>
                <Link href="/admin/futebol/configuracoes">
                  <Button variant="link" className="text-primary text-xs mt-2 uppercase font-black">Ativar Ligas Brasileiras</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {footballData.leagues.filter(l => l.importar).map(league => {
                  const matchesCount = footballData.todayMatches.filter(m => m.idLeague === league.id).length;
                  const futureCount = footballData.nextMatches.filter(m => m.idLeague === league.id).length;
                  return (
                    <div key={league.id} className="p-4 rounded-xl bg-slate-950 border border-white/5 flex items-center gap-4">
                      <img src={league.badge} alt="" className="w-10 h-10 object-contain" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs truncate">{league.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] h-4 border-white/10">{matchesCount} HOJE</Badge>
                          <Badge variant="outline" className="text-[8px] h-4 border-white/10">{futureCount} FUTUROS</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/5 p-4 flex justify-between">
            <p className="text-[10px] text-muted-foreground font-bold uppercase italic">Dados sincronizados em tempo real</p>
            <Link href="/futebol">
              <Button variant="link" className="text-primary h-auto p-0 text-[10px] font-black uppercase">Ver Dashboard Pública</Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
