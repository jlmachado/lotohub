'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, MapPin } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { TicketDialog } from '@/components/ticket-dialog';
import { Switch } from '@/components/ui/switch';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';

// Define the type for a single bet item
interface ApostaItem {
  id: number;
  dataAposta: 'hoje' | 'amanha';
  modalidade: string;
  modalidadeLabel: string;
  colocacao: string;
  colocacaoLabel: string;
  loteria: string;
  loteriaLabel: string;
  estadoLabel: string;
  horario: string;
  numeros: string[];
  valor: string;
  retornoPossivel: number;
}

const gruposDoBicho = [
  { grupo: '01', animal: 'Avestruz', dezenas: ['01', '02', '03', '04'] },
  { grupo: '02', animal: 'Águia', dezenas: ['05', '06', '07', '08'] },
  { grupo: '03', animal: 'Burro', dezenas: ['09', '10', '11', '12'] },
  { grupo: '04', animal: 'Borboleta', dezenas: ['13', '14', '15', '16'] },
  { grupo: '05', animal: 'Cachorro', dezenas: ['17', '18', '19', '20'] },
  { grupo: '06', animal: 'Cabra', dezenas: ['21', '22', '23', '24'] },
  { grupo: '07', animal: 'Carneiro', dezenas: ['25', '26', '27', '28'] },
  { grupo: '08', animal: 'Camelo', dezenas: ['29', '30', '31', '32'] },
  { grupo: '09', animal: 'Cobra', dezenas: ['33', '34', '35', '36'] },
  { grupo: '10', animal: 'Coelho', dezenas: ['37', '38', '39', '40'] },
  { grupo: '11', animal: 'Cavalo', dezenas: ['41', '42', '43', '44'] },
  { grupo: '12', animal: 'Elefante', dezenas: ['45', '46', '47', '48'] },
  { grupo: '13', animal: 'Galo', dezenas: ['49', '50', '51', '52'] },
  { grupo: '14', animal: 'Gato', dezenas: ['53', '54', '55', '56'] },
  { grupo: '15', animal: 'Jacaré', dezenas: ['57', '58', '59', '60'] },
  { grupo: '16', animal: 'Leão', dezenas: ['61', '62', '63', '64'] },
  { grupo: '17', animal: 'Macaco', dezenas: ['65', '66', '67', '68'] },
  { grupo: '18', animal: 'Porco', dezenas: ['69', '70', '71', '72'] },
  { grupo: '19', animal: 'Pavão', dezenas: ['73', '74', '75', '76'] },
  { grupo: '20', animal: 'Peru', dezenas: ['77', '78', '79', '80'] },
  { grupo: '21', animal: 'Touro', dezenas: ['81', '82', '83', '84'] },
  { grupo: '22', animal: 'Tigre', dezenas: ['85', '86', '87', '88'] },
  { grupo: '23', animal: 'Urso', dezenas: ['89', '90', '91', '92'] },
  { grupo: '24', animal: 'Veado', dezenas: ['93', '94', '95', '96'] },
  { grupo: '25', animal: 'Vaca', dezenas: ['97', '98', '99', '00'] }
];

const modalidadesBase = [
    { nome: 'Grupo', id: 'grupo', multiplicador: '18x', numeroCount: 1, digitLength: 2 },
    { nome: 'Milhar', id: 'milhar', multiplicador: '5000x', numeroCount: 1, digitLength: 4 },
    { nome: 'Centena', id: 'centena', multiplicador: '700x', numeroCount: 1, digitLength: 3 },
    { nome: 'Milhar e Centena', id: 'milhar-e-centena', multiplicador: '5700x', numeroCount: 1, digitLength: 4 },
    { nome: 'Dezena', id: 'dezena', multiplicador: '60x', numeroCount: 1, digitLength: 2 },
    { nome: 'Dupla de Grupo', id: 'dupla-de-grupo', multiplicador: '160x', numeroCount: 2, digitLength: 2 },
    { nome: 'Terno de Grupo', id: 'terno-de-grupo', multiplicador: '1300x', numeroCount: 3, digitLength: 2 },
    { nome: 'Passe', id: 'passe', multiplicador: '90x', numeroCount: 2, digitLength: 2 },
    { nome: 'Passe Seco', id: 'passe-seco', multiplicador: '160x', numeroCount: 2, digitLength: 2 },
    { nome: 'Passe Vai Vem', id: 'passe-vai-vem', multiplicador: '45x', numeroCount: 2, digitLength: 2 },
    { nome: 'Duque de Dezena', id: 'duque-de-dezena', multiplicador: '300x', numeroCount: 2, digitLength: 2 },
    { nome: 'Terno de Dezena', id: 'terno-de-dezena', multiplicador: '5000x', numeroCount: 3, digitLength: 2 },
];

