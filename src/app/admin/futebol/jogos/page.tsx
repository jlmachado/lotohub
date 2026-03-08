'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useAppContext, FootballMatch } from '@/context/AppContext';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function AdminFutebolJogosPage() {
    const { footballMatches, footballTeams, footballChampionships, deleteFootballMatch, importFootballMatches } = useAppContext();
    const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
    const { toast } = useToast();

    const enrichedMatches = useMemo(() => {
        return footballMatches.map(match => {
            const championship = footballChampionships.find(c => c.apiId === match.championshipApiId);
            const homeTeam = footballTeams.find(t => t.id === match.homeTeamId);
            const awayTeam = footballTeams.find(t => t.id === match.awayTeamId);
            return {
                ...match,
                championshipName: championship?.name || 'Desconhecido',
                homeTeamName: homeTeam?.name || 'Desconhecido',
                awayTeamName: awayTeam?.name || 'Desconhecido',
                homeTeamLogo: homeTeam?.logo,
                awayTeamLogo: awayTeam?.logo,
            }
        }).sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }, [footballMatches, footballTeams, footballChampionships]);

    const handleSelectAll = (checked: boolean | string) => {
        if (checked) {
            setSelectedMatches(enrichedMatches.map(m => m.id));
        } else {
            setSelectedMatches([]);
        }
    };

    const handleSelectMatch = (matchId: string, checked: boolean) => {
        if (checked) {
            setSelectedMatches(prev => [...prev, matchId]);
        } else {
            setSelectedMatches(prev => prev.filter(id => id !== matchId));
        }
    };

  const handleImport = () => {
    importFootballMatches(selectedMatches);
    setSelectedMatches([]);
  };


  const getStatusVariant = (status: FootballMatch['status']) => {
    switch (status) {
      case 'scheduled': return 'secondary';
      case 'finished': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/futebol"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Gerenciar Jogos Importados</h1>
      </div>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Jogos Sincronizados com a API</CardTitle>
                  <CardDescription>Visualize, gerencie ou remova os jogos importados.</CardDescription>
              </div>
              <Button onClick={handleImport} disabled={selectedMatches.length === 0}>
                   <CheckCircle className="mr-2 h-4 w-4" />
                   Importar Selecionados ({selectedMatches.length})
              </Button>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[40px]">
                              <Checkbox
                                  onCheckedChange={handleSelectAll}
                                  checked={selectedMatches.length > 0 && selectedMatches.length === enrichedMatches.length}
                                  aria-label="Selecionar todos"
                              />
                          </TableHead>
                          <TableHead>Jogo</TableHead>
                          <TableHead>Campeonato</TableHead>
                          <TableHead>Data e Hora</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {enrichedMatches.map((match) => (
                          <TableRow key={match.id} data-state={selectedMatches.includes(match.id) ? "selected" : ""}>
                              <TableCell>
                                  <Checkbox
                                      onCheckedChange={(checked) => handleSelectMatch(match.id, !!checked)}
                                      checked={selectedMatches.includes(match.id)}
                                      aria-label={`Selecionar jogo ${match.id}`}
                                  />
                              </TableCell>
                              <TableCell className="font-medium flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                      {match.homeTeamLogo && <Image src={match.homeTeamLogo} alt={match.homeTeamName} width={24} height={24} />}
                                      <span>{match.homeTeamName}</span>
                                  </div>
                                  <span className="text-muted-foreground">vs</span>
                                   <div className="flex items-center gap-2">
                                      {match.awayTeamLogo && <Image src={match.awayTeamLogo} alt={match.awayTeamName} width={24} height={24} />}
                                      <span>{match.awayTeamName}</span>
                                  </div>
                              </TableCell>
                              <TableCell>{match.championshipName}</TableCell>
                              <TableCell>{new Date(match.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                              <TableCell>
                                  <div className="flex flex-col gap-1 items-start">
                                      <Badge variant={getStatusVariant(match.status)}>
                                          {match.status}
                                      </Badge>
                                      {match.isImported ? (
                                          <Badge variant="default" className="bg-green-600/80">Importado</Badge>
                                      ) : (
                                          <Badge variant="destructive">Não Importado</Badge>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                  <Button variant="outline" size="sm" disabled>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Gerenciar
                                  </Button>
                                   <Button variant="destructive" size="sm" onClick={() => deleteFootballMatch(match.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                   </Button>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </main>
  );
}
