'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Share2, Printer, Hash, RotateCcw, Loader2, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { JDB_STATES } from '@/utils/jdb-constants';
import { cn } from '@/lib/utils';

export default function ResultadosPublicPage() {
  const { jdbResults, syncJDBResults } = useAppContext();
  const { toast } = useToast();

  const [date, setDate] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    syncJDBResults();
  }, [syncJDBResults]);

  const availableTimes = useMemo(() => {
    const times = new Set(jdbResults.map(r => r.time));
    return Array.from(times).sort();
  }, [jdbResults]);

  const formattedDateLabel = useMemo(() => {
    if (!date || !isMounted) return '';
    try {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
    } catch (e) {
      return '';
    }
  }, [date, isMounted]);

  const filteredResults = useMemo(() => {
    if (!isMounted || !date) return [];
    
    const localeDate = formattedDateLabel;
    console.log(`[UI] Filtering results for date: ${date} (${localeDate})`);

    const filtered = jdbResults.filter(r => {
      // Robust date match: PT-BR or ISO
      const matchDate = r.data === localeDate || r.date === date;
      const matchState = selectedState === 'all' || r.stateCode === selectedState;
      const matchTime = selectedTime === 'all' || r.time === selectedTime;
      return matchDate && matchState && matchTime;
    }).sort((a, b) => b.time.localeCompare(a.time));

    console.log(`[UI] Found ${filtered.length} matching results`);
    return filtered;
  }, [jdbResults, date, formattedDateLabel, selectedState, selectedTime, isMounted]);

  const handleSearchResults = async () => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      await syncJDBResults();
      toast({ title: "Resultados Atualizados!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha na sincronização" });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrint = (result: any) => {
    const prizes = Array.isArray(result.prizes) ? result.prizes : [];
    const firstPrize = prizes.find((p: any) => p.position === 1 || p.pos === 1);
    
    const ticketData = {
      banca: 'LOTOHUB',
      title: 'RESULTADO OFICIAL',
      ticketId: 'RES-' + result.id.split('-').pop()?.substring(0, 8),
      terminal: 'SINC QUADRO',
      datetime: `${result.data || result.date} ${result.time}`,
      estado: result.stateName,
      loteria: result.extractionName,
      horario: result.time,
      jogo: `${result.stateName} - ${result.extractionName}`,
      cliente: 'Público',
      vendedor: 'Sistema LotoHub',
      firstPrize: firstPrize ? {
        milhar: firstPrize.milhar || firstPrize.valor,
        centena: (firstPrize.milhar || firstPrize.valor || '').slice(-3),
        dezena: (firstPrize.milhar || firstPrize.valor || '').slice(-2),
        grupo: firstPrize.grupo,
        animal: firstPrize.animal || firstPrize.bicho
      } : null,
      apostas: prizes.map((p: any) => ({
        modalidade: `${p.position || p.pos}º`,
        numero: `${p.milhar || p.valor} | Gr. ${p.grupo} - ${(p.animal || p.bicho || '').toUpperCase()}`,
        valor: `Gr. ${p.grupo}`
      })),
      total: 'RESULTADO PUBLICADO',
      possivelRetorno: '---'
    };

    localStorage.setItem('PRINT_TICKET_DATA', JSON.stringify(ticketData));
    window.open('/impressao.html', '_blank');
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-8 w-64 bg-white/5 rounded" />
            <div className="h-48 w-full bg-white/5 rounded" />
          </div>
        </main>
      </div>
    );
  }

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
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Atualizar
              </Button>
              <Button variant="outline" onClick={() => { setDate(new Date().toISOString().split('T')[0]); setSelectedState('all'); setSelectedTime('all'); }} className="h-11 px-4 border-white/10"><RotateCcw size={18} /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredResults.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
              <p className="font-bold uppercase text-xs tracking-widest">Nenhum resultado disponível para {formattedDateLabel}.</p>
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
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{res.time} • {res.data || res.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handlePrint(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 gap-2"><Printer size={14} /> Imprimir</Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Array.isArray(res.prizes) ? res.prizes : []).map((p: any, idx: number) => (
                      <div key={`${res.id}-${idx}`} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 w-5">{p.position || p.pos}º</span>
                          <span className="text-xl font-black font-mono text-white tracking-tighter">{p.milhar || p.valor}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary uppercase italic leading-none">{p.animal || p.bicho}</p>
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
