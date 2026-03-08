
'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, Dices } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Aposta, useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { TicketDialog } from '@/components/ticket-dialog';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';

// Type for a single bet item
interface ApostaItem {
  id: number;
  dataAposta: 'hoje' | 'amanha';
  modalidade: string;
  modalidadeLabel: string;
  numeros: string[];
  valor: string;
  retornoPossivel: number;
}

export default function QuininhaPage() {
  const [step, setStep] = useState(1);
  const { handleFinalizarAposta, apostas } = useAppContext();
  const { toast } = useToast();

  // Form state
  const [apostaData, setApostaData] = useState<'hoje' | 'amanha' | undefined>();
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [numeros, setNumeros] = useState<string[]>([]);
  const [valor, setValor] = useState('');
  const [apostasAbertas, setApostasAbertas] = useState(true);

  // Ticket state
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  
  // Summary state
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

  useEffect(() => {
    if (apostaData === 'amanha') {
      setApostasAbertas(true);
      return; // No need for interval if it's for tomorrow
    }
    const checkApostasAbertas = () => {
        const agora = new Date();
        const horarioLimite = new Date();
        horarioLimite.setHours(19, 55, 0, 0); // 19:55
        setApostasAbertas(agora < horarioLimite);
    };

    checkApostasAbertas();
    const interval = setInterval(checkApostasAbertas, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [apostaData]);

  const modalidades = [
    { id: 'quininha-13d', nome: 'QUININHA 13D', multiplicador: '5000x', dezenas: 13 },
    { id: 'quininha-14d', nome: 'QUININHA 14D', multiplicador: '3900x', dezenas: 14 },
    { id: 'quininha-15d', nome: 'QUININHA 15D', multiplicador: '2700x', dezenas: 15 },
    { id: 'quininha-16d', nome: 'QUININHA 16D', multiplicador: '2200x', dezenas: 16 },
    { id: 'quininha-17d', nome: 'QUININHA 17D', multiplicador: '1600x', dezenas: 17 },
    { id: 'quininha-18d', nome: 'QUININHA 18D', multiplicador: '1100x', dezenas: 18 },
    { id: 'quininha-19d', nome: 'QUININHA 19D', multiplicador: '800x', dezenas: 19 },
    { id: 'quininha-20d', nome: 'QUININHA 20D', multiplicador: '700x', dezenas: 20 },
    { id: 'quininha-25d', nome: 'QUININHA 25D', multiplicador: '180x', dezenas: 25 },
    { id: 'quininha-30d', nome: 'QUININHA 30D', multiplicador: '65x', dezenas: 30 },
    { id: 'quininha-35d', nome: 'QUININHA 35D', multiplicador: '29x', dezenas: 35 },
    { id: 'quininha-40d', nome: 'QUININHA 40D', multiplicador: '10x', dezenas: 40 },
    { id: 'quininha-45d', nome: 'QUININHA 45D', multiplicador: '7x', dezenas: 45 },
  ];

  const numerosDisponiveis = Array.from({ length: 50 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const selectedModalidade = modalidades.find(m => m.id === modalidade);

  const handleNumeroClick = (numero: string) => {
    if (!selectedModalidade) return;

    if (numeros.includes(numero)) {
      setNumeros(numeros.filter(n => n !== numero));
    } else {
      if (numeros.length < selectedModalidade.dezenas) {
        setNumeros([...numeros, numero].sort((a,b) => parseInt(a) - parseInt(b)));
      } else {
        toast({
            variant: "destructive",
            title: "Limite de números atingido",
            description: `Você só pode escolher ${selectedModalidade.dezenas} números para a modalidade ${selectedModalidade.nome}.`,
        })
      }
    }
  };

  const handleSurpresinha = () => {
    if (!selectedModalidade) return;
    
    const numerosAleatorios: string[] = [];
    while (numerosAleatorios.length < selectedModalidade.dezenas) {
      const numero = (Math.floor(Math.random() * 50) + 1).toString().padStart(2, '0');
      if (!numerosAleatorios.includes(numero)) {
        numerosAleatorios.push(numero);
      }
    }
    setNumeros(numerosAleatorios.sort((a,b) => parseInt(a) - parseInt(b)));
  };

  const resetForm = () => {
    setStep(1);
    setApostaData(undefined);
    setModalidade(undefined);
    setNumeros([]);
    setValor('');
  };

  const handleAddAposta = () => {
    if (!apostasAbertas) {
      toast({
        variant: "destructive",
        title: "Apostas Encerradas",
        description: "O tempo para apostar no sorteio de hoje já encerrou.",
      });
      return;
    }

    if (!apostaData || !modalidade || numeros.length === 0 || !valor || !selectedModalidade) {
      toast({
        variant: "destructive",
        title: "Campos Incompletos",
        description: "Por favor, preencha todos os campos da aposta.",
      });
      return;
    }
    
    if (numeros.length !== selectedModalidade.dezenas) {
        toast({
            variant: "destructive",
            title: "Seleção de Números Incorreta",
            description: `Você deve escolher exatamente ${selectedModalidade.dezenas} números para a modalidade ${selectedModalidade.nome}.`,
        });
        return;
    }

    const modalidadeLabel = selectedModalidade.nome;
    const multiplicador = parseFloat(selectedModalidade.multiplicador.replace('x', ''));
    const valorFloat = parseFloat(valor.replace(',', '.')) || 0;
    const retornoPossivel = valorFloat * multiplicador;

    const novaAposta: ApostaItem = {
      id: Date.now(),
      dataAposta: apostaData,
      modalidade,
      modalidadeLabel,
      numeros,
      valor,
      retornoPossivel,
    };
    
    setBilhete([...bilhete, novaAposta]);
    resetForm();
  };
  
  const handleRemoveApostaFromBilhete = (id: number) => {
    setBilhete(bilhete.filter(aposta => aposta.id !== id));
  }
  
  const totalBilhete = bilhete.reduce((acc, aposta) => {
    const valorAposta = parseFloat(aposta.valor.replace(',', '.')) || 0;
    return acc + valorAposta;
  }, 0);

  const totalRetornoPossivel = bilhete.reduce((acc, aposta) => acc + aposta.retornoPossivel, 0);

  const handleFinalizarBilhete = () => {
    if (!apostasAbertas) {
      toast({
        variant: "destructive",
        title: "Apostas Encerradas",
        description: "O tempo para apostar no sorteio de hoje já encerrou.",
      });
      return;
    }

    if (bilhete.length === 0) {
      toast({
        variant: "destructive",
        title: "Bilhete Vazio",
        description: "Adicione pelo menos uma aposta ao bilhete.",
      });
      return;
    }
    
    const dataAposta = new Date();
    if (bilhete[0]?.dataAposta === 'amanha') {
        dataAposta.setDate(dataAposta.getDate() + 1);
    }
    
    const numerosResumo = bilhete.map(b => `${b.modalidadeLabel}: ${b.numeros.join(',')}`).join('; ');

    const novaAposta: Omit<Aposta, 'status' | 'bancaId' | 'id'> = {
      loteria: 'Quininha',
      concurso: 'Manual',
      data: dataAposta.toLocaleString('pt-BR'),
      valor: `R$ ${totalBilhete.toFixed(2).replace('.', ',')}`,
      numeros: numerosResumo.length > 50 ? numerosResumo.substring(0, 47) + '...' : numerosResumo,
      detalhes: bilhete,
    };
    
    const pouleId = handleFinalizarAposta(novaAposta, totalBilhete);

    if (pouleId) {
      setGeneratedTicketId(pouleId);
      setTicketGenerationTime(dataAposta.toLocaleString('pt-BR'));
      setIsTicketDialogOpen(true);
    }
  };
  
  const handleFazerNovaAposta = () => {
    setIsTicketDialogOpen(false);
    setGeneratedTicketId(null);
    setTicketGenerationTime(null);
    setBilhete([]);
    resetForm();
  }

  const getStepTitle = () => {
    switch (step) {
        case 1: return "1. Escolha a data da aposta";
        case 2: return "2. Escolha a modalidade";
        case 3: return `3. Escolha ${selectedModalidade?.dezenas || ''} dezenas`;
        case 4: return "4. Valor da aposta";
        default: return "";
    }
  };

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-4xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Quininha</CardTitle>
            <CardDescription className="text-center">Sorteio diário às 20:00. Acerte as 5 dezenas e ganhe!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!apostasAbertas && apostaData === 'hoje' ? (
                <div className="min-h-[350px] flex flex-col justify-center items-center">
                    <p className="text-center text-destructive font-semibold text-lg px-4">As apostas para o sorteio de hoje estão encerradas. Volte amanhã!</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-center relative">
                    {step > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="absolute left-0 top-1/2 -translate-y-1/2">
                        <ChevronLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <h3 className="text-xl font-semibold text-center pb-2 border-b w-full">{getStepTitle()}</h3>
                    </div>

                    <div className="min-h-[350px] flex flex-col justify-center">
                     {step === 1 && (
                        <RadioGroup value={apostaData} onValueChange={(value) => { setApostaData(value as 'hoje' | 'amanha'); setStep(2); }} className="grid grid-cols-2 gap-4">
                          <div>
                            <RadioGroupItem value="hoje" id="data-hoje" className="peer sr-only" />
                            <Label
                              htmlFor="data-hoje"
                              className="flex h-full items-center justify-center rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center"
                            >
                              Para Hoje
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="amanha" id="data-amanha" className="peer sr-only" />
                            <Label
                              htmlFor="data-amanha"
                              className="flex h-full items-center justify-center rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center"
                            >
                              Para Amanhã
                            </Label>
                          </div>
                        </RadioGroup>
                    )}
                    {step === 2 && (
                        <RadioGroup value={modalidade} onValueChange={(value) => { setModalidade(value); setNumeros([]); setStep(3); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {modalidades.map((item) => (
                            <div key={item.id}>
                                <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                                <Label
                                htmlFor={item.id}
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                <span className="font-bold text-sm text-center">{item.nome}</span>
                                <span className="text-xs text-muted-foreground mt-1">{item.multiplicador}</span>
                                </Label>
                            </div>
                            ))}
                        </RadioGroup>
                    )}

                    {step === 3 && selectedModalidade && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <Badge variant="secondary" className="text-base">
                                    Selecionados: {numeros.length} / {selectedModalidade.dezenas}
                                </Badge>
                                <Button variant="outline" onClick={handleSurpresinha}><Dices className="mr-2 h-4 w-4" /> Surpresinha</Button>
                            </div>
                            <div className="grid grid-cols-10 gap-2">
                                {numerosDisponiveis.map(n => (
                                    <Button 
                                        key={n}
                                        variant={numeros.includes(n) ? 'default' : 'outline'}
                                        onClick={() => handleNumeroClick(n)}
                                        className="aspect-square h-auto text-lg"
                                    >
                                        {n}
                                    </Button>
                                ))}
                            </div>
                            <Button 
                                className="w-full mt-4" 
                                onClick={() => setStep(4)} 
                                disabled={numeros.length !== selectedModalidade.dezenas}
                            >
                                Próximo
                            </Button>
                        </div>
                    )}
                    
                    {step === 4 && (
                        <div className="space-y-4 flex flex-col items-center">
                            <Label htmlFor="valor-aposta">Valor da aposta (R$)</Label>
                            <Input value={valor} onChange={(e) => setValor(e.target.value)} id="valor-aposta" type="number" placeholder="Ex: 10,00" className="text-center text-lg max-w-xs" />
                            {valor && modalidade && (
                                <div className="mt-2 text-center text-green-600 font-semibold">
                                    <p>Possível Retorno: R$ {
                                        (() => {
                                            const modalidadeData = modalidades.find(m => m.id === modalidade);
                                            if (!modalidadeData) return '0,00';
                                            const multiplicador = parseFloat(modalidadeData.multiplicador.replace('x', ''));
                                            const valorFloat = parseFloat(valor.replace(',', '.')) || 0;
                                            const retorno = valorFloat * multiplicador;
                                            return retorno.toFixed(2).replace('.', ',');
                                        })()
                                    }</p>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </>
            )}
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full text-lg font-bold" onClick={handleAddAposta} disabled={step !== 4 || !valor || numeros.length === 0 || (!apostasAbertas && apostaData === 'hoje')}>Adicionar Aposta ao Bilhete</Button>
          </CardFooter>
        </Card>

        {/* Floating Bet Slip */}
        <LotteryBetSlip
          items={bilhete}
          totalValue={totalBilhete}
          totalPossibleReturn={totalRetornoPossivel}
          onRemoveItem={handleRemoveApostaFromBilhete}
          onFinalize={handleFinalizarBilhete}
          lotteryName="Quininha"
        />
      </main>

      <TicketDialog
        isOpen={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        onNewBet={handleFazerNovaAposta}
        ticketId={generatedTicketId}
        generationTime={ticketGenerationTime}
        lotteryName="Quininha"
        ticketItems={bilhete}
        totalValue={totalBilhete}
        possibleReturn={totalRetornoPossivel}
      />
    </div>
  );
}
