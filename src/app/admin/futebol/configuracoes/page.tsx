/**
 * @fileOverview Painel de Controle de Futebol (ESPN Site API v2).
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, RefreshCw, Trophy, Activity, Search, 
  Database, ShieldCheck, Globe, ListChecks, CheckCircle2
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateLeagueConfig } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [footballData.leagues, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Configuração de Ligas</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Gestão de Módulos ESPN Site API</p>
          </div>
          <Button 
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing'}
            className="lux-shine font-black uppercase rounded-xl h-11 px-6"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Sincronizar Ligas Ativas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-6">
            <Card className="border-white/5 bg-card/50">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Pesquisa</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome ou Slug</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Ex: bra.1..." 
                      className="pl-9 h-10 bg-black/20 border-white/10"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2">Dica Técnica</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Ative a opção "Tabela" apenas para competições de pontos corridos. Para Copas, utilize apenas "Clubes" e "Jogos".
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="border-white/5 bg-slate-900/50 overflow-hidden">
              <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Catálogo de Competições ({filteredLeagues.length})</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold">Configure quais dados carregar da ESPN por liga.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {filteredLeagues.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic">
                      Nenhuma liga encontrada para o termo pesquisado.
                    </div>
                  ) : (
                    filteredLeagues.map(league => (
                      <div 
                        key={league.id} 
                        className={cn(
                          "p-4 flex flex-col md:flex-row md:items-center gap-4 transition-colors",
                          league.active ? "bg-primary/5" : "hover:bg-white/5 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <Switch 
                            checked={league.active} 
                            onCheckedChange={(v) => updateLeagueConfig(league.id, { active: v })}
                            className="h-5 w-10"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-xs text-white truncate uppercase">{league.name}</p>
                              <Badge variant="outline" className="text-[8px] h-4 border-white/10 font-mono">{league.slug}</Badge>
                            </div>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">{league.category}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 bg-black/20 p-2 rounded-lg border border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-muted-foreground uppercase">Tabela</span>
                            <Switch 
                              checked={league.useStandings} 
                              onCheckedChange={(v) => updateLeagueConfig(league.id, { useStandings: v })}
                              className="scale-75"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-muted-foreground uppercase">Clubes</span>
                            <Switch 
                              checked={league.useTeams} 
                              onCheckedChange={(v) => updateLeagueConfig(league.id, { useTeams: v })}
                              className="scale-75"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-muted-foreground uppercase">Notícias</span>
                            <Switch 
                              checked={league.useNews} 
                              onCheckedChange={(v) => updateLeagueConfig(league.id, { useNews: v })}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
