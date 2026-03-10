/**
 * @fileOverview Painel de Controle de Futebol (TheSportsDB V1).
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, RefreshCw, Trophy, Activity, Search, 
  CheckCircle2, Database, Flag, Clock, Globe, ShieldCheck
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchBrazilianLeagues } from '@/services/football-sync-service';
import { cn } from '@/lib/utils';

export default function AdminFutebolConfigPage() {
  const { footballData, syncFootballAll, updateFootballLeagues } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingLeagues, setIsSearchingLeagues] = useState(false);

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

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [footballData.leagues, searchTerm]);

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Configurações de Futebol</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">TheSportsDB V1 Free (123)</p>
        </div>
        <Button 
          onClick={() => syncFootballAll(true)} 
          disabled={footballData.syncStatus === 'syncing'}
          className="lux-shine font-black uppercase rounded-xl h-11 px-6"
        >
          {footballData.syncStatus === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Sincronizar Tudo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesquisar Campeonato</Label>
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
              <Button variant="outline" className="w-full justify-start h-9 text-[10px] font-black uppercase gap-2" onClick={handleFetchLeagues} disabled={isSearchingLeagues}>
                <RefreshCw size={14} className={isSearchingLeagues ? "animate-spin" : ""} /> Recarregar Ligas do Brasil
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-white/5 bg-slate-900/50 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">Campeonatos Monitorados ({filteredLeagues.length})</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Ative as ligas para iniciar a busca de jogos.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {filteredLeagues.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground italic">
                    Nenhuma liga encontrada. Clique em "Recarregar" para buscar do TheSportsDB.
                  </div>
                ) : (
                  filteredLeagues.map(league => (
                    <div 
                      key={league.id} 
                      className={cn(
                        "p-4 flex items-center gap-4 transition-colors",
                        league.importar ? "bg-primary/5" : "hover:bg-white/5"
                      )}
                    >
                      <Checkbox 
                        checked={league.importar} 
                        onCheckedChange={() => toggleLeague(league.id)}
                        className="h-5 w-5"
                      />
                      <img src={league.strBadge} alt="" className="w-10 h-10 object-contain" />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs text-white truncate uppercase">{league.strLeague}</p>
                        <Badge variant="outline" className="text-[8px] h-4 mt-1 border-white/10 font-mono">{league.id}</Badge>
                      </div>
                      <Badge className={cn(
                        "text-[8px] h-4 font-black uppercase",
                        league.category === 'NACIONAL' ? "bg-blue-600" : "bg-slate-600"
                      )}>
                        {league.category}
                      </Badge>
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
