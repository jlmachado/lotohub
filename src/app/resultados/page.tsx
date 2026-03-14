
'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Share2, Printer, Hash, RotateCcw, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { JDB_STATES } from '@/utils/jdb-constants';
import { cn } from '@/lib/utils';
import { ResultsAutoSyncService } from '@/services/results-auto-sync-service';

export default function ResultadosPublicPage() {
  const { jdbResults, refreshData } = useAppContext();
  const { toast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedState, setSelectedState] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const availableTimes = useMemo(() => {
    const times = new Set(jdbResults.filter(r => r.status === 'PUBLICADO').map(r => r.time));
    return Array.from(times).sort();
  }, [jdbResults]);

  const filteredResults = useMemo(() => {
    return jdbResults.filter(r => {
      if (r.status !== 'PUBLICADO') return false;
      const matchDate = r.date === date;
      const matchState = selectedState === 'all' || r.stateCode === selectedState;
      const matchTime = selectedTime === 'all' || r.time === selectedTime;
      return matchDate && matchState && matchTime;
    }).sort((a, b) => b.time.localeCompare(a.time));
  }, [jdbResults, date, selectedState, selectedTime]);

  const handleSearchResults = async () => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const summary = await ResultsAutoSyncService.forceRun();
      if (summary) {
        toast({ 
          title: "Resultados Atualizados", 
          description: summary.news > 0 ? `${summary.news} novas extrações encontradas.` : "Todos os resultados já estão importados."
        });
      }
      refreshData();
    } catch (error) {
      toast({ variant: "destructive", title: "Falha na sincronização" });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrint = (result: any) => {
    const ticketData = {
      banca: 'LOTOHUB',
      ticketId: 'RESULTADO OFICIAL',
      terminal: 'SINC QUADRO',
      datetime: `${new Date(result.date + 'T12:00:00').toLocaleDateString('pt-BR')} - ${result.time}`,
      jogo: `${result.stateName} - ${result.extractionName}`,
      cliente: 'Público',
      vendedor: 'Sistema',
      apostas: result.prizes.map((p: any) => ({
        modalidade: `${p.position}º PRÊMIO`,
        numero: `${p.milhar} - ${p.animal.toUpperCase()}`,
        valor: `Gr. ${p.grupo}`
      })),
      total: 'RESULTADO PUBLICADO',
      possivelRetorno: '---'
    };

    localStorage.setItem('PRINT_TICKET_DATA', JSON.stringify(ticketData));
    window.open('/impressao.html', 'ImpressaoLotoHub', 'width=400,height=600');
  };

  const handleShare = async (result: any) => {
    const prizesText = result.prizes
      .map((p: any) => `${p.position}º ${p.milhar} - Gr. ${p.grupo} - ${p.animal.toUpperCase()}`)
      .join('\n');

    const message = `🏆 *RESULTADO OFICIAL*
📅 *DATA:* ${new Date(result.date + 'T12:00:00').toLocaleDateString('pt-BR')}
⏰ *HORA:* ${result.time}
📍 *ESTADO:* ${result.stateName}
🎰 *BANCA:* ${result.extractionName}

${prizesText}

✅ _Consulte no painel LotoHub_`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Resultado ${result.extractionName}`, text: message });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setTimeout(() => navigator.clipboard.writeText(message), 100);
        }
      }
    } else {
      navigator.clipboard.writeText(message);
      toast({ title: "Copiado para o WhatsApp!" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Resultados Oficiais</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Extrações em Tempo Real • Todas as Bancas</p>
        </div>

        <Card className="border-white/10 bg-card/50 shadow-xl">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 bg-black/20 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Estado</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-11 bg-black/20 border-white/10"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  {JDB_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Horário</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-11 bg-black/20 border-white/10"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearchResults} disabled={isSearching} className="flex-1 h-11 bg-primary text-black font-black uppercase italic rounded-xl lux-shine">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Pesquisar
              </Button>
              <Button variant="outline" onClick={() => { setDate(new Date().toISOString().split('T')[0]); setSelectedState('all'); setSelectedTime('all'); }} className="h-11 px-4 border-white/10"><RotateCcw size={18} /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredResults.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
              <p className="font-bold uppercase text-xs tracking-widest">Nenhum resultado disponível para estes filtros.</p>
            </div>
          ) : (
            filteredResults.map((res) => (
              <Card key={res.id} className="border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden">
                <div className="bg-white/5 p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary"><Hash size={20} /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black uppercase italic text-white leading-none">{res.extractionName}</h3>
                        <Badge variant="secondary" className="text-[8px] h-4">{res.stateName}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{res.time} • {new Date(res.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleShare(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 hover:bg-primary hover:text-black gap-2"><Share2 size={14} /> WhatsApp</Button>
                    <Button onClick={() => handlePrint(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 gap-2"><Printer size={14} /> Imprimir</Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {res.prizes.map((p: any, idx: number) => (
                      <div key={`${res.id}-${idx}`} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 w-5">{p.position}º</span>
                          <span className="text-xl font-black font-mono text-white tracking-tighter">{p.milhar}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary uppercase italic leading-none">{p.animal}</p>
                          <p className="text-[8px] text-muted-foreground font-bold uppercase mt-1">Gr: {p.grupo}</p>
                        </div>
                      </div>
                    ))}
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
