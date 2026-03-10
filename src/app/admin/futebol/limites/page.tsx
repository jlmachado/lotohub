/**
 * @fileOverview Gestão de Limites de Apostas Futebol.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Save, Info, AlertTriangle, Coins, TrendingUp, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadBettingLimits, saveBettingLimits, BettingLimits } from '@/utils/bettingConfigStorage';
import { formatBRL } from '@/utils/currency';

export default function AdminBettingLimitsPage() {
  const { toast } = useToast();
  const [limits, setLimits] = useState<BettingLimits & { enableAutoOdds?: boolean } | null>(null);

  useEffect(() => {
    setLimits(loadBettingLimits());
  }, []);

  const handleSave = () => {
    if (!limits) return;
    saveBettingLimits(limits);
    toast({ title: 'Limites Atualizados', description: 'As regras de risco foram salvas com sucesso.' });
  };

  if (!limits) return null;

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestão de Risco</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Configuração de limites e travas operacionais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <Coins size={16} className="text-primary" /> Parâmetros de Entrada (Stakes)
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Valores permitidos por bilhete.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Stake Mínima (R$)</Label>
                <Input 
                  type="number" 
                  value={limits.minStake} 
                  onChange={e => setLimits({...limits, minStake: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Stake Máxima (R$)</Label>
                <Input 
                  type="number" 
                  value={limits.maxStake} 
                  onChange={e => setLimits({...limits, maxStake: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" /> Odds Automáticas
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Geração de cotações para jogos sem dados de mercado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Habilitar Auto Odds</Label>
                  <p className="text-[10px] text-muted-foreground">Gera odds 1X2 automaticamente quando não houver na API.</p>
                </div>
                <Switch 
                  checked={limits.enableAutoOdds !== false} 
                  onCheckedChange={(v) => setLimits({...limits, enableAutoOdds: v})} 
                />
              </div>
              
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] text-primary font-black uppercase mb-2">Modelo de Odds Padrão (1X2)</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Casa</p>
                    <p className="font-bold text-white">2.20</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Empate</p>
                    <p className="font-bold text-white">3.20</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Fora</p>
                    <p className="font-bold text-white">2.90</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" /> Prêmios e Odds
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Teto de pagamento e cotações permitidas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Prêmio Máximo por Bilhete (R$)</Label>
                <Input 
                  type="number" 
                  value={limits.maxPotentialWin} 
                  onChange={e => setLimits({...limits, maxPotentialWin: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black text-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Cotação Máxima (Total Odd)</Label>
                <Input 
                  type="number" 
                  value={limits.maxOdds} 
                  onChange={e => setLimits({...limits, maxOdds: parseFloat(e.target.value) || 0})}
                  className="bg-black/20 border-white/5 h-11 text-lg font-black text-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck size={18} /> Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black uppercase italic lux-shine">
                <Save className="mr-2 h-4 w-4" /> Salvar Configurações
              </Button>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-500 font-black uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Aviso de Segurança
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">
                  Alterações nestes limites afetam imediatamente a aceitação de novas apostas no frontend.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
