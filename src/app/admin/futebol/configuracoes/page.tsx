'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  Activity,
  Trash2,
  Calendar,
  LayoutGrid,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FootballWidget, FootballWidgetContainer } from '@/components/football/widgets/FootballWidgetContainer';

export default function AdminFutebolConfigPage() {
  const { 
    footballApiConfig, 
    updateFootballApiConfig, 
    testFootballConnection, 
    syncFootballData,
    footballMatches,
    footballTeams,
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

  const handleWidgetUpdate = (field: string, value: any) => {
    updateFootballApiConfig({
      widgetConfig: {
        ...footballApiConfig.widgetConfig,
        [field]: value
      }
    });
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
            Sincronizar Dados
          </Button>
        </div>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="bg-slate-950 border-white/10 h-12 p-1 gap-1">
          <TabsTrigger value="api" className="gap-2"><Settings size={14} /> Credenciais</TabsTrigger>
          <TabsTrigger value="widgets" className="gap-2"><LayoutGrid size={14} /> Configuração Widgets</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2"><Eye size={14} /> Pré-visualização</TabsTrigger>
          <TabsTrigger value="data" className="gap-2"><Activity size={14} /> Dados Persistidos</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="pt-6">
          <Card className="max-w-2xl border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle>Configuração de Acesso</CardTitle>
              <CardDescription>Configure sua chave de API e ambiente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Key (x-apisports-key)</Label>
                <Input 
                  type="password" 
                  value={footballApiConfig.apiKey} 
                  onChange={e => updateFootballApiConfig({ apiKey: e.target.value })}
                  className="bg-black/20 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select value={footballApiConfig.mode} onValueChange={(v: any) => updateFootballApiConfig({ mode: v })}>
                    <SelectTrigger className="bg-black/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Produção</SelectItem>
                      <SelectItem value="test">Testes (Mock)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Última Sincronização</Label>
                  <p className="h-10 flex items-center px-3 bg-slate-950/50 rounded-md border border-white/5 text-xs text-muted-foreground">
                    {footballApiConfig.lastSync ? new Date(footballApiConfig.lastSync).toLocaleString('pt-BR') : 'Pendente'}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-white/5 pt-6">
              <Button onClick={() => updateFootballApiConfig({})} className="lux-shine">Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="pt-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle>Configurações Visuais dos Widgets</CardTitle>
              <CardDescription>Ajuste como os widgets oficiais da API-FOOTBALL aparecem para o usuário.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={footballApiConfig.widgetConfig.lang} onValueChange={v => handleWidgetUpdate('lang', v)}>
                    <SelectTrigger className="bg-black/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português (BR)</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={footballApiConfig.widgetConfig.theme} onValueChange={v => handleWidgetUpdate('theme', v)}>
                    <SelectTrigger className="bg-black/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Atualização (segundos)</Label>
                  <Input 
                    type="number" 
                    value={footballApiConfig.widgetConfig.refresh} 
                    onChange={e => handleWidgetUpdate('refresh', parseInt(e.target.value))}
                    className="bg-black/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Mostrar Logos</Label>
                  <Switch checked={footballApiConfig.widgetConfig.showLogos} onCheckedChange={v => handleWidgetUpdate('showLogos', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Mostrar Erros</Label>
                  <Switch checked={footballApiConfig.widgetConfig.showErrors} onCheckedChange={v => handleWidgetUpdate('showErrors', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Classificação</Label>
                  <Switch checked={footballApiConfig.widgetConfig.standings} onCheckedChange={v => handleWidgetUpdate('standings', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Escalação</Label>
                  <Switch checked={footballApiConfig.widgetConfig.squad} onCheckedChange={v => handleWidgetUpdate('squad', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Estatísticas</Label>
                  <Switch checked={footballApiConfig.widgetConfig.statistics} onCheckedChange={v => handleWidgetUpdate('statistics', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-black/10">
                  <Label className="text-xs">Lesões</Label>
                  <Switch checked={footballApiConfig.widgetConfig.injuries} onCheckedChange={v => handleWidgetUpdate('injuries', v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="pt-6">
          <Card className="border-white/5 bg-slate-900/50">
            <CardHeader>
              <CardTitle>Prévia Operacional</CardTitle>
              <CardDescription>Simulação de carregamento dos widgets. Certifique-se de que a API Key é válida.</CardDescription>
            </CardHeader>
            <CardContent>
              <FootballWidgetContainer>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4 bg-black/40 min-h-[400px]">
                    <h4 className="text-xs font-black uppercase text-primary mb-4">Ligas (Selecione uma para atualizar jogos)</h4>
                    <FootballWidget 
                      type="leagues" 
                      targetLeague="wg-preview-games"
                      className="w-full"
                    />
                  </div>
                  <div className="border rounded-xl p-4 bg-black/40 min-h-[400px]">
                    <h4 className="text-xs font-black uppercase text-primary mb-4">Jogos da Liga</h4>
                    <FootballWidget 
                      id="wg-preview-games"
                      type="fixtures" 
                      className="w-full"
                    />
                  </div>
                </div>
              </FootballWidgetContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="pt-6">
          <Card className="border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-white/5">
                  <TableHead className="text-[10px] uppercase font-black">Data/Hora</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Confronto (ID)</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footballMatches.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Nenhum dado persistido localmente.</TableCell></TableRow>
                ) : (
                  footballMatches.map((match) => {
                    const home = footballTeams.find(t => t.id === match.homeTeamId);
                    const away = footballTeams.find(t => t.id === match.awayTeamId);
                    return (
                      <TableRow key={match.id} className="border-white/5">
                        <TableCell className="text-xs font-mono">{new Date(match.dateTime).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{home?.name || '...'}</span>
                            <span className="text-[9px] text-muted-foreground">x</span>
                            <span className="font-bold">{away?.name || '...'}</span>
                            <Badge variant="outline" className="text-[8px] font-mono ml-2">{match.id}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteMatch(match.id)} className="text-red-500"><Trash2 size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
