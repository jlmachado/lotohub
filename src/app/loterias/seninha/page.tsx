'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, Dices } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { TicketDialog } from '@/components/ticket-dialog';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';

interface ApostaItem {
  id: number;
  dataAposta: 'hoje' | 'amanha';
  modalidade: string;
  modalidadeLabel: string;
  numeros: string[];
  valor: string;
  retornoPossivel: number;
}

export default function SeninhaPage() {
  const [step, setStep] = useState(1);
  const { handleFinalizarAposta, genericLotteryConfigs = [] } = useAppContext();
  const { toast } = useToast();

  const [apostaData, setApostaData] = useState<'hoje' | 'amanha' | undefined>();
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [numeros, setNumeros] = useState<string[]>([]);
  const [valor, setValor] = useState('');
  const [apostasAbertas, setApostasAbertas] = useState(true);
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

  // Busca multiplicadores do contexto (Admin)
  const config = useMemo(() => (genericLotteryConfigs || []).find(c => c.id === 'seninha'), [genericLotteryConfigs]);
  const modalidades = useMemo(() => config?.multiplicadores.map(m => {
    const nomeModalidade = m.modalidade || (m as any).modalability || 'Modalidade';
    return {
      id: nomeModalidade.toLowerCase().replace(/\s+/g, '-'),
      nome: nomeModalidade,
      multiplicador: m.multiplicador,
      dezenas: parseInt(nomeModalidade.match(/\d+/)?.[0] || '14')
    };
  }) || [], [config]);

  useEffect(() => {
    if (apostaData === 'amanha') { setApostasAbertas(true); return; }
    const check = () => {
        const agora = new Date();
        const limite = new Date();
        limite.setHours(19, 55, 0, 0);
        setApostasAbertas(agora < limite);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [apostaData]);

  const numerosDisponiveis = Array.from({ length: 60 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const selectedModalidade = modalidades.find(m => m.id === modalidade);

  const handleNumeroClick = (numero: string) => {
    if (!selectedModalidade) return;
    if (numeros.includes(numero)) setNumeros(numeros.filter(n => n !== numero));
    else if (numeros.length < selectedModalidade.dezenas) setNumeros([...numeros, numero].sort((a,b) => parseInt(a) - parseInt(b)));
    else toast({ variant: "destructive", title: "Limite atingido" });
  };

  const handleSurpresinha = () => {
    if (!selectedModalidade) return;
    const rnd: string[] = [];
    while (rnd.length < selectedModalidade.dezenas) {
      const n = (Math.floor(Math.random() * 60) + 1).toString().padStart(2, '0');
      if (!rnd.includes(n)) rnd.push(n);
    }
    setNumeros(rnd.sort((a,b) => parseInt(a) - parseInt(b)));
  };

  const handleAddAposta = () => {
    if (!apostasAbertas && apostaData === 'hoje') { toast({ variant: "destructive", title: "Encerradas" }); return; }
    if (!apostaData || !modalidade || numeros.length !== selectedModalidade?.dezenas || !valor) { toast({ variant: "destructive", title: "Incompleto" }); return; }

    const mult = parseFloat(selectedModalidade.multiplicador.replace('x', ''));
    const val = parseFloat(valor.replace(',', '.')) || 0;
    setBilhete([...bilhete, {
      id: Date.now(), dataAposta: apostaData, modalidade, modalidadeLabel: selectedModalidade.nome,
      numeros, valor, retornoPossivel: val * mult
    }]);
    setModalidade(undefined); setNumeros([]); setValor(''); setStep(1);
  };

  const handleFinalizarBilhete = () => {
    if (bilhete.length === 0) return;
    const total = bilhete.reduce((acc, a) => acc + (parseFloat(a.valor.replace(',', '.')) || 0), 0);
    const poule = handleFinalizarAposta({
      loteria: 'Seninha', concurso: 'Manual', data: new Date().toLocaleString('pt-BR'),
      valor: `R$ ${total.toFixed(2).replace('.', ',')}`,
      numeros: bilhete.map(b => `${b.modalidadeLabel}: ${b.numeros.join(',')}`).join('; '),
      detalhes: bilhete,
    }, total);
    if (poule) { setGeneratedTicketId(poule); setTicketGenerationTime(new Date().toLocaleString('pt-BR')); setIsTicketDialogOpen(true); }
  };

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-4xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Seninha</CardTitle>
            <CardDescription className="text-center">{config?.status === 'Ativa' ? 'Sorteio diário às 20:00.' : 'Temporariamente Inativa'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {config?.status === 'Inativa' ? (
              <p className="text-center py-12 text-muted-foreground">Este módulo está desativado pelo administrador.</p>
            ) : !apostasAbertas && apostaData === 'hoje' ? (
              <p className="text-center text-destructive font-bold py-12">Vendas encerradas para hoje.</p>
            ) : (
              <div className="min-h-[350px]">
                {step === 1 && (
                  <RadioGroup value={apostaData} onValueChange={(v: any) => { setApostaData(v); setStep(2); }} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="h" className="border p-8 rounded-xl cursor-pointer text-center font-bold">Hoje <RadioGroupItem value="hoje" id="h" className="sr-only"/></Label>
                    <Label htmlFor="a" className="border p-8 rounded-xl cursor-pointer text-center font-bold">Amanhã <RadioGroupItem value="amanha" id="a" className="sr-only"/></Label>
                  </RadioGroup>
                )}
                {step === 2 && (
                  <RadioGroup value={modalidade} onValueChange={(v) => { setModalidade(v); setStep(3); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modalidades.map(m => (
                      <Label key={m.id} htmlFor={m.id} className="border p-4 rounded-xl cursor-pointer text-center flex flex-col">
                        <span className="font-bold text-xs">{m.nome}</span>
                        <span className="text-primary font-black">{m.multiplicador}</span>
                        <RadioGroupItem value={m.id} id={m.id} className="sr-only"/>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
                {step === 3 && selectedModalidade && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><Badge className="text-lg">Faltam: {selectedModalidade.dezenas - numeros.length}</Badge><Button variant="outline" onClick={handleSurpresinha}><Dices className="mr-2 h-4 w-4"/> Surpresinha</Button></div>
                    <div className="grid grid-cols-10 gap-1.5">
                      {numerosDisponiveis.map(n => <Button key={n} variant={numeros.includes(n) ? 'default' : 'outline'} onClick={() => handleNumeroClick(n)} className="h-8 w-full p-0 text-xs font-bold">{n}</Button>)}
                    </div>
                    <Button className="w-full" onClick={() => setStep(4)} disabled={numeros.length !== selectedModalidade.dezenas}>Próximo</Button>
                  </div>
                )}
                {step === 4 && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Label>Valor da Aposta (R$)</Label>
                    <Input type="number" value={valor} onChange={e => setValor(e.target.value)} className="text-center text-2xl h-16 max-w-xs font-black" placeholder="0,00"/>
                    <Button size="lg" className="w-full max-w-xs lux-shine" onClick={handleAddAposta} disabled={!valor}>Adicionar</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <LotteryBetSlip items={bilhete} totalValue={bilhete.reduce((acc, a) => acc + (parseFloat(a.valor.replace(',','.')) || 0), 0)} totalPossibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} onRemoveItem={id => setBilhete(bilhete.filter(b => b.id !== id))} onFinalize={handleFinalizarBilhete} lotteryName="Seninha" />
      </main>
      <TicketDialog isOpen={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} onNewBet={() => { setBilhete([]); setStep(1); }} ticketId={generatedTicketId} generationTime={ticketGenerationTime} lotteryName="Seninha" ticketItems={bilhete} totalValue={bilhete.reduce((acc, a) => acc + (parseFloat(a.valor.replace(',','.')) || 0), 0)} possibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} />
    </div>
  );
}
