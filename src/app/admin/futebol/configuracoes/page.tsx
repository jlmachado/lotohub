'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { ChevronLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppContext, FootballApiConfig } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function AdminFutebolConfiguracoesPage() {
  const { footballApiConfig, footballChampionships, updateFootballApiConfig, updateFootballChampionship, syncFootballData } = useAppContext();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<Partial<FootballApiConfig> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (footballApiConfig) {
      setConfig(footballApiConfig);
    }
  }, [footballApiConfig]);

  const handleInputChange = (field: keyof FootballApiConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };
  
  const handleSave = () => {
    if (config) {
      updateFootballApiConfig(config);
      toast({
        title: 'Configurações Salvas',
        description: 'As configurações da API de Futebol foram atualizadas.',
      });
    }
  };

  const handleSync = async () => {
    if (!config?.apiKey && config?.mode === 'live') {
        toast({ variant: 'destructive', title: 'Chave Ausente', description: 'Informe a chave da API para sincronizar em modo LIVE.' });
        return;
    }

    setIsSyncing(true);
    try {
        await syncFootballData();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: e.message || 'Erro desconhecido.' });
    } finally {
        setIsSyncing(false);
    }
  };

  if (!config) {
    return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/futebol"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Configurações de Futebol</h1>
      </div>

      <Card className="max-w-4xl mx-auto shadow-lg border-white/5">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 italic uppercase">
                Integração com API
                {config.apiKey ? (
                    <Badge className="bg-green-600 ml-2"><CheckCircle2 className="h-3 w-3 mr-1" /> CONFIGURADA</Badge>
                ) : (
                    <Badge variant="destructive" className="ml-2"><AlertCircle className="h-3 w-3 mr-1" /> SEM CHAVE</Badge>
                )}
              </CardTitle>
              <CardDescription>Configure o provedor e a chave secreta para importar jogos reais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                      <Label htmlFor="api-provider">Provedor da API</Label>
                      <Select value={config.provider} onValueChange={(value: 'api-futebol' | 'api-football') => handleInputChange('provider', value)}>
                          <SelectTrigger id="api-provider">
                              <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="api-futebol">API-Futebol (Brasileirão/Nacional)</SelectItem>
                              <SelectItem value="api-football">API-Football (Internacional)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                      <div className="space-y-0.5">
                          <Label htmlFor="api-mode" className="text-base font-bold">Modo Operacional</Label>
                          <p className="text-xs text-muted-foreground">
                              Modo TESTE usa dados simulados. Modo LIVE usa API real.
                          </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${config.mode === 'test' ? 'text-blue-400' : 'text-muted-foreground'}`}>TESTE</span>
                        <Switch id="api-mode" checked={config.mode === 'live'} onCheckedChange={(checked) => handleInputChange('mode', checked ? 'live' : 'test')} />
                        <span className={`text-[10px] font-bold ${config.mode === 'live' ? 'text-red-500' : 'text-muted-foreground'}`}>LIVE</span>
                      </div>
                  </div>
              </div>
              
              <div className="grid gap-2">
                  <Label htmlFor="api-key" className="flex items-center justify-between">
                    Chave da API (Token Secreto)
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Sensível</span>
                  </Label>
                  <Input 
                    id="api-key" 
                    type="password"
                    value={config.apiKey} 
                    onChange={e => handleInputChange('apiKey', e.target.value)} 
                    placeholder="Cole seu token aqui..."
                    className="bg-black/20 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Obtenha sua chave nos portais oficiais dos provedores.</p>
              </div>
              
              <Separator />

              <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">Campeonatos Ativos</h3>
                    <Badge variant="outline" className="border-primary/20 text-primary">{footballChampionships.filter(c => c.importar).length} Ativos</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Marque os campeonatos que devem ser sincronizados para o painel de apostas.</p>
                  
                  {footballChampionships.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl opacity-50">
                        <p className="text-sm">Nenhum campeonato encontrado. Execute a sincronização inicial.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {footballChampionships.map(champ => (
                            <div key={champ.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                <Checkbox 
                                    id={`champ-${champ.id}`} 
                                    checked={champ.importar} 
                                    onCheckedChange={(checked) => updateFootballChampionship(champ.id, { importar: !!checked })}
                                />
                                <div className="flex flex-col">
                                    <label
                                        htmlFor={`champ-${champ.id}`}
                                        className="text-xs font-bold leading-none cursor-pointer"
                                    >
                                        {champ.name}
                                    </label>
                                    <span className="text-[9px] text-muted-foreground font-mono mt-1">ID: {champ.apiId}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                  )}
              </div>

          </CardContent>
          <CardFooter className="flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t pt-6 bg-muted/5">
              <div className="flex gap-3 w-full md:w-auto">
                  <Button onClick={handleSave} className="flex-1 md:flex-none">Salvar Configurações</Button>
                  <Button variant="secondary" onClick={handleSync} disabled={isSyncing} className="flex-1 md:flex-none lux-shine">
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar com API'}
                  </Button>
              </div>
               {footballApiConfig?.lastSync && (
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Última Sincronização</p>
                    <p className="text-xs font-mono">
                        {new Date(footballApiConfig.lastSync).toLocaleString('pt-BR')}
                    </p>
                  </div>
              )}
          </CardFooter>
      </Card>
    </main>
  );
}
