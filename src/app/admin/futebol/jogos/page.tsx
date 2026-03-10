/**
 * @fileOverview Visualização de Jogos Sincronizados via ESPN API.
 */

'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Calendar, RefreshCw, Radio } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function AdminFutebolJogosPage() {
  const { footballData, syncFootballAll } = useAppContext();

  const isSyncing = footballData.syncStatus === 'syncing';

  const allMatches = useMemo(() => {
    return [...footballData.matches]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [footballData.matches]);

  const getStatusBadge = (status: string, detail: string) => {
    if (status === 'FINISHED') return <Badge variant="outline" className="text-[8px] uppercase">FINALIZADO</Badge>;
    if (status === 'LIVE') return <Badge className="bg-red-600 text-white text-[8px] animate-pulse uppercase">AO VIVO</Badge>;
    if (status === 'POSTPONED') return <Badge variant="destructive" className="text-[8px] uppercase">ADIADO</Badge>;
    return <Badge className="bg-blue-600 text-white text-[8px] uppercase">AGENDADO</Badge>;
  };

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/futebol">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Log de Partidas (ESPN)</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Auditoria de eventos monitorados em tempo real</p>
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
            <Calendar size={16} className="text-primary" /> Eventos Carregados
          </CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold">
            Total de {allMatches.length} partidas sincronizadas nas ligas ativas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[9px] uppercase font-black px-4">Data/Hora</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Confronto</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Placar</TableHead>
                <TableHead className="text-[9px] uppercase font-black">Competição</TableHead>
                <TableHead className="text-[9px] uppercase font-black text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">
                    Nenhum jogo carregado. Verifique a sincronização em "Gerenciar Ligas".
                  </TableCell>
                </TableRow>
              ) : (
                allMatches.map((match) => (
                  <TableRow key={match.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white">
                          {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(match.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                        <span className="truncate max-w-[100px]">{match.homeTeam.name}</span>
                        <span className="text-primary/50 italic px-1">vs</span>
                        <span className="truncate max-w-[100px]">{match.awayTeam.name}</span>
                        <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-white tabular-nums">
                        {match.homeTeam.score} - {match.awayTeam.score}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[8px] bg-slate-800 border-0 h-4 uppercase font-black">
                        {match.leagueName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(match.status, match.statusDetail)}
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
