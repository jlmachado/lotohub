/**
 * @fileOverview Gestão Profissional de Ligas Brasileiras (Catálogo Manual + Validação API).
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
  Trophy, Search, RefreshCw, CheckCircle2, AlertTriangle, 
  XCircle, ShieldCheck, Flag, Filter, LayoutGrid, 
  CheckSquare, Square, Star, Activity, Info
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { LeagueCategory, ValidationStatus } from '@/services/football/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminLigasPage() {
  const { footballData, updateFootballCatalog, validateCatalogLeagues, syncFootballAll } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | LeagueCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ValidationStatus>('ALL');

  const filteredLeagues = useMemo(() => {
    return footballData.leagues.filter(l => {
      const matchSearch = l.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.idLeague?.includes(searchTerm);
      const matchCategory = categoryFilter === 'ALL' || l.categoria === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || l.statusValidacao === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    }).sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99));
  }, [footballData.leagues, searchTerm, categoryFilter, statusFilter]);

  const toggleLeague = (internalId: string) => {
    const updated = footballData.leagues.map(l => 
      l.internalId === internalId ? { ...l, ativa: !l.ativa } : l
    );
    updateFootballCatalog(updated);
  };

  const setBulk = (active: boolean) => {
    const updated = footballData.leagues.map(l => ({ ...l, ativa: active }));
    updateFootballCatalog(updated);
  };

  const setRecommended = () => {
    const updated = footballData.leagues.map(l => ({ ...l, ativa: l.recomendada }));
    updateFootballCatalog(updated);
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'DISPONIVEL': return <CheckCircle2 className="text-green-500 h-4 w-4" />;
      case 'DISPONIVEL_PARCIAL': return <Activity className="text-amber-500 h-4 w-4" />;
      case 'SEM_CLASSIFICACAO': return <Info className="text-blue-400 h-4 w-4" />;
      case 'NAO_TESTADA': return <RefreshCw className="text-slate-500 h-4 w-4" />;
      default: return <XCircle className="text-red-500 h-4 w-4" />;
    }
  };

  const stats = {
    total: footballData.leagues.length,
    active: footballData.leagues.filter(l => l.ativa).length,
    available: footballData.leagues.filter(l => l.statusValidacao === 'DISPONIVEL').length
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Catálogo de Ligas</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase font-black text-[10px]">Brasil v1.0</Badge>
            <Badge className="bg-blue-600 font-black uppercase text-[10px]">{stats.active} Ligas Monitoradas</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={validateCatalogLeagues} 
            disabled={footballData.syncStatus === 'syncing'}
            className="border-white/10 font-bold uppercase text-[10px]"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", footballData.syncStatus === 'syncing' && "animate-spin")} />
            Validar Cobertura
          </Button>
          <Button 
            onClick={() => syncFootballAll(true)} 
            disabled={footballData.syncStatus === 'syncing' || stats.active === 0}
            className="lux-shine font-black uppercase rounded-xl h-11"
          >
            Sincronizar Ativas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-white/5 bg-card/50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Filtros</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nome ou ID..." 
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
                  onChange={e => setCategoryFilter(e.target.value as any)}
                >
                  <option value="ALL">Todas</option>
                  <option value="NACIONAL">Nacionais</option>
                  <option value="ESTADUAL">Estaduais</option>
                  <option value="FEMININO">Feminino</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-primary/5">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-primary">Ações em Massa</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <Button variant="outline" className="w-full justify-start h-9 text-[10px] font-black uppercase gap-2" onClick={setRecommended}>
                <Star size={14} className="text-amber-500" /> Ativar Recomendadas
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" className="h-8 text-[9px] font-black uppercase border border-white/5" onClick={() => setBulk(true)}>Ativar Todas</Button>
                <Button variant="ghost" className="h-8 text-[9px] font-black uppercase border border-white/5" onClick={() => setBulk(false)}>Desativar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {filteredLeagues.map(league => (
            <Card key={league.internalId} className={cn(
              "border-white/5 transition-all overflow-hidden",
              league.ativa ? "bg-primary/5 ring-1 ring-primary/20" : "bg-slate-900/50 opacity-80"
            )}>
              <div className="flex items-center p-4 gap-4">
                <div className="flex-shrink-0">
                  <Switch 
                    checked={league.ativa} 
                    onCheckedChange={() => toggleLeague(league.internalId)}
                  />
                </div>
                
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 p-2">
                  {league.badge ? (
                    <img src={league.badge} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Flag className="text-muted-foreground/20" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white uppercase tracking-tight truncate">{league.nomeExibicao}</h3>
                    <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase font-black">{league.categoria}</Badge>
                    {league.recomendada && <Star size={12} className="text-amber-500 fill-amber-500" />}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">ID: {league.idLeague || '---'}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Divisão: {league.divisao}</span>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/5">
                    {getStatusIcon(league.statusValidacao)}
                    <span className="text-[9px] font-black uppercase text-white">{league.statusCobertura}</span>
                  </div>
                  <div className="flex gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                    <span>{league.totalJogos || 0} Jogos</span>
                    <span>{league.totalTimes || 0} Times</span>
                    <span className={cn(league.temTabela ? "text-green-500" : "text-slate-500")}>Tabela</span>
                  </div>
                </div>
              </div>
              
              {league.erroValidacao && (
                <div className="bg-red-500/10 px-4 py-1.5 border-t border-red-500/20 text-[9px] text-red-400 font-bold uppercase">
                  ERRO: {league.erroValidacao}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
