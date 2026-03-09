/**
 * @fileOverview Visualização de Jogos Sincronizados (TheSportsDB).
 * Substitui o legado de importação manual por uma auditoria do que está ativo.
 */

'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Calendar, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export default function AdminFutebolJogosPage() {
  const { footballData, syncFootballAll } = useAppContext();

  const isSyncing = footballData.syncStatus === 'syncing';

  // Consolidar jogos de hoje e futuros para exibição administrativa
  const allMatches = useMemo(() => {
    return [...footballData.todayMatches, ...footballData.nextMatches]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [footballData.todayMatches, footballData.nextMatches]);

  const getStatusBadge = (status: string) => {
    if (status === 'Match Finished') return <Badge variant="outline" className="text-[8px]">FINALIZADO</Badge>;
    if (status === 'Match Postponed') return <Badge variant="destructive" className="text-[8px]">ADIADO</Badge>;
    return <Badge className="bg-green-600 text-white text-[8px]">AGENDADO</Badge>;
  };

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/futebol">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Jogos Sincronizados</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Auditoria de eventos ativos no sistema</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => syncFootballAll(true)} 
          disabled={isSyncing}
          className="gap-2 font-bold border-white/10"
        >
          {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar Dados
        </Button>
      </div>

      <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
        <CardHeader className="bg-white/5 border-b border-white/5">
          <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
            <Calendar size={16} className="text-primary" /> Log de Partidas Ativas
          </CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold">
            Total de {allMatches.length} partidas carregadas para as ligas monitoradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[9px] uppercase font-black px-4">Data/Hora</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Confronto</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Campeonato</TableHead>
                <TableHead className="text-[9px] uppercase font-black text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">
                    Nenhum jogo carregado no momento. Verifique as configurações de ligas.
                  </TableCell>
                </TableRow>
              ) : (
                allMatches.map((match) => (
                  <TableRow key={match.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white">{match.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className="text-[9px] text-muted-foreground">{match.time?.substring(0,5) || '--:--'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                        <span className="truncate max-w-[100px] text-right">{match.homeTeam}</span>
                        <span className="text-primary italic">vs</span>
                        <span className="truncate max-w-[100px]">{match.awayTeam}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[8px] bg-slate-800 border-0 h-4 uppercase font-black">
                        {match.league}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(match.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
