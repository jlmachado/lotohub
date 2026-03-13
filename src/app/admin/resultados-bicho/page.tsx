'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, CheckCircle2, Search, Filter, 
  AlertTriangle, Send, Database, History, Info, Eye, Trash2, MapPin, Download
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ResultsSyncService } from '@/services/results-sync-service';
import { JDBNormalizedResult } from '@/types/result-types';
import { JDB_STATES } from '@/utils/jdb-constants';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCSV } from '@/utils/csvUtils';

export default function AdminJDBResultsProfessionalPage() {
  const { jdbResults, publishJDBResult, deleteJDBResult } = useAppContext();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [stateFilter, setStateFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<JDBNormalizedResult | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const stats = useMemo(() => ({
    total: jdbResults.filter(r => r.date === dateFilter).length,
    publicados: jdbResults.filter(r => r.date === dateFilter && r.status === 'PUBLICADO').length,
    pendentes: jdbResults.filter(r => r.date === dateFilter && r.status !== 'PUBLICADO').length,
    divergentes: jdbResults.filter(r => r.date === dateFilter && r.status === 'DIVERGENTE').length,
  }), [jdbResults, dateFilter]);

  const filteredResults = useMemo(() => {
    return jdbResults
      .filter(r => {
        const matchDate = r.date === dateFilter;
        const matchState = stateFilter === 'all' || r.stateCode === stateFilter;
        const matchSearch = r.lotteryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.extractionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.time.includes(searchTerm);
        return matchDate && matchState && matchSearch;
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [jdbResults, dateFilter, stateFilter, searchTerm]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const summary = await ResultsSyncService.syncToday();
      toast({ 
        title: "Sincronização Finalizada", 
        description: `${summary.news} novos resultados capturados.` 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro no Sync", description: "Falha ao conectar com o provedor." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportResults = () => {
    if (filteredResults.length === 0) {
      toast({
        variant: "destructive",
        title: "Nada para exportar",
        description: "Nenhum resultado encontrado com os filtros atuais."
      });
      return;
    }

    const exportData = filteredResults.map(res => ({
      'Data': new Date(res.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      'Hora': res.time,
      'Estado': res.stateName,
      'Banca/Fonte': res.sourceName,
      'Extração': res.extractionName,
      'Status': res.status,
      '1º prêmio': `${res.prizes[0]?.milhar || ''} - Gr. ${res.prizes[0]?.grupo || ''} - ${res.prizes[0]?.animal || ''}`,
      '2º prêmio': `${res.prizes[1]?.milhar || ''} - Gr. ${res.prizes[1]?.grupo || ''} - ${res.prizes[1]?.animal || ''}`,
      '3º prêmio': `${res.prizes[2]?.milhar || ''} - Gr. ${res.prizes[2]?.grupo || ''} - ${res.prizes[2]?.animal || ''}`,
      '4º prêmio': `${res.prizes[3]?.milhar || ''} - Gr. ${res.prizes[3]?.grupo || ''} - ${res.prizes[3]?.animal || ''}`,
      '5º prêmio': `${res.prizes[4]?.milhar || ''} - Gr. ${res.prizes[4]?.grupo || ''} - ${res.prizes[4]?.animal || ''}`,
      'Importado em': new Date(res.importedAt).toLocaleString('pt-BR')
    }));

    const headers = [
      'Data', 'Hora', 'Estado', 'Banca/Fonte', 'Extração', 'Status', 
      '1º prêmio', '2º prêmio', '3º prêmio', '4º prêmio', '5º prêmio', 'Importado em'
    ];

    const success = downloadCSV(
      `resultados_bicho_${dateFilter}_${stateFilter !== 'all' ? stateFilter : 'global'}.csv`,
      exportData,
      headers
    );

    if (success) {
      toast({
        title: "Exportação concluída",
        description: `Arquivo CSV gerado com ${exportData.length} registros.`
      });
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Extrações</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Gerenciamento Automatizado de Resultados Multi-Estado</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportResults}
            className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleManualSync} 
            disabled={isSyncing}
            className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
          >
            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Importar de Hoje
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total no Dia" value={stats.total} icon={History} color="text-blue-400" />
        <StatCard title="Aguardando" value={stats.pendentes} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title="Divergentes" value={stats.divergentes} icon={Info} color="text-red-500" />
        <StatCard title="Publicados" value={stats.publicados} icon={CheckCircle2} color="text-green-500" />
      </div>

      <Card className="border-white/10 bg-card/50">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data das Extrações</Label>
                <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-10 bg-black/20 border-white/10" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado / Região</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="h-10 bg-black/20 border-white/10">
                    <SelectValue placeholder="Todos os Estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    {JDB_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca Rápida</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Banca ou hora..." 
                    className="pl-8 h-10 bg-black/20 border-white/10 text-xs" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[10px] uppercase font-black px-4">Horário</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Estado / Banca</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Resultado (1º ao 5º)</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right px-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                    Nenhum resultado capturado para estes filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map(result => (
                  <TableRow key={result.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="px-4 font-mono font-bold text-primary">{result.time}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-white uppercase italic">{result.extractionName}</span>
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-white/5 border-white/10">{result.stateCode}</Badge>
                        </div>
                        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{result.sourceName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {result.prizes.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex flex-col items-center bg-black/20 border border-white/5 rounded px-1.5 py-0.5 min-w-[45px]">
                            <span className="text-[10px] font-black text-white font-mono">{p.milhar}</span>
                            <span className="text-[7px] font-bold text-primary uppercase">{p.animal}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-5 uppercase font-black",
                        result.status === 'PUBLICADO' ? "bg-green-600/20 text-green-500 border-green-500/30" : 
                        result.status === 'DIVERGENTE' ? "bg-red-600/20 text-red-500 border-red-500/30 animate-pulse" :
                        "bg-amber-600/20 text-amber-500 border-amber-500/30"
                      )}>
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4 space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50" onClick={() => { setSelectedResult(result); setIsDetailOpen(true); }}><Eye size={14} /></Button>
                      {result.status !== 'PUBLICADO' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                          onClick={() => publishJDBResult(result.id)}
                        >
                          <Send size={14} />
                        </Button>
                      )}
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
            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase">Auditoria de Dados Normalizados: {selectedResult?.stateName}</DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] uppercase font-black text-slate-500 mb-1">Identificador Único</p>
                  <p className="font-mono text-[10px] text-primary">{selectedResult.id}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] uppercase font-black text-slate-500 mb-1">Origem / Estado</p>
                  <p className="text-sm font-bold text-white italic">{selectedResult.sourceName} • {selectedResult.stateName}</p>
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Escala de Prêmios (Oficial)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedResult.prizes.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-[10px] font-black text-slate-500">{p.position}º</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-lg font-black text-white">{p.milhar}</span>
                        <div className="w-20 text-right">
                          <p className="text-[10px] font-black text-primary uppercase italic leading-none">{p.animal}</p>
                          <p className="text-[8px] text-muted-foreground font-bold uppercase">Gr: {p.grupo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                <span>Capturado em: {new Date(selectedResult.importedAt).toLocaleString('pt-BR')}</span>
                <span className="flex items-center gap-1"><Database size={10} /> Checksum: {selectedResult.checksum.substring(0, 12)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-white/10">Fechar</Button></DialogClose>
            {selectedResult?.status !== 'PUBLICADO' && (
              <Button 
                onClick={() => { publishJDBResult(selectedResult!.id); setIsDetailOpen(false); }} 
                className="lux-shine font-black uppercase italic"
              >
                Confirmar e Publicar
              </Button>
            )}
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
      <div className="absolute -right-2 -bottom-2 opacity-5">
        <Icon size={64} />
      </div>
    </Card>
  );
}
