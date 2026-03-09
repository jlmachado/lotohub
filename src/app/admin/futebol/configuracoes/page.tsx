'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Layers, 
  TrendingUp, 
  Zap,
  Activity,
  Trash2
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

export default function AdminFutebolConfigPage() {
  const { 
    footballApiConfig, 
    updateFootballApiConfig, 
    testFootballConnection, 
    syncFootballData,
    footballChampionships,
    footballTeams,
    footballMatches,
    updateChampionship,
    deleteMatch
  } = useAppContext();

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    await testFootballConnection();
    setIsTesting(false);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await syncFootballData({ syncLeagues: true, syncTeams: true, syncFixtures: true });
    setIsSyncing(false);
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Configuração Futebol</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Provider: {footballApiConfig.provider.toUpperCase()}
            </Badge>
            {footballApiConfig.status === 'connected' ? (
              <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
            ) : (
              <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> {footballApiConfig.status || 'Desconectado'}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={isTesting}
            className="font-bold border-white/10"
          >
            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-primary" />}
            Testar Conexão
          </Button>
          <Button 
            onClick={handleSyncAll} 
            disabled={isSyncing || footballApiConfig.status !== 'connected'}
            className="font-black uppercase lux-shine"
          >
            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar Tudo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Ligas</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{footballChampionships.length}</p></CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Times</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{footballTeams.length}</p></CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Jogos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{footballMatches.length}</p></CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Último Sync</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm font-bold text-primary">
              {footballApiConfig.lastSync ? new Date(footballApiConfig.lastSync).toLocaleString('pt-BR') : 'Nunca'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="api" className="gap-2"><Settings size={14} /> Configuração API</TabsTrigger>
          <TabsTrigger value="leagues" className="gap-2"><Globe size={14} /> Ligas & Coverage</TabsTrigger>
          <TabsTrigger value="matches" className="gap-2"><Activity size={14} /> Gerenciar Jogos</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="pt-6">
          <Card className="max-w-2xl border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle>Credenciais da Integração</CardTitle>
              <CardDescription>Configure sua chave da API-FOOTBALL para importar dados reais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Key (x-apisports-key)</Label>
                <Input 
                  type="password" 
                  value={footballApiConfig.apiKey} 
                  onChange={e => updateFootballApiConfig({ apiKey: e.target.value })}
                  placeholder="Cole sua chave aqui..."
                  className="bg-black/20 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input 
                  value={footballApiConfig.baseUrl} 
                  onChange={e => updateFootballApiConfig({ baseUrl: e.target.value })}
                  className="bg-black/20"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                <div className="space-y-0.5">
                  <Label>Modo de Operação</Label>
                  <p className="text-[10px] text-muted-foreground">Alternar entre dados reais ou testes.</p>
                </div>
                <Badge className={footballApiConfig.mode === 'live' ? 'bg-red-600' : 'bg-blue-600'}>
                  {footballApiConfig.mode.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-6 justify-end">
              <Button onClick={() => updateFootballApiConfig({})} className="lux-shine px-8">Salvar Configurações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="leagues" className="pt-6">
          <Card className="border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-white/5">
                  <TableHead className="text-[10px] uppercase font-black">Liga</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">País/Tipo</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Coverage</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footballChampionships.map((champ) => (
                  <TableRow key={champ.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image src={champ.logo} alt={champ.name} width={24} height={24} className="rounded-sm" />
                        <span className="font-bold text-white text-sm">{champ.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-white">{champ.country}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{champ.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {champ.coverage?.standings && <Badge variant="outline" className="text-[8px] border-green-500/20 text-green-500">STANDINGS</Badge>}
                        {champ.coverage?.odds && <Badge variant="outline" className="text-[8px] border-blue-500/20 text-blue-500">ODDS</Badge>}
                        {champ.coverage?.fixtures?.events && <Badge variant="outline" className="text-[8px] border-amber-500/20 text-amber-500">EVENTS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Importar</span>
                        <Switch 
                          checked={champ.importar} 
                          onCheckedChange={v => updateChampionship(champ.id, { importar: v })} 
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="pt-6">
          <Card className="border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-white/5">
                  <TableHead className="text-[10px] uppercase font-black">Data/Hora</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Confronto</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footballMatches.map((match) => {
                  const home = footballTeams.find(t => t.id === match.homeTeamId);
                  const away = footballTeams.find(t => t.id === match.awayTeamId);
                  return (
                    <TableRow key={match.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-xs font-mono">
                        {new Date(match.dateTime).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{home?.name}</span>
                          <span className="text-muted-foreground text-[10px]">x</span>
                          <span className="font-bold">{away?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[9px]">
                          {match.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteMatch(match.id)} className="text-red-500 hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
