/**
 * @fileOverview Gestão de Ligas ESPN para Administradores.
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Trophy, Search, RefreshCw, CheckCircle2, AlertTriangle, 
  ShieldCheck, Filter, Globe, Activity, Info, Database
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { espnService } from '@/services/espn-api-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminLigasESPNPage() {
  const { footballData, updateLeagueConfig, syncFootballAll } = useAppContext();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [isValidating, setIsValidating] = useState<string | null>(null);

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.slug.includes(searchTerm);
      const matchCategory = categoryFilter === 'ALL' || l.category === categoryFilter;
      return matchSearch && matchCategory;
    }).sort((a, b) => a.priority - b.priority);
  }, [footballData.leagues, searchTerm, categoryFilter]);

  const validateLeague = async (leagueSlug: string) => {
    setIsValidating(leagueSlug);
    try {
      const data = await espnService.getScoreboard(leagueSlug);
      if (data) {
        toast({ title: "Liga Validada!", description: `ESPN retornou ${data.events?.length || 0} eventos para ${leagueSlug}.` });
      } else {
        toast({ variant: 'destructive', title: "Erro na Validação", description: "A ESPN não retornou dados para este slug." });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro técnico", description: "Falha ao conectar com o Proxy ESPN." });
    } finally {
      setIsValidating(null);
    }
  };

  const stats = {
    total: footballData.leagues.length,
    active: footballData.leagues.filter(l => l.active).length,
    matches: footballData.matches.length
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestão de Ligas ESPN</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-blue-600/10 text-blue-400 border-blue-400/20 uppercase font-black text-[10px]">ESPN SITE API v2</Badge>
            <Badge className="bg-primary text-black font-black uppercase text-[10px]">{stats.active} Ligas Ativas</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 font-bold uppercase text-[10px] h-11"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", footballData.syncStatus === 'syncing' && "animate-spin")} />
            Sincronizar Ativas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50 shadow-xl">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Painel de Monitoramento</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Status do Proxy</span>
                <Badge className="bg-green-600 h-4 text-[8px]">ONLINE</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Jogos em Cache</span>
                <span className="text-xs font-black text-white">{stats.matches}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Último Sync</span>
                <span className="text-[10px] font-mono text-white">
                  {footballData.lastSync ? new Date(footballData.lastSync).toLocaleTimeString('pt-BR') : 'Pendente'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros de Busca</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesquisar</Label>
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
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <select 
                  className="w-full h-9 rounded-md bg-black/20 border border-white/10 text-xs px-2"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">Todas</option>
                  <option value="NACIONAL">Nacionais</option>
                  <option value="ESTADUAL">Estaduais</option>
                  <option value="COPA">Copas</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {filteredLeagues.map(league => (
            <Card key={league.id} className={cn(
              "border-white/5 transition-all overflow-hidden shadow-lg",
              league.active ? "bg-primary/5 ring-1 ring-primary/20" : "bg-slate-900/50 opacity-80"
            )}>
              <div className="flex items-center p-4 gap-4">
                <div className="flex-shrink-0">
                  <Switch 
                    checked={league.active} 
                    onCheckedChange={(v) => updateLeagueConfig(league.id, { active: v })}
                  />
                </div>
                
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 p-2">
                  <Trophy className={cn(league.active ? "text-primary" : "text-muted-foreground/20")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white uppercase tracking-tight truncate">{league.name}</h3>
                    <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase font-black">{league.category}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">Slug: {league.slug}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Resumos: ESPN V2</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <div className="flex flex-col gap-1 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Tabela</span>
                      <Switch checked={league.useStandings} onCheckedChange={(v) => updateLeagueConfig(league.id, { useStandings: v })} className="scale-75 h-4 w-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Clubes</span>
                      <Switch checked={league.useTeams} onCheckedChange={(v) => updateLeagueConfig(league.id, { useTeams: v })} className="scale-75 h-4 w-8" />
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 text-[9px] font-black uppercase"
                    disabled={isValidating === league.slug}
                    onClick={() => validateLeague(league.slug)}
                  >
                    {isValidating === league.slug ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Validar Slug"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredLeagues.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-bold uppercase text-xs">Nenhuma liga encontrada para os filtros aplicados.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
