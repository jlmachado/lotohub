'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Layers } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminNovoSorteioBingoPage() {
  const { bingoSettings, createBingoDraw } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const [scheduledAt, setScheduledAt] = useState('');
  const [ticketPrice, setTicketPrice] = useState(bingoSettings?.ticketPriceDefault || 0.3);
  const [prizes, setPrizes] = useState(bingoSettings?.prizeDefaults || { quadra: 60, kina: 90, keno: 150 });
  const [housePercent, setHousePercent] = useState(bingoSettings?.housePercentDefault || 10);
  
  // Mass creation states
  const [isMassCreate, setIsMassCreate] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(3);
  const [repeatCount, setRepeatCount] = useState(10);

  const handleCreateDraw = () => {
    if (!scheduledAt) {
      toast({ variant: 'destructive', title: 'Data e Hora Inválidas', description: 'Por favor, defina o horário de início.' });
      return;
    }

    if (isMassCreate) {
      const baseDate = new Date(scheduledAt);
      for (let i = 0; i < repeatCount; i++) {
        const newDate = new Date(baseDate.getTime() + (i * intervalMinutes * 60000));
        createBingoDraw({
          scheduledAt: newDate.toISOString(),
          ticketPrice,
          prizeRules: prizes,
          housePercent,
        });
      }
      toast({ title: 'Sorteios em Massa Criados!', description: `${repeatCount} sorteios foram agendados.` });
    } else {
      createBingoDraw({
        scheduledAt: new Date(scheduledAt).toISOString(),
        ticketPrice,
        prizeRules: prizes,
        housePercent,
      });
      toast({ title: 'Sorteio Único Criado!', description: 'O novo sorteio foi agendado com sucesso.' });
    }
    
    router.push('/admin/bingo/sorteios');
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bingo/sorteios"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Criar Sorteio de Bingo</h1>
      </div>

      <Card className="max-w-2xl mx-auto shadow-xl border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Layers className="text-primary" />
              Configurações do Sorteio
          </CardTitle>
          <CardDescription>Defina os valores, prêmios e agendamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="scheduled-at">Horário de Início (Primeiro Sorteio)</Label>
            <Input id="scheduled-at" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                  <Label htmlFor="ticket-price">Preço da Cartela (R$)</Label>
                  <Input id="ticket-price" type="number" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(parseFloat(e.target.value) || 0)} />
              </div>
               <div className="grid gap-2">
                  <Label htmlFor="house-percent">Comissão da Banca (%)</Label>
                  <Input id="house-percent" type="number" value={housePercent} onChange={e => setHousePercent(parseInt(e.target.value, 10) || 0)} />
              </div>
          </div>

           <div>
              <h3 className="font-semibold text-lg mb-3">Tabela de Prêmios Fixos</h3>
              <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid gap-2">
                      <Label htmlFor="prize-quadra">Quadra (R$)</Label>
                      <Input id="prize-quadra" type="number" value={prizes.quadra} onChange={e => setPrizes({...prizes, quadra: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="prize-kina">Quina (R$)</Label>
                      <Input id="prize-kina" type="number" value={prizes.kina} onChange={e => setPrizes({...prizes, kina: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="prize-keno">Keno (R$)</Label>
                      <Input id="prize-keno" type="number" value={prizes.keno} onChange={e => setPrizes({...prizes, keno: parseFloat(e.target.value) || 0})} />
                  </div>
              </div>
          </div>

          <div className="p-4 border rounded-lg space-y-4 bg-primary/5">
              <div className="flex items-center space-x-2">
                  <Checkbox id="mass-create" checked={isMassCreate} onCheckedChange={(v) => setIsMassCreate(!!v)} />
                  <Label htmlFor="mass-create" className="font-bold">Criar Sorteios em Massa</Label>
              </div>
              {isMassCreate && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid gap-2">
                          <Label htmlFor="interval">Intervalo (minutos)</Label>
                          <Input id="interval" type="number" value={intervalMinutes} onChange={e => setIntervalMinutes(parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="count">Quantidade de Sorteios</Label>
                          <Input id="count" type="number" value={repeatCount} onChange={e => setRepeatCount(parseInt(e.target.value) || 1)} />
                      </div>
                  </div>
              )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreateDraw} className="w-full h-12 text-lg font-bold">
              {isMassCreate ? `Agendar ${repeatCount} Sorteios` : 'Agendar Sorteio'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
