/**
 * @fileOverview Painel de Controle e Testes da API (TheSportsDB V1).
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, RefreshCw, Trophy, Activity, Search, 
  CheckCircle2, Database, Flag, Clock, AlertCircle, PlayCircle, Code
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchBrazilianLeagues, getSPDate } from '@/services/football-sync-service';
import Link from 'next/link';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateFootballLeagues } = useAppContext();
  const [leagueSearch, setLeagueSearch] = useState('');
  const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleFetchLeagues = async () => {
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

  const runTest = async (endpoint: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/thesportsdb?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ ok: false, error: 'CLIENT_FETCH_ERROR', message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleLeague = (id: string) => {
    const updated = footballData.leagues.map(l => 
      l.id === id ? { ...l, importar: !l.importar } : l
    );
    updateFootballLeagues(updated);
  };

  const filteredLeagues = footballData.leagues.filter(l => 
    l.name.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Controle</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase font-black text-[10px]">API V1 Free (123)</Badge>
            <Badge className="bg-green-600 font-black uppercase text-[10px]"><CheckCircle2 size={12} className="mr-1" /> Sincronizador Ativo</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/futebol">
            <Button variant="outline" className="font-black uppercase text-xs rounded-xl">Voltar ao Painel</Button>
          </Link>
          <Button 
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing'}
            className="lux-shine font-black uppercase rounded-xl"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Sincronizar Ligas Ativas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="leagues" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="leagues" className="gap-2 font-black uppercase text-[10px]"><Flag size={14} /> Ligas Brasileiras</TabsTrigger>
          <TabsTrigger value="tests" className="gap-2 font-black uppercase text-[10px]"><Code size={14} /> Testes de Endpoint</TabsTrigger>
          <TabsTrigger value="api" className="gap-2 font-black uppercase text-[10px]"><Settings size={14} /> Configuração Proxy</TabsTrigger>
        </TabsList>

        <TabsContent value="leagues" className="pt-6 space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Gestão de Ligas</CardTitle>
                <CardDescription>Ative as ligas que o sistema deve monitorar na TheSportsDB.</CardDescription>
              </div>
              <Button onClick={handleFetchLeagues} disabled={isSearchingLeagues} variant="outline" size="sm" className="h-9 font-black">
                <RefreshCw className={isSearchingLeagues ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                Recarregar Ligas do Brasil
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar liga..." 
                  className="pl-10 h-10 bg-black/20"
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                />
              </div>

              <div className="border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-white/5 h-12">
                      <TableHead className="text-[10px] uppercase font-black px-4">Badge</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Nome da Liga</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right px-4">Monitorar?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeagues.map(l => (
                      <TableRow key={l.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="px-4">
                          <img src={l.badge} alt="" className="w-8 h-8 object-contain" />
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-white text-sm">{l.name}</span>
                          <p className="text-[9px] text-muted-foreground font-mono">ID: {l.id}</p>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <Button 
                            variant={l.importar ? "default" : "outline"} 
                            size="sm"
                            className={l.importar ? "bg-green-600 hover:bg-green-700 h-8 text-[10px] font-black" : "text-muted-foreground h-8 text-[10px] font-black"}
                            onClick={() => toggleLeague(l.id)}
                          >
                            {l.importar ? "ATIVO" : "INATIVO"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="pt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-white/5 bg-card/50">
              <CardHeader>
                <CardTitle>Executar Teste Direto</CardTitle>
                <CardDescription>Valide a resposta do proxy para os endpoints oficiais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Buscar Ligas (Brasil)', endpoint: 'search_all_leagues.php?c=Brazil&s=Soccer' },
                  { label: 'Jogos de Hoje (Geral)', endpoint: `eventsday.php?d=${getSPDate()}&s=Soccer` },
                  { label: 'Próximos Jogos (Liga 4344)', endpoint: 'eventsnextleague.php?id=4344' },
                  { label: 'Resultados (Liga 4344)', endpoint: 'eventspastleague.php?id=4344' },
                  { label: 'Tabela (Liga 4344)', endpoint: `lookuptable.php?l=4344&s=${getSPDate().split('-')[0]}` }
                ].map(t => (
                  <Button 
                    key={t.label} 
                    variant="outline" 
                    className="w-full justify-start h-12 text-xs font-bold gap-3"
                    onClick={() => runTest(t.endpoint)}
                    disabled={isTesting}
                  >
                    <PlayCircle size={16} className="text-primary" />
                    {t.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-slate-950/50">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center justify-between">
                  Resultado do Teste
                  {testResult && (
                    <Badge variant={testResult.ok ? "default" : "destructive"} className="text-[8px]">
                      {testResult.ok ? "SUCESSO" : "ERRO"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {testResult ? (
                  <pre className="bg-black/40 p-4 rounded-xl text-[10px] font-mono text-green-400 overflow-auto max-h-[400px] border border-white/5">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                ) : (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-xl">
                    <Code className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-muted-foreground italic">Selecione um teste para executar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="pt-6">
          <Card className="max-w-2xl border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle>Configuração do Provider</CardTitle>
              <CardDescription>O sistema utiliza um proxy interno para segurança e estabilidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Upstream URL</Label>
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-white">
                  https://www.thesportsdb.com/api/v1/json/123/
                </div>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="text-primary shrink-0" />
                  <p className="text-[10px] text-primary leading-relaxed font-bold uppercase italic">
                    A chave pública 123 possui limites de 30 requisições por minuto. O LotoHub Premium gerencia essa carga através de cache e sincronização escalonada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
