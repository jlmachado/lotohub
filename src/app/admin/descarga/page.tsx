'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowDownToLine, Save, Filter, TrendingUp, History, Info } from 'lucide-react';
import { resolveCurrentBanca } from '@/utils/bancaContext';
import { getBancas, saveBancas, Banca } from '@/utils/bancasStorage';
import { getDescargasByBanca, DescargaEntry } from '@/utils/descargaStorage';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/utils/currency';

export default function AdminBancaDescargaPage() {
  const { toast } = useToast();
  const [banca, setBanca] = useState<Banca | null>(null);
  const [descargas, setDescargas] = useState<DescargaEntry[]>([]);
  
  // Form states
  const [limite, setLimite] = useState(0);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const current = resolveCurrentBanca();
    if (current) {
      setBanca(current);
      setLimite(current.descargaConfig.limitePremio);
      setAtivo(current.descargaConfig.ativo);
      setDescargas(getDescargasByBanca(current.id));
    }
  }, []);

  const handleSaveConfig = () => {
    if (!banca) return;
    
    const bancas = getBancas();
    const index = bancas.findIndex(b => b.id === banca.id);
    
    if (index >= 0) {
      bancas[index].descargaConfig = {
        limitePremio: limite,
        ativo,
        updatedAt: Date.now()
      };
      saveBancas(bancas);
      toast({ title: 'Configuração Salva', description: 'O limite de descarga foi atualizado com sucesso.' });
    }
  };

  const stats = useMemo(() => {
    return {
      totalRetorno: descargas.reduce((acc, d) => acc + d.retornoPossivel, 0),
      totalApostado: descargas.reduce((acc, d) => acc + d.valorApostado, 0),
      count: descargas.length,
      maxPotencial: Math.max(0, ...descargas.map(d => d.retornoPossivel))
    };
  }, [descargas]);

  if (!banca) return <div className="p-8 text-center text-muted-foreground">Contexto de banca não identificado.</div>;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Módulo de Descarga</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Unidade: {banca.nome}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary">Total em Descarga (Prêmio)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-primary">{formatBRL(stats.totalRetorno)}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Apostas Offloaded</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.count}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Valor Apostado Total</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{formatBRL(stats.totalApostado)}</p></CardContent>
        </Card>
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Maior Prêmio em Risco</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-500">{formatBRL(stats.maxPotencial)}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-white/10 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-widest text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Configuração de Risco
            </CardTitle>
            <CardDescription>Defina o teto máximo de prêmio que esta unidade assume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Módulo Descarga Ativo</Label>
                <p className="text-[10px] text-muted-foreground">Ativa o roteamento automático de risco.</p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Limite de Prêmio Individual (R$)</Label>
              <Input 
                type="number" 
                value={limite} 
                onChange={e => setLimite(parseFloat(e.target.value) || 0)} 
                className="h-12 text-xl font-black text-primary bg-black/20"
              />
              <p className="text-[10px] text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
                <Info className="inline h-3 w-3 mr-1" /> Apostas com prêmio potencial ACIMA deste valor serão enviadas para a Descarga Master (SuperAdmin).
              </p>
            </div>

            <Button onClick={handleSaveConfig} className="w-full h-12 rounded-xl font-black uppercase lux-shine">
              <Save className="mr-2 h-4 w-4" /> Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-white/5 overflow-hidden">
          <CardHeader className="bg-slate-950/50 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white flex items-center gap-2">
              <History size={16} className="text-primary" /> Log de Apostas em Descarga
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-950/20">
              <TableRow className="border-white/5">
                <TableHead className="text-[10px] uppercase font-black">Data/Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Usuário</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Módulo</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Apostado</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-right">Potencial</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {descargas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-24 text-muted-foreground italic">Nenhuma aposta enviada para descarga nesta unidade.</TableCell></TableRow>
              ) : (
                descargas.map(d => (
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
                        <span className="text-[9px] font-mono text-primary">{d.terminal}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-white/10">{d.modulo}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-white">{formatBRL(d.valorApostado)}</TableCell>
                    <TableCell className="text-right font-black text-amber-500">{formatBRL(d.retornoPossivel)}</TableCell>
                    <TableCell>
                      <Badge className="text-[8px] h-4 bg-purple-600/20 text-purple-400 border-purple-500/30 uppercase">{d.status.replace('_',' ')}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </main>
  );
}