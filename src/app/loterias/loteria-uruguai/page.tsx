
'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Aposta, useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { TicketDialog } from '@/components/ticket-dialog';
import { Badge } from '@/components/ui/badge';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';

// Type for a single bet item
interface ApostaItem {
  id: number;
  dataAposta: 'hoje' | 'amanha';
  modalidade: string;
  modalidadeLabel: string;
  premio: string;
  numero: string;
  valor: string;
  horario: string;
  retornoPossivel: number;
}

export default function QuinielaPage() {
  const [step, setStep] = useState(1);
  const { handleFinalizarAposta, apostas } = useAppContext();
  const { toast } = useToast();

  // Form state
  const [apostaData, setApostaData] = useState<'hoje' | 'amanha' | undefined>();
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [numeros, setNumeros] = useState<string[]>([]);
  const [numeroInput, setNumeroInput] = useState('');
  const [premio, setPremio] = useState<string | undefined>();
  const [horario, setHorario] = useState<string | undefined>();
  const [valor, setValor] = useState('');
  const [horariosSorteio, setHorariosSorteio] = useState<string[]>([]);

  // Ticket state
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  
  // Summary state
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);
  
  const isHorarioDisponivel = (horarioStr: string, diaAposta: 'hoje' | 'amanha'): boolean => {
    if (!horarioStr || typeof horarioStr !== 'string') return false;
    
    if (diaAposta === 'amanha') return true;

    const agora = new Date();
    const parts = horarioStr.split(':');
    
    if (parts.length !== 2) return false;

    const horas = Number(parts[0]);
    const minutos = Number(parts[1]);

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      return false;
    }

    const horarioSorteio = new Date();
    horarioSorteio.setHours(horas, minutos, 0, 0);

    // Margem de segurança de 1 minuto (60.000 ms)
    const margemSeguranca = 60 * 1000;

    return agora.getTime() < (horarioSorteio.getTime() - margemSeguranca);
  };

  useEffect(() => {
    const getHorariosBase = () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

      if (dayOfWeek === 6) { // Saturday
        return ['21:00'];
      }
      if (dayOfWeek === 0) { // Sunday
        return [];
      }
      return ['15:00', '21:00']; // Monday to Friday
    };
    setHorariosSorteio(getHorariosBase().filter(h => isHorarioDisponivel(h, apostaData || 'hoje')));
  }, [apostaData]);

  const modalidades = [
    { id: '3-digitos', nome: '3 Dígitos', multiplicador: '500x' },
    { id: '2-digitos', nome: '2 Dígitos', multiplicador: '70x' },
    { id: '1-digito', nome: '1 Dígito', multiplicador: '7x' },
    { id: 'aposta-dupla', nome: 'Aposta Dupla', multiplicador: '??' }, 
  ];

  const premiosOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());

  const resetFullForm = () => {
    setStep(1);
    setApostaData(undefined);
    setModalidade(undefined);
    setNumeros([]);
    setNumeroInput('');
    setPremio(undefined);
    setHorario(undefined);
    setValor('');
  };

  const getNumeroInputDetails = () => {
      switch(modalidade) {
          case '3-digitos': return { maxLength: 3, placeholder: '000 - 999' };
          case '2-digitos': return { maxLength: 2, placeholder: '00 - 99' };
          case '1-digito': return { maxLength: 1, placeholder: '0 - 9' };
          default: return { maxLength: 10, placeholder: 'Digite seu número' };
      }
  }

  const handleAddNumero = () => {
    const { maxLength } = getNumeroInputDetails();
    const trimmedInput = numeroInput.trim();

    if (!trimmedInput) return;

    if (trimmedInput.length !== maxLength) {
        toast({
            variant: "destructive",
            title: "Número Inválido",
            description: `O número deve ter ${maxLength} dígitos para esta modalidade.`,
        });
        return;
    }

    if (numeros.includes(trimmedInput)) {
        toast({
            variant: "destructive",
            title: "Número Repetido",
            description: "Este número já foi adicionado.",
        });
        return;
    }

    setNumeros([...numeros, trimmedInput].sort());
    setNumeroInput('');
  };

  const handleRemoveNumero = (numeroToRemove: string) => {
    setNumeros(numeros.filter((n) => n !== numeroToRemove));
  };


  const handleAddAposta = () => {
    if (!apostaData || !modalidade || numeros.length === 0 || !premio || !horario || !valor) {
      toast({
        variant: "destructive",
        title: "Campos Incompletos",
        description: "Por favor, preencha todos os campos da aposta.",
      });
      return;
    }
    
    if (!isHorarioDisponivel(horario, apostaData)) {
        toast({
            variant: "destructive",
            title: "Horário Encerrado",
            description: "O tempo para apostar neste horário já encerrou.",
        });
        return;
    }

    const modalidadeData = modalidades.find(m => m.id === modalidade);
    if (!modalidadeData) return;
    
    const multiplicadorString = modalidadeData.multiplicador.replace(/[^0-9.]/g, '');
    const multiplicador = parseFloat(multiplicadorString) || 0;
    const valorFloat = parseFloat(valor.replace(',', '.')) || 0;
    const premioFloat = parseFloat(premio) || 1;
    
    const novasApostas: ApostaItem[] = numeros.map(num => {
        const retornoPossivel = (valorFloat / premioFloat) * multiplicador;
        return {
            id: Date.now() + Math.random(),
            dataAposta: apostaData,
            modalidade: modalidade!,
            modalidadeLabel: modalidadeData.nome,
            premio: premio,
            numero: num,
            valor: valorFloat.toFixed(2).replace('.', ','),
            horario: horario,
            retornoPossivel,
        };
    });
    
    setBilhete(prev => [...prev, ...novasApostas]);
    
    // Reset for next bet item, but keep date, prize and time
    setModalidade(undefined);
    setNumeros([]);
    setNumeroInput('');
    setValor('');
    setStep(2); // Go back to choosing modality
  };
  
  const handleRemoveApostaFromBilhete = (id: number) => {
    setBilhete(bilhete.filter(aposta => aposta.id !== id));
  }
  
  const totalRetornoPossivel = bilhete.reduce((acc, aposta) => acc + aposta.retornoPossivel, 0);

  const handleFinalizarBilhete = () => {
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
    
    const numerosResumo = bilhete.map(b => `${b.modalidadeLabel}: ${b.numero}`).join('; ');
    
    const totalApostasAgrupadas = bilhete.reduce((acc, aposta) => {
      const valorAposta = parseFloat(aposta.valor.replace(',', '.'));
      return acc + valorAposta;
    }, 0)

    const novaAposta: Omit<Aposta, 'status' | 'bancaId' | 'id'> = {
      loteria: 'Loteria Uruguai',
      concurso: 'Manual',
      data: dataAposta.toLocaleString('pt-BR'),
      valor: `R$ ${totalApostasAgrupadas.toFixed(2).replace('.', ',')}`,
      numeros: numerosResumo.length > 50 ? numerosResumo.substring(0, 47) + '...' : numerosResumo,
      detalhes: bilhete,
    };
    
    const pouleId = handleFinalizarAposta(novaAposta, totalApostasAgrupadas);

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
    resetFullForm();
  }

  const getStepTitle = () => {
    switch (step) {
        case 1: return "1. Escolha a data da aposta";
        case 2: return "2. Escolha a modalidade";
        case 3: return "3. Digite seus números";
        case 4: return "4. Escolha até qual prêmio apostar";
        case 5: return "5. Escolha o horário do sorteio";
        case 6: return "6. Valor por aposta";
        default: return "";
    }
  };

  const totalFinalDoBilhete = bilhete.reduce((total, item) => total + parseFloat(item.valor.replace(',','.')), 0)

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Loteria Uruguai (Quiniela)</CardTitle>
            <CardDescription className="text-center">Siga os passos para fazer sua aposta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center relative">
              {step > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="absolute left-0 top-1/2 -translate-y-1/2">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              <h3 className="text-xl font-semibold text-center pb-2 border-b w-full">{getStepTitle()}</h3>
            </div>

            <div className="min-h-[250px] flex flex-col justify-center">
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
                  <RadioGroup value={modalidade} onValueChange={(value) => { setModalidade(value); setStep(3); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modalidades.map((item) => (
                      <div key={item.id}>
                        <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" disabled={item.id === 'aposta-dupla'}/>
                        <Label
                          htmlFor={item.id}
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                        >
                          <span className="font-bold text-sm text-center">{item.nome}</span>
                          <span className="text-xs text-muted-foreground mt-1">{item.multiplicador}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
              )}

              {step === 3 && (
                <div className="space-y-4 flex flex-col items-center">
                    <Label htmlFor="aposta-numero">Digite um ou mais números ({getNumeroInputDetails().placeholder})</Label>
                    <div className="flex gap-2 w-full max-w-xs">
                        <Input 
                            value={numeroInput} 
                            onChange={(e) => setNumeroInput(e.target.value)} 
                            id="aposta-numero" 
                            placeholder={getNumeroInputDetails().placeholder} 
                            maxLength={getNumeroInputDetails().maxLength}
                            type="number"
                            className="text-center text-lg" 
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNumero()}
                        />
                        <Button onClick={handleAddNumero}>Adicionar</Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 min-h-[48px] p-2 bg-muted rounded-md w-full max-w-xs">
                        {numeros.length === 0 ? <span className="text-sm text-muted-foreground">Nenhum número adicionado.</span>
                        : numeros.map(n => (
                          <Badge key={n} variant="secondary" className="text-base gap-1">
                            {n}
                            <button onClick={() => handleRemoveNumero(n)} className="rounded-full hover:bg-destructive/20 p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                    <Button className="w-full max-w-xs" onClick={() => setStep(4)} disabled={numeros.length === 0}>Próximo</Button>
                </div>
              )}
              
              {step === 4 && (
                <div className="space-y-4 flex flex-col items-center">
                    <Label>Apostar nos prêmios de 1 até:</Label>
                    <Select value={premio} onValueChange={(value) => setPremio(value)}>
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Selecione o prêmio" />
                        </SelectTrigger>
                        <SelectContent>
                            {premiosOptions.map(p => <SelectItem key={p} value={p}>{p}º Prémio</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button className="w-full max-w-xs" onClick={() => setStep(5)} disabled={!premio}>Próximo</Button>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 flex flex-col items-center">
                    <Label>Horário do Sorteio</Label>
                    {horariosSorteio.length > 0 ? (
                        <RadioGroup value={horario} onValueChange={(value) => { setHorario(value); }} className="grid grid-cols-2 gap-4">
                            {horariosSorteio.map((h) => (
                                <div key={h}>
                                    <RadioGroupItem value={h} id={`horario-${h}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`horario-${h}`}
                                        className="flex h-full items-center justify-center rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center"
                                    >
                                        {h}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    ) : (
                        <p className="text-muted-foreground text-center">Não há sorteios com apostas abertas para hoje.</p>
                    )}
                    <Button className="w-full max-w-xs" onClick={() => setStep(6)} disabled={!horario}>Próximo</Button>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4 flex flex-col items-center">
                    <Label htmlFor="valor-aposta">Valor por aposta (R$)</Label>
                    <Input value={valor} onChange={(e) => setValor(e.target.value)} id="valor-aposta" type="number" placeholder="Ex: 10,00" className="text-center text-lg max-w-xs" />
                    {valor && modalidade && premio && numeros.length > 0 && (
                        <div className="mt-4 text-center p-4 bg-muted/50 rounded-lg w-full max-w-xs">
                             <p className="text-sm">Total: <span className="font-bold">R$ {(parseFloat(valor.replace(',', '.')) * numeros.length).toFixed(2).replace('.', ',')}</span></p>
                             <p className="text-sm text-muted-foreground">({numeros.length} aposta(s) de R$ {parseFloat(valor.replace(',','.')).toFixed(2).replace('.',',')})</p>
                             <p className="text-green-600 font-semibold mt-2">
                                Retorno possível por acerto: R$ {
                                    (() => {
                                        const modalidadeData = modalidades.find(m => m.id === modalidade);
                                        if (!modalidadeData) return '0,00';
                                        const multiplicadorString = modalidadeData.multiplicador.replace(/[^0-9.]/g, '');
                                        const multiplicador = parseFloat(multiplicadorString) || 0;
                                        const valorFloat = parseFloat(valor.replace(',', '.')) || 0;
                                        const premioFloat = parseFloat(premio) || 1;
                                        const retorno = (valorFloat / premioFloat) * multiplicador;
                                        return retorno.toFixed(2).replace('.', ',');
                                    })()
                                }
                             </p>
                        </div>
                    )}
                </div>
              )}
            </div>

          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full text-lg font-bold" onClick={handleAddAposta} disabled={step !== 6 || !modalidade || numeros.length === 0 || !premio || !horario || !valor}>Adicionar {numeros.length > 1 ? `${numeros.length} Apostas` : 'Aposta'} ao Bilhete</Button>
          </CardFooter>
        </Card>

        {/* Floating Bet Slip */}
        <LotteryBetSlip
          items={bilhete}
          totalValue={totalFinalDoBilhete}
          totalPossibleReturn={totalRetornoPossivel}
          onRemoveItem={handleRemoveApostaFromBilhete}
          onFinalize={handleFinalizarBilhete}
          lotteryName="Loteria Uruguai (Quiniela)"
        />
      </main>

      <TicketDialog
        isOpen={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        onNewBet={handleFazerNovaAposta}
        ticketId={generatedTicketId}
        generationTime={ticketGenerationTime}
        lotteryName="Loteria Uruguai (Quiniela)"
        ticketItems={bilhete}
        totalValue={totalFinalDoBilhete}
        possibleReturn={totalRetornoPossivel}
      />
    </div>
  );
}
