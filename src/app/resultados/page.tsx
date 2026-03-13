'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Share2, Printer, Calendar, Clock, MapPin, Hash, RotateCcw } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { JDB_STATES } from '@/utils/jdb-constants';
import { cn } from '@/lib/utils';

export default function ResultadosPublicPage() {
  const { jdbResults } = useAppContext();
  const { toast } = useToast();

  // Estados de Filtro
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedState, setSelectedState] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');

  // Horários disponíveis dinamicamente
  const availableTimes = useMemo(() => {
    const times = new Set(jdbResults.filter(r => r.status === 'PUBLICADO').map(r => r.time));
    return Array.from(times).sort();
  }, [jdbResults]);

  // Resultados filtrados
  const filteredResults = useMemo(() => {
    return jdbResults.filter(r => {
      if (r.status !== 'PUBLICADO') return false;
      const matchDate = r.date === date;
      const matchState = selectedState === 'all' || r.stateCode === selectedState;
      const matchTime = selectedTime === 'all' || r.time === selectedTime;
      return matchDate && matchState && matchTime;
    }).sort((a, b) => b.time.localeCompare(a.time));
  }, [jdbResults, date, selectedState, selectedTime]);

  const handleShare = async (result: any) => {
    const prizesText = result.prizes
      .map((p: any) => `${p.position}º ${p.milhar} - Gr. ${p.grupo} - ${p.animal.toUpperCase()}`)
      .join('\n');

    const message = `🏆 *RESULTADO OFICIAL*
📅 Data: ${new Date(result.date + 'T12:00:00').toLocaleDateString('pt-BR')}
⏰ Horário: ${result.time}
📍 Estado: ${result.stateName}
🎰 Loteria: ${result.extractionName}

${prizesText}

✅ *Confira no LotoHub*`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Resultado ${result.extractionName}`, text: message });
      } catch (err) {
        copyToClipboard(message);
      }
    } else {
      copyToClipboard(message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Resultado formatado para WhatsApp." });
  };

  const handlePrint = (result: any) => {
    const printData = {
      banca: 'LOTOHUB',
      ticketId: 'EXTRAÇÃO',
      terminal: result.extractionName,
      datetime: `${new Date(result.date + 'T12:00:00').toLocaleDateString('pt-BR')} - ${result.time}`,
      jogo: 'JOGO DO BICHO',
      cliente: result.stateName,
      vendedor: 'Sistema Oficial',
      apostas: result.prizes.map((p: any) => ({
        modalidade: `${p.position}º PRÊMIO`,
        numero: `${p.milhar} - ${p.animal.toUpperCase()}`,
        valor: `Gr. ${p.grupo}`
      })),
      total: 'RESULTADO PUBLICADO',
      possivelRetorno: 'BOA SORTE'
    };

    localStorage.setItem('PRINT_TICKET_DATA', JSON.stringify(printData));
    window.open('/impressao.html', 'ImpressaoLotoHub', 'width=400,height=600');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Resultados</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Extrações Oficiais por Região</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => { setDate(new Date().toISOString().split('T')[0]); setSelectedState('all'); setSelectedTime('all'); }}
            className="h-9 border-white/10 text-[10px] uppercase font-black"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>

        <Card className="border-white/10 bg-card/50 shadow-xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-9 h-11 bg-black/20 border-white/10 font-bold" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Estado</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="pl-9 h-11 bg-black/20 border-white/10 font-bold">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Estados</SelectItem>
                      {JDB_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="pl-9 h-11 bg-black/20 border-white/10 font-bold">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Horários</SelectItem>
                      {availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredResults.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <Search className="h-12 w-12 mx-auto text-slate-700 mb-4" />
              <p className="text-muted-foreground font-bold uppercase text-xs">Nenhum resultado encontrado.</p>
            </div>
          ) : (
            filteredResults.map((res) => (
              <Card key={res.id} className="border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden group">
                <div className="bg-white/5 p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black uppercase italic text-white leading-none">{res.extractionName}</h3>
                        <Badge variant="secondary" className="text-[8px] h-4 bg-white/5 border-white/10">{res.stateCode}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">{res.time} • {new Date(res.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleShare(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 hover:bg-primary hover:text-black gap-2"><Share2 size={14} /> Compartilhar</Button>
                    <Button onClick={() => handlePrint(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 hover:bg-white/10 gap-2"><Printer size={14} /> Imprimir</Button>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    <div className="divide-y divide-white/5">
                      {res.prizes.slice(0, 3).map((p: any, idx: number) => (
                        <PrizeRow key={`row-1-${idx}`} p={p} />
                      ))}
                    </div>
                    <div className="divide-y divide-white/5">
                      {res.prizes.slice(3, 5).map((p: any, idx: number) => (
                        <PrizeRow key={`row-2-${idx}`} p={p} />
                      ))}
                      <div className="p-4 flex items-center justify-center bg-black/20 h-full">
                         <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest italic">LotoHub Cloud Sync</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function PrizeRow({ p }: { p: any }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-4">
        <span className="text-xs font-black text-slate-500 w-6">{p.position}º</span>
        <span className="text-2xl font-black font-mono text-white tracking-tighter">{p.milhar}</span>
      </div>
      <div className="text-right">
        <p className="text-xs font-black text-primary uppercase italic leading-none">{p.animal}</p>
        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Gr: {p.grupo}</p>
      </div>
    </div>
  );
}
