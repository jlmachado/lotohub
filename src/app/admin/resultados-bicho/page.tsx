'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, Search, RefreshCw, CheckCircle2, 
  Trash2, Edit, Eye, Globe, Filter, AlertTriangle, 
  Send, Database, History, Info
} from 'lucide-react';
import { useAppContext, JDBResult } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { getBichoInfo, normalizeJDBResult, isValidMilhar } from '@/utils/jdb-results-helper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function AdminJDBResultsPage() {
  const { jdbResults, jdbLoterias, saveJDBResult, publishJDBResult, deleteJDBResult, activeBancaId } = useAppContext();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    lotteryId: '',
    lotteryName: '',
    status: 'PENDENTE' as const,
    source: 'MANUAL',
    prizes: ['', '', '', '', '', '', '']
  });

  const stats = useMemo(() => ({
    total: jdbResults.filter(r => r.date === dateFilter).length,
    publicados: jdbResults.filter(r => r.date === dateFilter && r.status === 'PUBLICADO').length,
    pendentes: jdbResults.filter(r => r.date === dateFilter && r.status === 'PENDENTE').length,
  }), [jdbResults, dateFilter]);

  const filteredResults = useMemo(() => {
    return jdbResults
      .filter(r => {
        const matchDate = r.date === dateFilter;
        const matchSearch = r.lotteryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.time.includes(searchTerm);
        return matchDate && matchSearch;
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [jdbResults, dateFilter, searchTerm]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/resultados/jogodobicho');
      const data = await res.json();
      
      if (data.extracoes) {
        let importedCount = 0;
        data.extracoes.forEach((ext: any) => {
          // Normalizar horário (ex: "09h00" -> "09:00")
          const time = ext.titulo.split('–')[0].trim().replace('h', ':');
          const name = ext.titulo.split('–')[1]?.trim() || 'Importado';
          
          const resultObj: JDBResult = {
            id: `jdb-${data.data.replace(/\//g, '-')}-${time}-${name.toLowerCase().replace(/\s/g, '-')}`,
            date: data.data.split('/').reverse().join('-'), // Converte DD/MM/YYYY para YYYY-MM-DD
            time,
            lotteryId: name.toLowerCase(),
            lotteryName: name,
            status: 'PENDENTE',
            source: 'API PORTALBRASIL',
            results: ext.itens.map((item: any) => ({
              premio: `${item.pos}º`,
              valor: item.numero,
              grupo: item.grupo,
              animal: item.bicho
            })),
            bancaId: 'global',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          saveJDBResult(resultObj);
          importedCount++;
        });
        toast({ title: "Sincronização OK", description: `${importedCount} extrações capturadas para conferência.` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro no Sync", description: "Não foi possível buscar resultados automáticos." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    if (!formData.time || !formData.lotteryId) {
      toast({ variant: 'destructive', title: "Incompleto", description: "Horário e Loteria são obrigatórios." });
      return;
    }

    const normalizedPrizes = normalizeJDBResult(formData.prizes);
    const lotteryObj = jdbLoterias.find(l => l.id === formData.lotteryId);

    const resultObj: JDBResult = {
      id: editingId || `jdb-${formData.date}-${formData.time}-${formData.lotteryId}`,
      date: formData.date,
      time: formData.time,
      lotteryId: formData.lotteryId,
      lotteryName: lotteryObj?.nome || 'Manual',
      status: formData.status,
      source: formData.source,
      results: normalizedPrizes,
      bancaId: activeBancaId || 'global',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveJDBResult(resultObj);
    toast({ title: "Sucesso", description: "Resultado salvo com sucesso." });
    setIsFormOpen(false);
    setEditingId(null);
  };

  const openEdit = (result: JDBResult) => {
    setEditingId(result.id);
    setFormData({
      date: result.date,
      time: result.time,
      lotteryId: result.lotteryId,
      lotteryName: result.lotteryName,
      status: result.status,
      source: result.source,
      prizes: result.results.map(r => r.valor)
    });
    setIsFormOpen(true);
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Resultados</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Gestão, conferência e apuração automática</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSync} 
            disabled={isSyncing}
            className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
          >
            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Importar de Hoje
          </Button>
          <Button onClick={() => { setEditingId(null); setIsFormOpen(true); }} className="h-11 rounded-xl font-black uppercase italic lux-shine">
            <PlusCircle className="mr-2 h-4 w-4" /> Lançar Manual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total no Dia" value={stats.total} icon={History} color="text-blue-400" />
        <StatCard title="Aguardando Conferência" value={stats.pendentes} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title="Publicados & Apurados" value={stats.publicados} icon={CheckCircle2} color="text-green-500" />
      </div>

      <Card className="border-white/10 bg-card/50">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Filtrar Data</Label>
                <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 bg-black/20 border-white/10 w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Loteria ou hora..." 
                    className="pl-8 h-9 bg-black/20 border-white/10 w-48 text-xs" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Filtrado: {filteredResults.length} resultados</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5 h-10">
                <TableHead className="text-[10px] uppercase font-black px-4">Horário</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Loteria</TableHead>
                <TableHead className="text-[10px] uppercase font-black">1º ao 5º Prêmio</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right px-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                    Nenhum resultado encontrado para esta data.
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map(result => (
                  <TableRow key={result.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-4 font-mono font-bold text-primary">{result.time}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase italic">{result.lotteryName}</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{result.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {result.results.slice(0, 5).map((r, i) => (
                          <div key={i} className="flex flex-col items-center bg-black/20 border border-white/5 rounded px-1.5 py-0.5 min-w-[45px]">
                            <span className="text-[10px] font-black text-white font-mono">{r.valor}</span>
                            <span className="text-[7px] font-bold text-primary uppercase">{r.animal}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-5 uppercase font-black",
                        result.status === 'PUBLICADO' ? "bg-green-600/20 text-green-500 border-green-500/30" : 
                        result.status === 'CONFIRMADO' ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
                        "bg-amber-600/20 text-amber-500 border-amber-500/30"
                      )}>
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4 space-x-1">
                      {result.status !== 'PUBLICADO' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                          onClick={() => publishJDBResult(result.id)}
                          title="Publicar e Apurar"
                        >
                          <Send size={14} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(result)}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteJDBResult(result.id)}><Trash2 size={14} /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL FORM */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#0f172a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              {editingId ? 'Editar Resultado' : 'Novo Lançamento Manual'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold">Data da Extração</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-10 bg-black/20" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold">Horário (ex: 14:00)</Label>
                <Input value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="h-10 bg-black/20 font-mono" placeholder="00:00" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold">Loteria / Banca</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  value={formData.lotteryId}
                  onChange={e => setFormData({...formData, lotteryId: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {jdbLoterias.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3 bg-black/30 p-4 rounded-2xl border border-white/5">
              <Label className="text-[10px] uppercase font-black text-primary tracking-widest">Prêmios (1º ao 7º)</Label>
              <div className="grid gap-2">
                {formData.prizes.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    <span className="text-[9px] font-black text-muted-foreground w-6">{idx + 1}º</span>
                    <div className="relative flex-1">
                      <Input 
                        value={val} 
                        onChange={e => {
                          const newPrizes = [...formData.prizes];
                          newPrizes[idx] = e.target.value.replace(/\D/g, '').substring(0, 4);
                          setFormData({...formData, prizes: newPrizes});
                        }}
                        className="h-8 bg-black/40 font-mono text-center text-sm font-bold border-white/10 focus:border-primary"
                        maxLength={4}
                      />
                    </div>
                    <div className="w-24 text-right">
                      {val.length >= 2 ? (
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] font-black text-primary uppercase italic">{getBichoInfo(val).animal}</span>
                          <span className="text-[7px] text-muted-foreground uppercase font-bold">G: {getBichoInfo(val).grupo}</span>
                        </div>
                      ) : <span className="text-[10px] text-white/10">---</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-white/5 pt-6">
            <DialogClose asChild><Button variant="outline" className="border-white/10">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} className="lux-shine font-black uppercase italic px-8">
              <Send className="mr-2 h-4 w-4" /> Salvar Resultado
            </Button>
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
