'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useAppContext, BingoSettings } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function AdminBingoConfiguracoesPage() {
  const { bingoSettings, updateBingoSettings } = useAppContext();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<BingoSettings | null>(null);

  useEffect(() => {
    if (bingoSettings) {
      setSettings(bingoSettings);
    }
  }, [bingoSettings]);

  const handleInputChange = (field: keyof BingoSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };
  
  const handlePrizeChange = (prize: 'quadra' | 'kina' | 'keno', value: string) => {
    if (!settings) return;
    const numericValue = parseFloat(value) || 0;
    setSettings({
        ...settings,
        prizeDefaults: {
            ...settings.prizeDefaults,
            [prize]: numericValue
        }
    });
  };
  
  const handleAutoScheduleChange = (field: 'everyMinutes' | 'startHour' | 'endHour', value: string) => {
     if (!settings) return;
     const numericValue = parseInt(value, 10) || 0;
     setSettings({
        ...settings,
        autoSchedule: {
            ...settings.autoSchedule,
            [field]: numericValue
        }
    });
  }

  const handleSave = () => {
    if (settings) {
      updateBingoSettings(settings);
      toast({
        title: 'Configurações Salvas',
        description: 'As configurações do Bingo foram atualizadas com sucesso.',
      });
    }
  };

  if (!settings) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Configurações do Bingo</h1>
      </div>

      <Card className="max-w-4xl mx-auto">
          <CardHeader>
              <CardTitle>Opções Gerais do Kenno</CardTitle>
              <CardDescription>Ajuste o funcionamento global do módulo de Bingo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
              <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                      <Label htmlFor="bingo-status" className="text-base">Bingo Ativado</Label>
                      <p className="text-sm text-muted-foreground">
                          Habilite ou desabilite o acesso dos usuários ao Bingo.
                      </p>
                  </div>
                  <Switch id="bingo-status" checked={settings.enabled} onCheckedChange={(checked) => handleInputChange('enabled', checked)} />
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                          <Label htmlFor="rtp-status" className="text-base font-bold">Ativar Bot (Modo RTP)</Label>
                          <p className="text-sm text-muted-foreground">
                              Se ativado, prêmios reais só são liberados quando a arrecadação atingir o lucro desejado.
                          </p>
                      </div>
                      <Switch id="rtp-status" checked={settings.rtpEnabled} onCheckedChange={(checked) => handleInputChange('rtpEnabled', checked)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label htmlFor="rtp-percent">Retenção da Casa (%)</Label>
                          <Input id="rtp-percent" type="number" value={settings.rtpPercent} onChange={(e) => handleInputChange('rtpPercent', parseInt(e.target.value, 10) || 0)} />
                      </div>
                  </div>
              </div>
              
              <Separator />
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="grid gap-2">
                      <Label htmlFor="ticket-price">Preço Padrão (R$)</Label>
                      <Input id="ticket-price" type="number" value={settings.ticketPriceDefault} onChange={(e) => handleInputChange('ticketPriceDefault', parseFloat(e.target.value) || 0)} />
                  </div>
                   <div className="grid gap-2">
                      <Label htmlFor="house-percent">Comissão Banca (%)</Label>
                      <Input id="house-percent" type="number" value={settings.housePercentDefault} onChange={(e) => handleInputChange('housePercentDefault', parseInt(e.target.value, 10) || 0)} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="max-tickets">Máx. Cartelas / User</Label>
                      <Input id="max-tickets" type="number" value={settings.maxTicketsPerUserDefault} onChange={(e) => handleInputChange('maxTicketsPerUserDefault', parseInt(e.target.value, 10) || 0)} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="hold-seconds">Espera Pré-Sorteio (s)</Label>
                      <Input id="hold-seconds" type="number" value={settings.preDrawHoldSeconds} onChange={(e) => handleInputChange('preDrawHoldSeconds', parseInt(e.target.value, 10) || 0)} />
                  </div>
              </div>

              <div>
                  <h3 className="text-lg font-medium mb-2">Valores Padrão dos Prêmios</h3>
                  <div className="grid md:grid-cols-3 gap-6 p-4 border rounded-lg">
                      <div className="grid gap-2">
                          <Label htmlFor="prize-quadra">Quadra (R$)</Label>
                          <Input id="prize-quadra" type="number" value={settings.prizeDefaults.quadra} onChange={(e) => handlePrizeChange('quadra', e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="prize-kina">Kina (R$)</Label>
                          <Input id="prize-kina" type="number" value={settings.prizeDefaults.kina} onChange={(e) => handlePrizeChange('kina', e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="prize-keno">Keno (R$)</Label>
                          <Input id="prize-keno" type="number" value={settings.prizeDefaults.keno} onChange={(e) => handlePrizeChange('keno', e.target.value)} />
                      </div>
                  </div>
              </div>

               <div>
                  <h3 className="text-lg font-medium mb-2">Agendamento de Sorteios</h3>
                   <div className="p-4 border rounded-lg space-y-6">
                      <div className="grid gap-2">
                          <Label htmlFor="schedule-mode">Modo de Agendamento</Label>
                          <select 
                            className="flex h-10 w-[280px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={settings.scheduleMode} 
                            onChange={(e) => handleInputChange('scheduleMode', e.target.value)}
                          >
                              <option value="manual">Manual (Apenas Admin)</option>
                              <option value="auto">Automático</option>
                          </select>
                      </div>

                      {settings.scheduleMode === 'auto' && (
                           <div className="grid md:grid-cols-3 gap-6">
                              <div className="grid gap-2">
                                  <Label htmlFor="auto-interval">Intervalo (minutos)</Label>
                                  <Input id="auto-interval" type="number" value={settings.autoSchedule.everyMinutes} onChange={(e) => handleAutoScheduleChange('everyMinutes', e.target.value)} />
                              </div>
                              <div className="grid gap-2">
                                  <Label htmlFor="auto-start">Hora de Início (0-23)</Label>
                                  <Input id="auto-start" type="number" value={settings.autoSchedule.startHour} onChange={(e) => handleAutoScheduleChange('startHour', e.target.value)} />
                              </div>
                              <div className="grid gap-2">
                                  <Label htmlFor="auto-end">Hora de Fim (0-23)</Label>
                                  <Input id="auto-end" type="number" value={settings.autoSchedule.endHour} onChange={(e) => handleAutoScheduleChange('endHour', e.target.value)} />
                              </div>
                          </div>
                      )}
                  </div>
              </div>

          </CardContent>
          <CardFooter>
              <Button onClick={handleSave}>Salvar Configurações</Button>
          </CardFooter>
      </Card>
    </main>
  );
}