export default function JogoDoBichoPage() {
  const [step, setStep] = useState(1);
  const { handleFinalizarAposta, jdbLoterias } = useAppContext();
  const { toast } = useToast();

  const [apostaData, setApostaData] = useState<'hoje' | 'amanha' | undefined>();
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | undefined>();
  const [loteria, setLoteria] = useState<string | undefined>();
  const [horario, setHorario] = useState('');
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [colocacao, setColocacao] = useState<string | undefined>();
  const [numeroInput, setNumeroInput] = useState('');
  const [numeros, setNumeros] = useState<string[]>([]);
  const [valor, setValor] = useState('');
  const [divideValor, setDivideValor] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

  const loteriasEnriquecidas = useMemo(() => {
    return jdbLoterias.map(l => {
      let state = l.stateName || '';
      if (!state) {
        const nomeLower = l.nome.toLowerCase();
        if (nomeLower.includes('rio') || nomeLower.includes('rj')) state = 'Rio de Janeiro';
        else if (nomeLower.includes('são paulo') || nomeLower.includes('sp')) state = 'São Paulo';
        else if (nomeLower.includes('bahia') || nomeLower.includes('ba')) state = 'Bahia';
        else if (nomeLower.includes('goiás') || nomeLower.includes('go')) state = 'Goiás';
        else if (nomeLower.includes('brasília') || nomeLower.includes('df')) state = 'Brasília';
        else state = 'Nacional / Outros';
      }

      const horariosUnicos = new Set<string>();
      Object.values(l.dias).forEach(d => {
        if (d.selecionado) d.horarios.forEach(h => h && horariosUnicos.add(h));
      });

      return { ...l, stateName: state, horarios: Array.from(horariosUnicos).sort() };
    });
  }, [jdbLoterias]);

  const estadosDisponiveis = useMemo(() => {
    const uniqueStates = new Set(loteriasEnriquecidas.map(l => l.stateName));
    return Array.from(uniqueStates).sort();
  }, [loteriasEnriquecidas]);

  const loteriasDoEstado = useMemo(() => {
    if (!estadoSelecionado) return [];
    return loteriasEnriquecidas.filter(l => l.stateName === estadoSelecionado);
  }, [loteriasEnriquecidas, estadoSelecionado]);

  const selectedJDBLoteria = useMemo(() => jdbLoterias.find(l => l.id === loteria), [jdbLoterias, loteria]);

  const modalidades = useMemo(() => {
    if (!selectedJDBLoteria) return [];
    return modalidadesBase.map(baseMod => {
      const customMod = selectedJDBLoteria.modalidades.find(m => m.nome.toLowerCase() === baseMod.nome.toLowerCase());
      if (customMod) return { ...baseMod, multiplicador: `${customMod.multiplicador}x` };
      return baseMod;
    });
  }, [selectedJDBLoteria]);

  const isHorarioDisponivel = (horarioStr: string, diaAposta: 'hoje' | 'amanha'): boolean => {
    if (!horarioStr || typeof horarioStr !== 'string') return false;
    if (diaAposta === 'amanha') return true;
    const agora = new Date();
    const parts = horarioStr.split(':');
    if (parts.length !== 2) return false;
    const horas = Number(parts[0]);
    const minutos = Number(parts[1]);
    const horarioSorteio = new Date();
    horarioSorteio.setHours(horas, minutos, 0, 0);
    return agora.getTime() < (horarioSorteio.getTime() - 60000);
  };
  
  const selectedModalidade = modalidades.find(m => m.id === modalidade);
  const allColocacoes = [
    { nome: '1º PRÊMIO', id: '1-premio' },
    { nome: '1º ao 2º PRÊMIO', id: '1-ao-2-premio' },
    { nome: '1º ao 3º PRÊMIO', id: '1-ao-3-premio' },
    { nome: '1º ao 4º PRÊMIO', id: '1-ao-4-premio' },
    { nome: '1º ao 5º PRÊMIO', id: '1-ao-5-premio' },
  ];

  const colocacoes = useMemo(() => {
    if (!selectedModalidade) return allColocacoes;
    const { numeroCount } = selectedModalidade;
    if (numeroCount >= 3) return allColocacoes.filter(c => !['1-premio', '1-ao-2-premio'].includes(c.id));
    if (numeroCount >= 2) return allColocacoes.filter(c => c.id !== '1-premio');
    return allColocacoes;
  }, [selectedModalidade]);

  const handleGrupoClick = (grupo: string) => {
    if (!selectedModalidade) return;
    if (numeros.includes(grupo)) {
      setNumeros(numeros.filter((n) => n !== grupo));
    } else {
      if (selectedModalidade.numeroCount === 1 || numeros.length < selectedModalidade.numeroCount) {
        setNumeros([...numeros, grupo]);
      } else {
        toast({ variant: 'destructive', title: 'Limite Atingido' });
      }
    }
  };

  const resetFullForm = () => {
    setStep(1);
    setApostaData(undefined);
    setEstadoSelecionado(undefined);
    setLoteria(undefined);
    setHorario('');
    setModalidade(undefined);
    setColocacao(undefined);
    setNumeros([]);
    setValor('');
  };

  const handleAddAposta = () => {
    if (!apostaData || !modalidade || !colocacao || !loteria || !horario || !valor || !selectedModalidade) return;
    const valorTotalFloat = parseFloat(valor.replace(',', '.')) || 0;
    const divisorColocacao = colocacao === '1-premio' ? 1 : parseInt(colocacao.match(/\d+/g)?.[1] || '1');
    const multiplicador = parseFloat(selectedModalidade.multiplicador);
    const valorPorAposta = (divideValor && selectedModalidade.numeroCount === 1 && numeros.length > 1) ? valorTotalFloat / numeros.length : valorTotalFloat;

    const novasApostas: ApostaItem[] = (selectedModalidade.numeroCount === 1 ? numeros : [numeros.join(',')]).map(numStr => ({
      id: Date.now() + Math.random(),
      dataAposta: apostaData,
      modalidade,
      modalidadeLabel: selectedModalidade.nome,
      colocacao,
      colocacaoLabel: allColocacoes.find(c => c.id === colocacao)?.nome || '',
      loteria,
      loteriaLabel: loteriasEnriquecidas.find(l => l.id === loteria)?.nome || '',
      estadoLabel: estadoSelecionado || '',
      horario,
      numeros: numStr.split(','),
      valor: valorPorAposta.toFixed(2).replace('.',','),
      retornoPossivel: (valorPorAposta * multiplicador) / divisorColocacao,
    }));

    setBilhete([...bilhete, ...novasApostas]);
    setModalidade(undefined); setColocacao(undefined); setNumeros([]); setValor('');
    setStep(5);
  };

  const handleFinalizarBilhete = () => {
    if (bilhete.length === 0 || isFinalizing) return;
    setIsFinalizing(true);
    const totalBilheteValue = bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0);
    const pouleId = handleFinalizarAposta({
      loteria: 'Jogo do Bicho',
      concurso: 'Manual',
      data: new Date().toLocaleString('pt-BR'),
      valor: `R$ ${totalBilheteValue.toFixed(2).replace('.', ',')}`,
      numeros: bilhete.map(b => `${b.modalidadeLabel}: ${b.numeros.join(',')}`).join('; '),
      detalhes: bilhete,
    }, totalBilheteValue);

    if (pouleId) {
      setGeneratedTicketId(pouleId);
      setTicketGenerationTime(new Date().toLocaleString('pt-BR'));
      setIsTicketDialogOpen(true);
    }
    setIsFinalizing(false);
  };

  const getStepDescription = (stepNum: number) => {
    switch (stepNum) {
      case 1: return "Dia da Aposta";
      case 2: return "Escolha o Estado";
      case 3: return "Escolha a Loteria";
      case 4: return "Horário do Sorteio";
      case 5: return "Escolha a Modalidade";
      case 6: return "Defina a Colocação";
      case 7: return "Informe os Números";
      case 8: return "Valor da Aposta";
      default: return "";
    }
  };

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-3xl shadow-2xl border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-center text-primary">Jogo do Bicho</CardTitle>
            <CardDescription className="text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Siga os passos para gerar sua pule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center relative border-b pb-4 border-white/5">
              {step > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="absolute left-0 text-muted-foreground hover:text-white">
                  <ChevronLeft />
                </Button>
              )}
              <div className="text-center">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Passo {step}</h3>
                <p className="text-[9px] font-black uppercase text-primary tracking-widest">{getStepDescription(step)}</p>
              </div>
            </div>

            <div className="min-h-[280px] flex flex-col justify-center">
              {step === 1 && (
                <RadioGroup value={apostaData} onValueChange={(v) => { setApostaData(v as any); setStep(2); }} className="grid grid-cols-2 gap-4">
                  <Label htmlFor="d1" className="border-2 border-white/5 p-8 rounded-2xl cursor-pointer text-center hover:border-primary/50 transition-all font-black uppercase italic text-lg">Hoje <RadioGroupItem value="hoje" id="d1" className="sr-only"/></Label>
                  <Label htmlFor="d2" className="border-2 border-white/5 p-8 rounded-2xl cursor-pointer text-center hover:border-primary/50 transition-all font-black uppercase italic text-lg">Amanhã <RadioGroupItem value="amanha" id="d2" className="sr-only"/></Label>
                </RadioGroup>
              )}

              {step === 2 && (
                <RadioGroup value={estadoSelecionado} onValueChange={(v) => { setEstadoSelecionado(v); setStep(3); }} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {estadosDisponiveis.map(estado => (
                    <Label key={estado} htmlFor={estado} className="border border-white/10 bg-white/5 p-4 rounded-xl cursor-pointer text-center hover:bg-primary/10 hover:border-primary/30 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2">
                      <MapPin size={16} className="text-primary" />
                      {estado} <RadioGroupItem value={estado!} id={estado!} className="sr-only"/>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {step === 3 && (
                <RadioGroup value={loteria} onValueChange={(v) => { setLoteria(v); setStep(4); }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {loteriasDoEstado.map(l => (
                    <Label key={l.id} htmlFor={l.id} className="border border-white/10 bg-white/5 p-4 rounded-xl cursor-pointer text-center hover:bg-primary/10 hover:border-primary/30 transition-all font-black uppercase italic text-[11px]">
                      {l.nome} <RadioGroupItem value={l.id} id={l.id} className="sr-only"/>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {step === 4 && (
                <RadioGroup value={horario} onValueChange={(v) => { setHorario(v); setStep(5); }} className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {loteriasDoEstado.find(l => l.id === loteria)?.horarios.filter(h => isHorarioDisponivel(h, apostaData!)).map(h => (
                    <Label key={h} htmlFor={h} className="border border-white/10 bg-white/5 p-3 rounded-xl cursor-pointer text-center hover:border-primary font-mono font-bold text-sm">
                      {h} <RadioGroupItem value={h} id={h} className="sr-only"/>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {step === 5 && (
                <RadioGroup value={modalidade} onValueChange={(v) => { setModalidade(v); setStep(6); setNumeros([]); }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {modalidades.map(m => (
                    <Label key={m.id} htmlFor={m.id} className="border border-white/10 bg-white/5 p-4 rounded-xl cursor-pointer text-center flex flex-col hover:border-primary/50 transition-all">
                      <b className="font-black uppercase italic text-xs text-white">{m.nome}</b>
                      <small className="text-primary font-black text-[10px] mt-1">{m.multiplicador}</small>
                      <RadioGroupItem value={m.id} id={m.id} className="sr-only"/>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {step === 6 && (
                <RadioGroup value={colocacao} onValueChange={(v) => { setColocacao(v); setStep(7); }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {colocacoes.map(c => (
                    <Label key={c.id} htmlFor={c.id} className="border border-white/10 bg-white/5 p-4 rounded-xl cursor-pointer text-center hover:bg-primary/10 hover:border-primary font-black uppercase italic text-[11px]">
                      {c.nome} <RadioGroupItem value={c.id} id={c.id} className="sr-only"/>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {step === 7 && selectedModalidade && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      value={numeroInput} 
                      onChange={e => setNumeroInput(e.target.value.replace(/\D/g, ''))} 
                      placeholder={`Digite ${selectedModalidade.digitLength} dígitos`} 
                      type="tel" maxLength={selectedModalidade.digitLength}
                      className="h-12 bg-black/40 border-white/10 text-center font-bold text-lg"
                    />
                    <Button onClick={() => { if(numeroInput.length === selectedModalidade.digitLength) { setNumeros([...numeros, numeroInput]); setNumeroInput(''); } }} className="h-12 px-6 font-bold">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {numeros.map(n => (
                      <Badge key={n} variant="secondary" className="h-8 px-3 text-sm bg-primary/20 text-primary border-primary/20">
                        {n} <X className="h-3 w-3 ml-2 cursor-pointer" onClick={() => setNumeros(numeros.filter(x => x !== n))}/>
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full h-12 rounded-xl font-bold" onClick={() => setStep(8)} disabled={numeros.length === 0}>Próximo</Button>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-6 flex flex-col items-center">
                  <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Valor da Aposta (R$)</Label>
                  <Input value={valor} onChange={e => setValor(e.target.value.replace(',', '.'))} type="number" placeholder="0.00" className="text-center text-3xl font-black italic h-20 w-full max-w-xs bg-black/40 border-white/10 text-primary" />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full h-14 rounded-2xl font-black uppercase italic text-lg lux-shine" onClick={handleAddAposta} disabled={step !== 8 || !valor}>Adicionar ao Bilhete</Button>
          </CardFooter>
        </Card>

        <LotteryBetSlip items={bilhete} totalValue={bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0)} totalPossibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} onRemoveItem={(id) => setBilhete(bilhete.filter(b => b.id !== id))} onFinalize={handleFinalizarBilhete} lotteryName="Jogo do Bicho" />
      </main>

      <TicketDialog isOpen={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} onNewBet={() => { setBilhete([]); resetFullForm(); }} ticketId={generatedTicketId} generationTime={ticketGenerationTime} lotteryName="Jogo do Bicho" ticketItems={bilhete} totalValue={bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0)} possibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} />
    </div>
  );
}
