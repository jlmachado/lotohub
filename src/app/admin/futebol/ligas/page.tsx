/**
 * @fileOverview Gestão de Ligas ESPN & Live Score para Administradores.
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trophy, Search, RefreshCw, Database, ShieldCheck, ChevronLeft, Globe, Zap, BarChart3 } from 'lucide-react';
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
      l.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.country || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Catálogo Mundial</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Gestão de competições ESPN & LiveScore</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing'}
            className="h-11 px-6 rounded-xl font-bold border-white/10"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar Ligas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros de Busca</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome, Slug ou País</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar liga..." 
                    className="pl-9 h-10 bg-black/20 border-white/10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Total de Ligas:</span>
                  <span className="text-white">{footballData.leagues.length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Ativas Agora:</span>
                  <span className="text-green-500">{footballData.leagues.filter(l => l.active).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {filteredLeagues.map(league => (
            <Card key={league.id} className={cn(
              "border-white/5 overflow-hidden transition-all shadow-lg",
              league.active ? "bg-primary/5 ring-1 ring-primary/20" : "bg-slate-900/50 opacity-60"
            )}>
              <div className="flex items-center p-4 gap-4">
                <Switch 
                  checked={league.active} 
                  onCheckedChange={(v) => updateLeagueConfig(league.id, { active: v })}
                />
                
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                  <Trophy className={cn("h-6 w-6", league.active ? "text-primary" : "text-slate-600")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white uppercase truncate italic">{league.name}</h3>
                    <Badge variant="outline" className="text-[8px] h-4 uppercase border-white/10 bg-black/20">{league.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Globe size={10} /> {league.country || 'Internacional'}
                    </span>
                    <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                      <Zap size={10} /> ID: {league.livescoreId || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex flex-col gap-1 items-end">
                  <div className="flex gap-2">
                    <Badge variant={league.useStandings ? "default" : "secondary"} className="text-[8px] h-4 uppercase font-black">Tabela</Badge>
                    <Badge variant={league.livescoreId ? "default" : "secondary"} className="text-[8px] h-4 uppercase font-black bg-blue-600">Ao Vivo</Badge>
                  </div>
                  {league.active && (
                    <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1">
                      <ShieldCheck size={10} /> Monitorando
                    </span>
                  )}
                </div>
              </div>
              
              {league.active && (
                <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Classificação (ESPN):</span>
                    <Switch 
                      className="scale-75"
                      checked={league.useStandings} 
                      onCheckedChange={(v) => updateLeagueConfig(league.id, { useStandings: v })}
                    />
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Notícias (ESPN):</span>
                    <Switch 
                      className="scale-75"
                      checked={league.useNews} 
                      onCheckedChange={(v) => updateLeagueConfig(league.id, { useNews: v })}
                    />
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                    <BarChart3 size={12} className="text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Livescore ID: {league.livescoreId || 'Pendente'}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {filteredLeagues.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <Search className="h-12 w-12 mx-auto mb-4 text-slate-700" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma liga encontrada para "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
