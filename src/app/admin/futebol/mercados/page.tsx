/**
 * @fileOverview Configuração de Mercados de Aposta habilitados.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Layers, Save, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadMarketSettings, saveMarketSettings, MarketSettings } from '@/utils/bettingConfigStorage';
import { cn } from '@/lib/utils';

export default function AdminMarketConfigPage() {
  const { toast } = useToast();
  const [markets, setMarkets] = useState<MarketSettings[]>([]);

  useEffect(() => {
    setMarkets(loadMarketSettings());
  }, []);

  const toggleStatus = (id: string, field: 'enabled' | 'enabledForLive') => {
    setMarkets(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: !m[field] } : m
    ));
  };

  const handleSave = () => {
    saveMarketSettings(markets);
    toast({ title: 'Mercados Atualizados', description: 'As configurações de oferta foram salvas.' });
  };

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Catálogo de Mercados</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Controle de oferta de tipos de aposta</p>
        </div>
        <Button onClick={handleSave} className="h-11 px-8 rounded-xl font-black uppercase italic lux-shine">
          <Save className="mr-2 h-4 w-4" /> Salvar Tudo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((market) => (
          <Card key={market.id} className={cn(
            "border-white/5 bg-slate-900/50 transition-all",
            market.enabled ? "ring-1 ring-primary/20" : "opacity-60 grayscale"
          )}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-black uppercase italic tracking-widest text-white">{market.name}</CardTitle>
                  <Badge variant="outline" className="text-[8px] h-4 mt-1 border-white/10 font-mono">{market.id}</Badge>
                </div>
                <Switch 
                  checked={market.enabled} 
                  onCheckedChange={() => toggleStatus(market.id, 'enabled')}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase text-white">Disponível Ao Vivo</Label>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Aceita apostas In-Play</p>
                </div>
                <Switch 
                  disabled={!market.enabled}
                  checked={market.enabledForLive} 
                  onCheckedChange={() => toggleStatus(market.id, 'enabledForLive')}
                />
              </div>
              
              <div className="flex gap-2">
                <Badge className={cn("text-[8px] uppercase font-black px-1.5 h-5", market.enabled ? "bg-green-600" : "bg-slate-800")}>
                  {market.enabled ? <CheckCircle2 size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                  {market.enabled ? 'ATIVO' : 'DESATIVADO'}
                </Badge>
                <Badge variant="outline" className="text-[8px] font-black h-5 border-white/10 uppercase tracking-widest">
                  Prioridade: {market.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-6 bg-slate-900/80 border border-white/5 rounded-2xl flex gap-4">
        <Info className="h-6 w-6 text-primary shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase text-white italic">Nota Técnica</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wide">
            A desativação de um mercado remove instantaneamente todas as seleções relacionadas do frontend e do carrinho de apostas. Mercados inativos não podem ser processados pela Betting Engine.
          </p>
        </div>
      </div>
    </main>
  );
}
