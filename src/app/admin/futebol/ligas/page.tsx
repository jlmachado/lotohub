/**
 * @fileOverview Gestão de Ligas ESPN para Administradores.
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trophy, Search, RefreshCw, Database, ShieldCheck, ChevronLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminLigasPage() {
  const { footballData, updateLeagueConfig, syncFootballAll } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.slug.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.priority - b.priority);
  }, [footballData.leagues, searchTerm]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/futebol">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Ligas ESPN</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Gestão do catálogo de competições monitoradas</p>
          </div>
        </div>
        <Button 
          onClick={() => syncFootballAll(true)} 
          disabled={footballData.syncStatus === 'syncing'}
          className="lux-shine font-black uppercase h-11 px-6 rounded-xl"
        >
          {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Sincronizar Ativas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buscar Liga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nome ou Slug..." 
                    className="pl-9 h-10 bg-black/20 border-white/10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {filteredLeagues.map(league => (
            <Card key={league.id} className={cn(
              "border-white/5 overflow-hidden transition-all",
              league.active ? "bg-primary/5 ring-1 ring-primary/20" : "bg-slate-900/50 opacity-60"
            )}>
              <div className="flex items-center p-4 gap-4">
                <Switch 
                  checked={league.active} 
                  onCheckedChange={(v) => updateLeagueConfig(league.id, { active: v })}
                />
                
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/5">
                  <Trophy className={cn("h-5 w-5", league.active ? "text-primary" : "text-slate-600")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white uppercase truncate">{league.name}</h3>
                    <Badge variant="outline" className="text-[8px] h-4 uppercase border-white/10">{league.category}</Badge>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Slug: {league.slug}</p>
                </div>

                <div className="hidden md:flex flex-col gap-1 items-end">
                  <div className="flex gap-2">
                    <Badge variant={league.useStandings ? "default" : "secondary"} className="text-[8px] h-4 uppercase">Tabela</Badge>
                    <Badge variant={league.useTeams ? "default" : "secondary"} className="text-[8px] h-4 uppercase">Clubes</Badge>
                  </div>
                  {footballData.standings[league.slug] && (
                    <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1">
                      <ShieldCheck size={10} /> Dados OK
                    </span>
                  )}
                </div>
              </div>
              
              {league.active && (
                <div className="px-4 py-2 bg-white/5 border-t border-white/5 flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Sincronizar Tabela:</span>
                    <Switch 
                      className="scale-75"
                      checked={league.useStandings} 
                      onCheckedChange={(v) => updateLeagueConfig(league.id, { useStandings: v })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Sincronizar Notícias:</span>
                    <Switch 
                      className="scale-75"
                      checked={league.useNews} 
                      onCheckedChange={(v) => updateLeagueConfig(league.id, { useNews: v })}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
