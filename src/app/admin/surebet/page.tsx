'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Settings2, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  History,
  AlertTriangle,
  Save,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/utils/currency';
import Link from 'next/link';

export default function AdminSurebetPage() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [fees, setFees] = useState({ deposit: 1.5, withdraw: 2.0 });
  const [minRoi, setMinRoi] = useState(1.5);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = () => {
    toast({ title: 'Configurações Salvas', description: 'O motor de arbitragem foi atualizado.' });
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Scanner Concluído', description: '14 novas oportunidades detectadas.' });
    }, 2000);
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft size={18} /></Button></Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Surebet Admin</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Configuração do Motor de Arbitragem</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleForceSync}
          disabled={isSyncing}
          className="h-11 rounded-xl font-bold border-white/10"
        >
          {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Forçar Scanner
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <Settings2 size={16} className="text-primary" /> Parâmetros de Filtro
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Defina quais oportunidades exibir aos usuários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Módulo Surebet Ativo</Label>
                  <p className="text-[10px] text-muted-foreground uppercase">Habilita o scanner global de odds.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">ROI Mínimo (%)</Label>
                  <Input 
                    type="number" 
                    value={minRoi} 
                    onChange={e => setMinRoi(parseFloat(e.target.value) || 0)}
                    className="bg-black/20 border-white/5 h-11 text-lg font-black text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Frequência de Scan (segundos)</Label>
                  <Input type="number" defaultValue="10" className="bg-black/20 border-white/5 h-11 text-lg font-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" /> Gestão de Taxas
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Taxas aplicadas para cálculo do lucro líquido.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Taxa de Depósito (%)</Label>
                <Input 
                  type="number" 
                  value={fees.deposit} 
                  onChange={e => setFees({...fees, deposit: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Taxa de Saque (%)</Label>
                <Input 
                  type="number" 
                  value={fees.withdraw} 
                  onChange={e => setFees({...fees, withdraw: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" /> Ações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black uppercase italic lux-shine">
                <Save size={16} className="mr-2" /> Salvar Configurações
              </Button>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-500 font-black uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Aviso Técnico
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">
                  O scanner de Surebet consome créditos de API. Mantenha a frequência acima de 10s para evitar custos desnecessários.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-slate-900/50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2">
                <History size={14} className="text-blue-400" /> Logs de Execução
              </CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-[9px] font-mono text-slate-500 border-b border-white/5 pb-2 last:border-0">
                  <span className="text-blue-400">[19:45:0{i}]</span> Scan concluído em 142ms. Encontrado ROI 4.2% em FLA x PAL.
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
