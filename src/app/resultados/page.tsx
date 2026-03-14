'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Share2, Printer, Calendar, Clock, MapPin, Hash, RotateCcw, Loader2 } from 'lucide-react';
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
    toast({ 
      title: "Pesquisando resultados...", 
      description: "Consultando bases oficiais em tempo real para todos os estados." 
    });

    try {
      // Executa a mesma lógica de força bruta do admin
      const summary = await ResultsAutoSyncService.forceRun();
      
      if (summary) {
        if (summary.news > 0 || summary.updated > 0) {
          toast({ 
            title: "Resultados Atualizados", 
            description: `${summary.news} novas extrações encontradas e publicadas.` 
          });
        } else {
          toast({ 
            title: "Sem novidades", 
            description: "Todos os resultados disponíveis já estão importados." 
          });
        }
      }
      
      // Garante que o contexto local seja atualizado
      refreshData();
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Falha na sincronização", 
        description: "Não foi possível conectar ao servidor de extração. Tente novamente." 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedState('all');
    setSelectedTime('all');
  };

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
      } catch (err: any) {
        // Se o usuário cancelou o compartilhamento (AbortError), não fazemos nada.
        // Se foi outro erro, tentamos o clipboard como fallback.
        if (err.name !== 'AbortError') {
          // Pequeno delay para garantir que o foco retornou à janela principal
          setTimeout(() => copyToClipboard(message), 100);
        }
      }
    } else {
      copyToClipboard(message);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado para área de transferência!" });
    } catch (err) {
      console.warn('Falha ao copiar para o clipboard:', err);
      // Em caso de falha silenciosa por falta de foco, não emitimos erro para o usuário
    }
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
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Resultados Oficiais</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Extrações em Tempo Real • Todos os Estados</p>
          </div>
        </div>

        <Card className="border-white/10 bg-card/50 shadow-xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Data da Extração</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 bg-black/20 border-white/10 font-bold" />
              </div>
              
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Filtrar Estado</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="h-11 bg-black/20 border-white/10 font-bold">
                    <SelectValue placeholder="Todos os Estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    {JDB_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Horário</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="h-11 bg-black/20 border-white/10 font-bold">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4 flex gap-2">
                <Button 
                  onClick={handleSearchResults} 
                  disabled={isSearching}
                  className="flex-1 h-11 bg-primary text-black font-black uppercase italic rounded-xl lux-shine gap-2"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isSearching ? 'Buscando...' : 'Pesquisar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClear} 
                  className="h-11 px-4 border-white/10 text-[10px] uppercase font-black rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredResults.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
              <Search className="h-12 w-12 mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Nenhum resultado encontrado.</p>
              <p className="text-[10px] text-slate-600 uppercase mt-1">Tente clicar em pesquisar para atualizar os dados.</p>
            </div>
          ) : (
            filteredResults.map((res) => (
              <Card key={res.id} className="border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden group">
                <div className="bg-white/5 p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl"><Hash className="h-5 w-5 text-primary" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black uppercase italic text-white leading-none">{res.extractionName}</h3>
                        <Badge variant="secondary" className="text-[8px] h-4 bg-white/5 border-white/10">{res.stateName}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{res.time} • {new Date(res.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleShare(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 hover:bg-primary hover:text-black gap-2 transition-all">
                      <Share2 size={14} /> WhatsApp
                    </Button>
                    <Button onClick={() => handlePrint(res)} variant="outline" size="sm" className="h-9 rounded-lg font-bold border-white/10 gap-2 transition-all">
                      <Printer size={14} /> Imprimir
                    </Button>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {res.prizes.map((p: any, idx: number) => (
                      <div key={`${res.id}-p-${idx}`} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
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
                  <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center justify-center">
                     <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest italic">LotoHub Cloud Sync • {res.prizes.length} Prêmios Disponíveis</p>
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
