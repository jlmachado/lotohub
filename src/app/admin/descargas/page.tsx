'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Search, Filter, CheckCircle2, TrendingUp, ShieldAlert, Building2 } from 'lucide-react';
import { loadDescargas, DescargaEntry, updateDescargaStatus } from '@/utils/descargaStorage';
import { formatBRL } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminDescargasPage() {
  const { toast } = useToast();
  const [allDescargas, setAllDescargas] = useState<DescargaEntry[]>([]);
  
  // Filters
  const [bancaFilter, setBancaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setAllDescargas(loadDescargas());
  }, []);

  const refresh = () => setAllDescargas(loadDescargas());

  const filtered = useMemo(() => {
    return allDescargas.filter(d => {
      const matchBanca = bancaFilter === 'all' || d.bancaId === bancaFilter;
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchSearch = d.terminal.includes(searchTerm) || d.nomeUsuario.toLowerCase().includes(searchTerm.toLowerCase());
      return matchBanca && matchStatus && matchSearch;
    });
  }, [allDescargas, bancaFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalRetorno: filtered.reduce((acc, d) => acc + d.retornoPossivel, 0),
      totalApostado: filtered.reduce((acc, d) => acc + d.valorApostado, 0),
      count: filtered.length,
      pendingCount: filtered.filter(d => d.status === 'EM_DESCARGA').length
    };
  }, [filtered]);

  const groupedByBanca = useMemo(() => {
    const groups: Record<string, { nome: string, entries: DescargaEntry[], totalRetorno: number }> = {};
    filtered.forEach(d => {
      if (!groups[d.bancaId]) groups[d.bancaId] = { nome: d.bancaNome, entries: [], totalRetorno: 0 };
      groups[d.bancaId].entries.push(d);
      groups[d.bancaId].totalRetorno += d.retornoPossivel;
    });
    return Object.entries(groups).sort((a,b) => b[1].totalRetorno - a[1].totalRetorno);
  }, [filtered]);

  const handleMarkAsPaid = (id: string) => {
    updateDescargaStatus(id, 'PAGO_PELO_SUPERADMIN');
    toast({ title: 'Aposta Liquidada', description: 'Prêmio marcado como pago pelo Superadmin.' });
    refresh();
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Descarga das Bancas</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-red-600 text-white font-black italic uppercase text-[10px]">Responsabilidade Superadmin</Badge>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Gestão Global de Risco</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-600/10 border-red-600/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-500 flex items-center gap-2"><ShieldAlert size={12} /> Risco Total em Descarga</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-3xl font-black text-red-500 italic">{formatBRL(stats.totalRetorno)}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Volume Apostado</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{formatBRL(stats.totalApostado)}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Pendentes de Liquidação</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-500">{stats.pendingCount}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Total de Bilhetes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.count}</p></CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Filter size={16} /> Filtros de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Busca Operador/Terminal</Label>
              <Input placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-950 border-white/5 h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status do Prêmio</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-950 border-white/5 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="EM_DESCARGA">Pendente (Em Descarga)</SelectItem>
                  <SelectItem value="PAGO_PELO_SUPERADMIN">Liquidado (Pago)</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Origem (Banca)</Label>
              <Select value={bancaFilter} onValueChange={setBancaFilter}>
                <SelectTrigger className="bg-slate-950 border-white/5 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Bancas</SelectItem>
                  {[...new Set(allDescargas.map(d => d.bancaId))].map(id => (
                    <SelectItem key={id} value={id}>{allDescargas.find(d => d.bancaId === id)?.bancaNome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" className="w-full text-[10px] font-black uppercase h-10" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setBancaFilter('all'); }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {groupedByBanca.map(([bancaId, data]) => (
          <div key={bancaId} className="space-y-4">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">{data.nome}</h2>
                <Badge variant="outline" className="text-[9px] border-white/10 uppercase bg-slate-900">{data.entries.length} Apostas</Badge>
              </div>
              <p className="text-sm font-black text-red-500">Exposição: {formatBRL(data.totalRetorno)}</p>
            </div>

            <Card className="border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase">Data/Hora</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Usuário/Terminal</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Módulo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Apostado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Retorno Possível</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map(d => (
                    <TableRow key={d.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white">{new Date(d.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[9px] text-muted-foreground">{new Date(d.createdAt).toLocaleTimeString('pt-BR')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white">{d.nomeUsuario}</span>
                          <span className="text-[9px] font-mono text-primary uppercase">{d.terminal}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-white/10 w-fit">{d.modulo}</Badge>
                          {d.loteria && <span className="text-[9px] text-muted-foreground mt-1">{d.loteria}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-white">{formatBRL(d.valorApostado)}</TableCell>
                      <TableCell className="text-right font-black text-red-500">{formatBRL(d.retornoPossivel)}</TableCell>
                      <TableCell className="text-right">
                        {d.status === 'EM_DESCARGA' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase border-green-500/20 text-green-500 hover:bg-green-500 hover:text-black"
                            onClick={() => handleMarkAsPaid(d.id)}
                          >
                            <CheckCircle2 size={12} className="mr-1" /> Liquidar
                          </Button>
                        ) : (
                          <Badge className="bg-green-600/20 text-green-500 border-green-500/30 text-[8px] h-6 px-2">LIQUIDADO MASTER</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))}

        {groupedByBanca.length === 0 && (
          <div className="py-32 text-center">
            <Layers size={48} className="mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground italic">Nenhuma aposta em descarga encontrada no sistema.</p>
          </div>
        )}
      </div>
    </main>
  );
}