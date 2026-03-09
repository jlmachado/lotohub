/**
 * @fileOverview Área Administrativa do Futebol (TheSportsDB V1).
 * Agora com suporte a todas as ligas brasileiras e controle de sincronização.
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, 
  RefreshCw, 
  Trophy, 
  Activity, 
  Search, 
  CheckCircle2, 
  Database,
  Flag,
  Globe
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchBrazilianLeagues } from '@/services/football-sync-service';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateFootballLeagues } = useAppContext();
  const [leagueSearch, setLeagueSearch] = useState('');
  const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);

  const handleSearchLeagues = async () => {
    setIsSearchingLeagues(true);
    try {
      const leagues = await fetchBrazilianLeagues();
      updateFootballLeagues(leagues);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingLeagues(false);
    }
  };

  const toggleLeagueImport = (id: string) => {
    const updated = footballData.leagues.map(l => 
      l.id === id ? { ...l, importar: !l.importar } : l
    );
    updateFootballLeagues(updated);
  };

  const filteredLeagues = useMemo(() => {
    const term = leagueSearch.toLowerCase();
    return footballData.leagues.filter(l => 
      l.name.toLowerCase().includes(term) || 
      l.country.toLowerCase().includes(term)
    );
  }, [footballData.leagues, leagueSearch]);

  const activeCount = footballData.leagues.filter(l => l.importar).length;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central Futebol Brasil</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Provider: TheSportsDB V1</Badge>
            <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
          </div>
        </div>
        <Button 
          onClick={syncFootballAll} 
          disabled={footballData.syncStatus === 'syncing' || activeCount === 0}
          className="lux-shine font-black uppercase"
        >
          {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Sincronizar Ligas ({activeCount})
        </Button>
      </div>

      <Tabs defaultValue="leagues" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="monitor" className="gap-2"><Activity size={14} /> Monitoramento</TabsTrigger>
          <TabsTrigger value="leagues" className="gap-2"><Flag size={14} /> Ligas Brasileiras</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings size={14} /> Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ligas Ativas" value={activeCount} icon={Flag} />
            <StatCard title="Jogos Ativos" value={footballData.todayMatches.length + footballData.nextMatches.length} icon={RefreshCw} />
            <StatCard title="Times na Base" value={footballData.standings.length} icon={Trophy} />
            <StatCard title="Status do Sync" value={footballData.syncStatus.toUpperCase()} icon={Activity} />
          </div>
          
          <Card className="mt-6 border-white/5 bg-card/50">
            <CardHeader><CardTitle>Status Operacional</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex justify-between">
                  <span>Última sincronização global:</span>
                  <span className="font-bold text-white">{footballData.lastSync ? new Date(footballData.lastSync).toLocaleString('pt-BR') : 'Nunca'}</span>
                </p>
                <p className="text-sm text-muted-foreground flex justify-between">
                  <span>Ligas Brasileiras detectadas:</span>
                  <span className="font-bold text-white">{footballData.leagues.length}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leagues" className="pt-6 space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Gestão de Campeonatos Brasileiros</CardTitle>
                <CardDescription>O sistema detecta automaticamente ligas do Brasil na TheSportsDB.</CardDescription>
              </div>
              <Button onClick={handleSearchLeagues} disabled={isSearchingLeagues} variant="outline" size="sm">
                {isSearchingLeagues ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Buscar Ligas do Brasil
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar campeonato..." 
                  className="pl-10 h-10"
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                />
              </div>

              <div className="border border-white/5 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] uppercase font-black">Liga</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">ID</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right">Sincronizar?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeagues.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Nenhuma liga brasileira encontrada. Clique em "Buscar Ligas do Brasil".</TableCell></TableRow>
                    ) : (
                      filteredLeagues.map(l => (
                        <TableRow key={l.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {l.badge && <img src={l.badge} alt="" className="w-6 h-6 object-contain" />}
                              <span className="font-bold text-white">{l.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{l.id}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant={l.importar ? "default" : "outline"} 
                              size="sm"
                              className={l.importar ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground"}
                              onClick={() => toggleLeagueImport(l.id)}
                            >
                              {l.importar ? "Habilitada" : "Desativada"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="pt-6">
          <Card className="max-w-2xl border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle>Configuração do Provider</CardTitle>
              <CardDescription>Conexão direta com TheSportsDB API V1.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Base URL</Label>
                <Input value="https://www.thesportsdb.com/api/v1/json/1" readOnly className="bg-black/40 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">API Key</Label>
                <Input value="1 (Free V1)" readOnly className="bg-black/40 text-white" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StatCard({ title, value, icon: Icon }: any) {
  return (
    <Card className="border-white/5 bg-slate-900/50">
      <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] uppercase font-black text-muted-foreground">{title}</CardTitle>
        <Icon size={14} className="text-primary" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-black text-white italic">{value}</div>
      </CardContent>
    </Card>
  );
}
