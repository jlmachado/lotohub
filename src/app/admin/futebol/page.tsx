'use client';

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Calendar, Trophy, History } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';

export default function AdminFutebolPage() {
  const { footballData, syncFootballMatches, syncFootballStandings } = useAppContext();

  const isSyncing = footballData.syncStatus === 'syncing';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Administração de Futebol</h1>
            <p className="text-muted-foreground">Gerencie os dados e sincronizações do módulo de futebol.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={syncFootballMatches} 
              disabled={isSyncing}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Sincronizar Jogos
            </Button>
            <Button 
              variant="outline" 
              onClick={syncFootballStandings} 
              disabled={isSyncing}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Sincronizar Classificação
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Provider Ativo</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TheSportsDB</div>
              <Badge variant="outline" className="mt-1">FREE PLAN (1)</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jogos Carregados</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{footballData.todayMatches.length + footballData.nextMatches.length}</div>
              <p className="text-xs text-muted-foreground">Série A Brasileirão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Times na Tabela</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{footballData.standings.length}</div>
              <p className="text-xs text-muted-foreground">Classificação persistida</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {footballData.lastSync ? new Date(footballData.lastSync).toLocaleString('pt-BR') : 'Nunca'}
              </div>
              {footballData.syncStatus === 'error' && (
                <p className="text-xs text-destructive flex items-center mt-1">
                  <AlertCircle className="h-3 w-3 mr-1" /> Falha no último sync
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Brasileirão</CardTitle>
            <CardDescription>Visualização dos dados persistidos no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2 shadow-sm">
                  <img src="https://www.thesportsdb.com/images/media/league/badge/72v3vy1521458141.png" alt="Série A" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold">Campeonato Brasileiro Série A</h3>
                  <p className="text-sm text-muted-foreground">League ID: 4351</p>
                </div>
              </div>
              <Link href="/futebol">
                <Button variant="link">Ver Dashboard Pública</Button>
              </Link>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t p-4 justify-between">
            <p className="text-sm text-muted-foreground">Dados fornecidos gratuitamente por thesportsdb.com</p>
            {isSyncing && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
