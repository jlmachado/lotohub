'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, CheckCircle2, Search, Filter, 
  AlertTriangle, Send, Database, History, Info, Eye, Trash2, MapPin, Download, 
  Clock, Play, Settings2, ShieldCheck, Zap
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ResultsAutoSyncService, AutoSyncConfig } from '@/services/results-auto-sync-service';
import { JDBNormalizedResult } from '@/types/result-types';
import { JDB_STATES } from '@/utils/jdb-constants';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCSV } from '@/utils/csvUtils';

export default function AdminJDBResultsProfessionalPage() {
  const { jdbResults, deleteJDBResult, syncJDBResults } = useAppContext();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<JDBNormalizedResult | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [autoSyncCfg, setAutoSyncCfg] = useState<AutoSyncConfig>(ResultsAutoSyncService.getConfig());

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
    
    const handleDataChange = () => {
      setAutoSyncCfg(ResultsAutoSyncService.getConfig());
    };
    window.addEventListener('app:data-changed', handleDataChange);
    return () => window.removeEventListener('app:data-changed', handleDataChange);
  }, []);

  const stats = useMemo(() => ({
    total: jdbResults.filter(r => r.date === dateFilter).length,
    publicados: jdbResults.filter(r => r.date === dateFilter && r.status === 'PUBLICADO').length,
    pendentes: jdbResults.filter(r => r.date === dateFilter && r.status !== 'PUBLICADO').length,
    divergentes: jdbResults.filter(r => r.date === dateFilter && r.status === 'DIVERGENTE').length,
  }), [jdbResults, dateFilter]);

  const filteredResults = useMemo(() => {
    console.log(`[Admin] Filtering jdbResults: ${jdbResults.length} total items`);
    const filtered = jdbResults
      .filter(r => {
        const matchDate = r.date === dateFilter || !dateFilter;
        const matchState = stateFilter === 'all' || r.stateCode === stateFilter;
        const matchSearch = r.lotteryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.extractionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.time.includes(searchTerm);
        return matchDate && matchState && matchSearch;
      })
      .sort((a, b) => b.time.localeCompare(a.time));
    
    console.log(`[Admin] Displaying ${filtered.length} filtered results`);
    return filtered;
  }, [jdbResults, dateFilter, stateFilter, searchTerm]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncJDBResults();
      toast({ 
        title: "Sincronização Finalizada", 
        description: "Os resultados foram atualizados a partir do scraper." 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro no Sync" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    ResultsAutoSyncService.updateConfig({ enabled });
    toast({ title: enabled ? "Automação Ativada" : "Automação Desativada" });
  };

  const handleExportResults = () => {
    if (filteredResults.length === 0) {
      toast({ variant: "destructive", title: "Nada para exportar" });
      return;
    }

    const exportData = filteredResults.map(res => {
      const row: any = {
        'Data': res.date,
        'Hora': res.time,
        'Estado': res.stateName,
        'Banca': res.extractionName,
        'Status': res.status,
      };
      
      const prizes = Array.isArray(res.prizes) ? res.prizes : [];
      for (let i = 1; i <= 10; i++) {
        const p = prizes.find((p: any) => (p.position || p.pos) === i);
        row[`${i}º prêmio`] = p ? `${p.milhar || p.valor} - Gr. ${p.grupo} - ${p.animal || p.bicho}` : '';
      }
      
      row['Capturado em'] = res.importedAt;
      return row;
    });

    const headers = [
      'Data', 'Hora', 'Estado', 'Banca', 'Status', 
      '1º prêmio', '2º prêmio', '3º prêmio', '4º prêmio', '5º prêmio',
      '6º prêmio', '7º prêmio', '8º prêmio', '9º prêmio', '10º prêmio',
      'Capturado em'
    ];

    downloadCSV(`resultados_jdb_pro_${dateFilter}.csv`, exportData, headers);
    toast({ title: "Exportação concluída" });
  };

  const nextRunMinutes = useMemo(() => {
    if (!autoSyncCfg.nextRunAt) return 0;
    const diff = new Date(autoSyncCfg.nextRunAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 60000));
  }, [autoSyncCfg.nextRunAt]);

  return (
    <main className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Extrações</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Gestão de Resultados Reais • Auto-Publish Ativo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportResults} className="h-11 rounded-xl font-bold border-white/10 bg-white/5">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button variant="outline" onClick={handleManualSync} disabled={isSyncing} className="h-11 rounded-xl font-bold border-white/10 bg-white/5">
            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Sincronizar Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Resultados Hoje" value={stats.total} icon={History} color="text-blue-400" />
        <StatCard title="Publicados" value={stats.publicados} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Pendentes" value={stats.pendentes} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title="Divergentes" value={stats.divergentes} icon={Info} color="text-red-500" />
        
        <Card className={cn(
          "border-primary/20 shadow-inner overflow-hidden relative",
          autoSyncCfg.enabled ? "bg-primary/5" : "bg-slate-900/50 grayscale opacity-70"
        )}>
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] font-black uppercase text-primary tracking-widest">Automação</p>
            <Switch checked={autoSyncCfg.enabled} onCheckedChange={handleToggleAutoSync} className="scale-75" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className={cn("text-primary", autoSyncCfg.status === 'running' && 'animate-spin')} />
              <p className="text-xs font-black text-white italic">
                {autoSyncCfg.status === 'running' ? 'Sync...' : autoSyncCfg.enabled ? `${nextRunMinutes}m` : 'Off'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-card/50">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data</Label>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-10 bg-black/20 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-10 bg-black/20 border-white/10">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {JDB_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca</Label>
              <Input placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 bg-black/20 border-white/10 text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[10px] uppercase font-black px-4">Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Extração / Estado</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Prêmios</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right px-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Nenhum resultado encontrado para este filtro.</TableCell></TableRow>
              ) : (
                filteredResults.map(result => (
                  <TableRow key={result.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4 font-mono font-bold text-primary">{result.time}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase italic">{result.extractionName}</span>
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-white/5 border-white/10 w-fit">{result.stateName}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-5 gap-1 max-w-[250px]">
                        {(Array.isArray(result.prizes) ? result.prizes : []).slice(0, 5).map((p: any, i: number) => (
                          <div key={i} className="flex flex-col items-center bg-black/20 border border-white/5 rounded px-1 py-0.5 min-w-[42px]">
                            <span className="text-[9px] font-black text-white font-mono leading-none">{p.milhar || p.valor}</span>
                            <span className="text-[6px] font-bold text-primary uppercase leading-tight">{p.animal || p.bicho}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-5 uppercase font-black",
                        result.status === 'PUBLICADO' ? "bg-green-600/20 text-green-500 border-green-500/30" : "bg-amber-600/20 text-amber-500 border-amber-500/30"
                      )}>
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4 space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50" onClick={() => { setSelectedResult(result); setIsDetailOpen(true); }}><Eye size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteJDBResult(result.id)}><Trash2 size={14} /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#0f172a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Detalhes da Extração</DialogTitle>
            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase">{selectedResult?.stateName} • {selectedResult?.extractionName}</DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6 py-4">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Prêmios ({(selectedResult.prizes || []).length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(selectedResult.prizes) ? selectedResult.prizes : []).map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] font-black text-slate-500">{p.position || p.pos}º</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-lg font-black text-white">{p.milhar || p.valor}</span>
                        <div className="w-20 text-right">
                          <p className="text-[10px] font-black text-primary uppercase italic leading-none">{p.animal || p.bicho}</p>
                          <p className="text-[8px] text-muted-foreground font-bold uppercase">Gr: {p.grupo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="border-white/10">Fechar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-inner overflow-hidden relative">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5", color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
          <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
