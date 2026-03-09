/**
 * @fileOverview Área Administrativa do Futebol (TheSportsDB).
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
  AlertCircle,
  Database,
  Globe
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchAllAvailableLeagues } from '@/services/football-sync-service';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateFootballLeagues } = useAppContext();
  const [leagueSearch, setLeagueSearch] = useState('');
  const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);

  const handleSearchLeagues = async () => {
    setIsSearchingLeagues(true);
    try {
      const leagues = await fetchAllAvailableLeagues();
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
    ).slice(0, 100);
  }, [footballData.leagues, leagueSearch]);

  const activeCount = footballData.leagues.filter(l => l.importar).length;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central Futebol</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Provedor: TheSportsDB</Badge>
            <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado (API Free)</Badge>
          </div>
        </div>
        <Button 
          onClick={syncFootballAll} 
          disabled={footballData.syncStatus === 'syncing' || activeCount === 0}
          className="lux-shine font-black uppercase"
        >
          {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Sincronizar Tudo ({activeCount} Ligas)
        </Button>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="monitor" className="gap-2"><Activity size={14} /> Monitoramento</TabsTrigger>
          <TabsTrigger value="leagues" className="gap-2"><Globe size={14} /> Ligas & Coverage</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings size={14} /> Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ligas Ativas" value={activeCount} icon={Globe} />
            <StatCard title="Jogos Carregados" value={footballData.todayMatches.length + footballData.nextMatches.length} icon={RefreshCw} />
            <StatCard title="Times Sincronizados" value={footballData.standings.length} icon={Trophy} />
            <StatCard title="Status do Sync" value={footballData.syncStatus.toUpperCase()} icon={Activity} />
          </div>
          
          <Card className="mt-6 border-white/5 bg-card/50">
            <CardHeader><CardTitle>Logs de Sincronização</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Última atualização global: {footballData.lastSync ? new Date(footballData.lastSync).toLocaleString('pt-BR') : 'Nunca'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leagues" className="pt-6 space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Gestão de Ligas</CardTitle>
                <CardDescription>Pesquise e selecione os campeonatos que deseja monitorar.</CardDescription>
              </div>
              <Button onClick={handleSearchLeagues} disabled={isSearchingLeagues} variant="outline">
                {isSearchingLeagues ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Recarregar Ligas da API
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Pesquisar liga ou país..." 
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 h-10 text-sm focus:outline-none focus:border-primary"
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                />
              </div>

              <div className="border border-white/5 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] uppercase font-black">Liga</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">País</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeagues.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Nenhuma liga encontrada.</TableCell></TableRow>
                    ) : (
                      filteredLeagues.map(l => (
                        <TableRow key={l.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-bold text-white">{l.name}</TableCell>
                          <TableCell className="text-xs uppercase text-muted-foreground">{l.country}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant={l.importar ? "default" : "ghost"} 
                              size="sm"
                              className={l.importar ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground"}
                              onClick={() => toggleLeagueImport(l.id)}
                            >
                              {l.importar ? "Sincronizando" : "Ignorar"}
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
              <CardTitle>Provedor de Dados</CardTitle>
              <CardDescription>O sistema está configurado para usar a TheSportsDB (Plano Gratuito).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input value="https://www.thesportsdb.com/api/v1/json/1" readOnly className="bg-black/40" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value="1 (Free Tier)" readOnly className="bg-black/40" />
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
