/**
 * @fileOverview Área Administrativa do Futebol EXCLUSIVA para TheSportsDB Free V1 (Chave 123).
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock,
  AlertCircle
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
    return (footballData.leagues || []).filter(l => 
      l.name.toLowerCase().includes(term) || 
      l.country.toLowerCase().includes(term)
    );
  }, [footballData.leagues, leagueSearch]);

  const activeCount = (footballData.leagues || []).filter(l => l.importar).length;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central Futebol</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase font-black text-[10px]">TheSportsDB V1 (Free 123)</Badge>
            <Badge className="bg-green-600 font-black uppercase text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Auto-Sync Ativo</Badge>
          </div>
        </div>
        <Button 
          onClick={() => syncFootballAll(true)} 
          disabled={footballData.syncStatus === 'syncing' || activeCount === 0}
          className="lux-shine font-black uppercase"
        >
          {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Sincronizar Agora
        </Button>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="monitor" className="gap-2 font-black uppercase text-[10px]"><Activity size={14} /> Monitoramento</TabsTrigger>
          <TabsTrigger value="leagues" className="gap-2 font-black uppercase text-[10px]"><Flag size={14} /> Ligas & Campeonatos</TabsTrigger>
          <TabsTrigger value="config" className="gap-2 font-black uppercase text-[10px]"><Settings size={14} /> Configuração API</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ligas Ativas" value={activeCount} icon={Flag} />
            <StatCard title="Jogos Carregados" value={footballData.todayMatches.length + footballData.nextMatches.length} icon={Database} />
            <StatCard title="Tabelas Ativas" value={new Set(footballData.standings.map(s => s.leagueId)).size} icon={Trophy} />
            <StatCard title="Status do Sync" value={footballData.syncStatus.toUpperCase()} icon={Activity} />
          </div>
          
          <Card className="mt-6 border-white/5 bg-card/50 overflow-hidden shadow-xl">
            <CardHeader className="bg-white/5 border-b border-white/5">
              <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                <Clock size={16} className="text-primary" /> Histórico de Atualização Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Última Tentativa</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {footballData.lastSync ? new Date(footballData.lastSync).toLocaleString('pt-BR') : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <span className="text-xs text-green-600 uppercase font-bold">Último Sucesso</span>
                    <span className="text-sm font-mono font-bold text-green-500">
                      {footballData.lastSuccessfulSync ? new Date(footballData.lastSuccessfulSync).toLocaleString('pt-BR') : '---'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-bold">
                      A sincronização automática ocorre a cada 15 min entre 08h e 00h (SP). Durante a madrugada, o intervalo é de 60 min.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leagues" className="pt-6 space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Gestão de Ligas Brasileiras</CardTitle>
                <CardDescription>Ative os campeonatos que o sistema deve monitorar na TheSportsDB.</CardDescription>
              </div>
              <Button onClick={handleSearchLeagues} disabled={isSearchingLeagues} variant="outline" size="sm" className="h-9">
                <RefreshCw className={isSearchingLeagues ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                Buscar Ligas do Brasil
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar campeonato..." 
                  className="pl-10 h-10 bg-black/20"
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                />
              </div>

              <div className="border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5 h-12">
                      <TableHead className="text-[10px] uppercase font-black px-4">Liga</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">ID</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right px-4">Monitorar?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeagues.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Nenhum campeonato encontrado.</TableCell></TableRow>
                    ) : (
                      filteredLeagues.map(l => (
                        <TableRow key={l.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-8 h-8 bg-white/5 rounded-full p-1.5 flex items-center justify-center">
                                {l.badge ? (
                                  <img src={l.badge} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <Flag size={14} className="text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-bold text-white text-sm">{l.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{l.id}</TableCell>
                          <TableCell className="text-right px-4">
                            <Button 
                              variant={l.importar ? "default" : "outline"} 
                              size="sm"
                              className={l.importar ? "bg-green-600 hover:bg-green-700 h-8 text-[10px] font-black" : "text-muted-foreground h-8 text-[10px] font-black"}
                              onClick={() => toggleLeagueImport(l.id)}
                            >
                              {l.importar ? "ATIVO" : "INATIVO"}
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
          <Card className="max-w-2xl border-white/5 bg-card/50 shadow-2xl">
            <CardHeader>
              <CardTitle>Configuração da Fonte de Dados</CardTitle>
              <CardDescription>O sistema está configurado para a TheSportsDB V1 (Free).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground font-bold">Base URL</Label>
                <Input value="https://www.thesportsdb.com/api/v1/json/123" readOnly className="bg-black/40 text-white font-mono text-xs h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground font-bold">API Key (Free V1)</Label>
                <Input value="123" readOnly className="bg-black/40 text-white font-mono text-xs h-10" />
              </div>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                <p className="text-xs text-primary leading-relaxed font-bold uppercase italic">
                  Utilizando chave free pública 123. Esta chave possui limites de requisições por minuto e dados limitados por dia.
                </p>
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
    <Card className="border-white/5 bg-slate-900/50 shadow-lg">
      <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{title}</CardTitle>
        <Icon size={14} className="text-primary" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-black text-white italic tracking-tighter">{value}</div>
      </CardContent>
    </Card>
  );
}
