/**
 * @fileOverview Painel de Controle Avançado de Ligas Brasileiras (TheSportsDB V1).
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, RefreshCw, Trophy, Activity, Search, 
  CheckCircle2, Database, Flag, Clock, AlertCircle, PlayCircle, Code,
  Filter, LayoutGrid, ListChecks, Globe, ShieldCheck, Star
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchBrazilianLeagues, LeagueCategory, NormalizedLeague } from '@/services/football-sync-service';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateFootballLeagues } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | LeagueCategory>('ALL');
  const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleFetchLeagues = async () => {
    setIsSearchingLeagues(true);
    try {
      const leagues = await fetchBrazilianLeagues();
      // Mesclar status de importação se já existir no estado local
      const merged = leagues.map(newLeague => {
        const existing = footballData.leagues.find(l => l.id === newLeague.id);
        return existing ? { ...newLeague, importar: existing.importar } : newLeague;
      });
      updateFootballLeagues(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingLeagues(false);
    }
  };

  const toggleLeague = (id: string) => {
    const updated = footballData.leagues.map(l => 
      l.id === id ? { ...l, importar: !l.importar } : l
    );
    updateFootballLeagues(updated);
  };

  const toggleAll = (active: boolean) => {
    const updated = footballData.leagues.map(l => ({ ...l, importar: active }));
    updateFootballLeagues(updated);
  };

  const selectRecommended = () => {
    const updated = footballData.leagues.map(l => ({
      ...l,
      importar: l.category === 'NACIONAL' || l.name.includes('Paulista') || l.name.includes('Carioca')
    }));
    updateFootballLeagues(updated);
  };

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (l.strLeagueAlternate && l.strLeagueAlternate.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'ALL' || l.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [footballData.leagues, searchTerm, categoryFilter]);

  const categories = [
    { id: 'ALL', label: 'Todas' },
    { id: 'NACIONAL', label: 'Nacionais' },
    { id: 'ESTADUAL', label: 'Estaduais' },
    { id: 'FEMININO', label: 'Feminino' },
    { id: 'OUTROS', label: 'Outras' },
  ];

  const stats = useMemo(() => {
    return {
      total: footballData.leagues.length,
      active: footballData.leagues.filter(l => l.importar).length,
      nacionais: footballData.leagues.filter(l => l.category === 'NACIONAL').length,
      estaduais: footballData.leagues.filter(l => l.category === 'ESTADUAL').length
    };
  }, [footballData.leagues]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Ligas</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase font-black text-[10px]">Catálogo Brasil</Badge>
            <Badge className="bg-blue-600 font-black uppercase text-[10px]"><Globe size={12} className="mr-1" /> {stats.active} Ligas Ativas</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing' || stats.active === 0}
            className="lux-shine font-black uppercase rounded-xl h-11 px-6"
          >
            {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Sincronizar {stats.active} Ligas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros de Busca</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesquisar Liga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: Serie A..." 
                    className="pl-9 h-10 bg-black/20 border-white/10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-black uppercase border transition-all",
                        categoryFilter === cat.id 
                          ? "bg-primary text-black border-primary" 
                          : "bg-slate-900 text-muted-foreground border-white/5 hover:border-white/20"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-primary/5">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-primary">Ações em Massa</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <Button variant="outline" className="w-full justify-start h-9 text-[10px] font-black uppercase gap-2" onClick={handleFetchLeagues} disabled={isSearchingLeagues}>
                <RefreshCw size={14} className={isSearchingLeagues ? "animate-spin" : ""} /> Recarregar Catálogo API
              </Button>
              <Button variant="outline" className="w-full justify-start h-9 text-[10px] font-black uppercase gap-2" onClick={selectRecommended}>
                <Star size={14} className="text-amber-500" /> Seleção Recomendada
              </Button>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="ghost" className="h-8 text-[9px] font-black uppercase border border-white/5" onClick={() => toggleAll(true)}>Ativar Todas</Button>
                <Button variant="ghost" className="h-8 text-[9px] font-black uppercase border border-white/5" onClick={() => toggleAll(false)}>Desativar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-white/5 bg-slate-900/50 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Ligas Disponíveis ({filteredLeagues.length})</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Marque as ligas que deseja monitorar no sistema.</CardDescription>
              </div>
              <Badge variant="outline" className="border-white/10 text-muted-foreground font-mono text-[10px]">
                {stats.active} / {stats.total} ATIVAS
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                {filteredLeagues.length === 0 ? (
                  <div className="col-span-full py-32 text-center bg-background">
                    <Filter className="mx-auto mb-4 text-muted-foreground opacity-20" size={48} />
                    <p className="text-muted-foreground font-black uppercase italic tracking-widest text-xs">Nenhuma liga encontrada para os filtros.</p>
                    <Button variant="link" className="text-primary mt-2" onClick={handleFetchLeagues}>Buscar catálago inicial</Button>
                  </div>
                ) : (
                  filteredLeagues.map(league => (
                    <div 
                      key={league.id} 
                      className={cn(
                        "p-4 flex items-center gap-4 transition-colors relative group bg-background",
                        league.importar ? "bg-primary/5" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <Checkbox 
                          checked={league.importar} 
                          onCheckedChange={() => toggleLeague(league.id)}
                          className="h-5 w-5 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                        />
                      </div>
                      <div className="relative w-12 h-12 bg-white/5 rounded-xl p-2 border border-white/5 flex items-center justify-center overflow-hidden">
                        {league.strBadge ? (
                          <img src={league.strBadge} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Flag className="text-muted-foreground opacity-20" size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-xs text-white truncate uppercase tracking-tighter">{league.strLeague}</p>
                          <Badge className={cn(
                            "text-[7px] h-3.5 px-1 font-black",
                            league.category === 'NACIONAL' ? "bg-blue-600" :
                            league.category === 'ESTADUAL' ? "bg-amber-600" :
                            league.category === 'FEMININO' ? "bg-pink-600" : "bg-slate-600"
                          )}>
                            {league.category}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Clock size={10} /> {league.strCurrentSeason}</span>
                          <span className="flex items-center gap-1"><Trophy size={10} /> {league.idCup === 'yes' ? 'COPA' : 'LIGA'}</span>
                          <span className={cn(
                            "flex items-center gap-1",
                            league.strComplete === 'Yes' ? "text-green-500" : "text-amber-500"
                          )}>
                            <ShieldCheck size={10} /> {league.strComplete === 'Yes' ? 'FULL' : 'PARCIAL'}
                          </span>
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
  );
}
