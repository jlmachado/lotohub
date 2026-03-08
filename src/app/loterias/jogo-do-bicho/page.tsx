'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, AlertCircle } from 'lucide-react';
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
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [colocacao, setColocacao] = useState<string | undefined>();
  const [numeroInput, setNumeroInput] = useState('');
  const [numeros, setNumeros] = useState<string[]>([]);
  const [loteria, setLoteria] = useState<string | undefined>();
  const [horario, setHorario] = useState('');
  const [valor, setValor] = useState('');
  const [divideValor, setDivideValor] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

  const loteriasDisponiveis = useMemo(() => jdbLoterias.map(l => {
    const horariosUnicos = new Set<string>();
    Object.values(l.dias).forEach(d => {
      if (d.selecionado) d.horarios.forEach(h => h && horariosUnicos.add(h));
    });
    return { id: l.id, nome: l.nome, horarios: Array.from(horariosUnicos).sort() };
  }), [jdbLoterias]);

  const selectedJDBLoteria = useMemo(() => jdbLoterias.find(l => l.id === loteria), [jdbLoterias, loteria]);

  const modalidades = useMemo(() => {
    if (!selectedJDBLoteria) return [];
    return modalidadesBase.map(baseMod => {
      const customMod = selectedJDBLoteria.modalidades.find(m => m.nome.toLowerCase() === baseMod.nome.toLowerCase());
      if (customMod) return { ...baseMod, multiplicador: `${customMod.multiplicador}x` };
      return baseMod; // Fallback to base
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
    if (Number.isNaN(horas) || Number.isNaN(minutos)) return false;
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

  const handleAddNumero = () => {
    if (!selectedModalidade) return;
    const trimmedInput = numeroInput.trim();
    if (!trimmedInput || trimmedInput.length !== selectedModalidade.digitLength) return;
    if (selectedModalidade.numeroCount !== 1 && numeros.length >= selectedModalidade.numeroCount) return;
    if (numeros.includes(trimmedInput)) return;
    setNumeros([...numeros, trimmedInput]);
    setNumeroInput('');
  };

  const resetFullForm = () => {
    setStep(1);
    setApostaData(undefined);
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
      loteriaLabel: loteriasDisponiveis.find(l => l.id === loteria)?.nome || '',
      horario,
      numeros: numStr.split(','),
      valor: valorPorAposta.toFixed(2).replace('.',','),
      retornoPossivel: (valorPorAposta * multiplicador) / divisorColocacao,
    }));

    setBilhete([...bilhete, ...novasApostas]);
    setModalidade(undefined);
    setColocacao(undefined);
    setNumeros([]);
    setValor('');
    setStep(4);
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

  const totalBilheteValue = bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0);
  const totalRetornoPossivel = bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0);

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Jogo do Bicho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center relative">
              {step > 1 && <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="absolute left-0"><ChevronLeft /></Button>}
              <h3 className="text-xl font-semibold text-center w-full">Passo {step}</h3>
            </div>

            <div className="min-h-[250px] flex flex-col justify-center">
              {step === 1 && (
                <RadioGroup value={apostaData} onValueChange={(v) => { setApostaData(v as any); setStep(2); }} className="grid grid-cols-2 gap-4">
                  <Label htmlFor="d1" className="border p-4 rounded-lg cursor-pointer text-center">Hoje <RadioGroupItem value="hoje" id="d1" className="sr-only"/></Label>
                  <Label htmlFor="d2" className="border p-4 rounded-lg cursor-pointer text-center">Amanhã <RadioGroupItem value="amanha" id="d2" className="sr-only"/></Label>
                </RadioGroup>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  {loteriasDisponiveis.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                      <p className="text-muted-foreground font-medium">Nenhuma loteria cadastrada no momento.</p>
                    </div>
                  ) : (
                    <RadioGroup value={loteria} onValueChange={(v) => { setLoteria(v); setStep(3); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {loteriasDisponiveis.map(l => <Label key={l.id} htmlFor={l.id} className="border p-4 rounded-lg cursor-pointer text-center">{l.nome} <RadioGroupItem value={l.id} id={l.id} className="sr-only"/></Label>)}
                    </RadioGroup>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <RadioGroup value={horario} onValueChange={setHorario} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {loteriasDisponiveis.find(l => l.id === loteria)?.horarios.filter(h => isHorarioDisponivel(h, apostaData!)).map(h => <Label key={h} htmlFor={h} className="border p-4 rounded-lg cursor-pointer text-center">{h} <RadioGroupItem value={h} id={h} className="sr-only"/></Label>)}
                  </RadioGroup>
                  <Button className="w-full" onClick={() => setStep(4)} disabled={!horario}>Próximo</Button>
                </div>
              )}
              {step === 4 && (
                <RadioGroup value={modalidade} onValueChange={(v) => { setModalidade(v); setStep(5); setNumeros([]); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {modalidades.map(m => <Label key={m.id} htmlFor={m.id} className="border p-4 rounded-lg cursor-pointer text-center flex flex-col"><b>{m.nome}</b><small>{m.multiplicador}</small><RadioGroupItem value={m.id} id={m.id} className="sr-only"/></Label>)}
                </RadioGroup>
              )}
              {step === 5 && (
                <RadioGroup value={colocacao} onValueChange={(v) => { setColocacao(v); setStep(6); }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {colocacoes.map(c => <Label key={c.id} htmlFor={c.id} className="border p-4 rounded-lg cursor-pointer text-center">{c.nome} <RadioGroupItem value={c.id} id={c.id} className="sr-only"/></Label>)}
                </RadioGroup>
              )}
              {step === 6 && selectedModalidade && (
                <div className="space-y-4">
                  {selectedModalidade.digitLength === 2 && selectedModalidade.id === 'grupo' ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                      {gruposDoBicho.map(g => <Button key={g.grupo} variant={numeros.includes(g.grupo) ? 'default' : 'outline'} onClick={() => handleGrupoClick(g.grupo)} className="flex-col h-auto"><span>{g.grupo}</span><small>{g.animal}</small></Button>)}
                    </div>
                  ) : (
                    <div className="flex gap-2"><Input value={numeroInput} onChange={e => setNumeroInput(e.target.value)} placeholder="Digite o número" type="number" maxLength={selectedModalidade.digitLength}/><Button onClick={handleAddNumero}>Add</Button></div>
                  )}
                  <div className="flex flex-wrap gap-2">{numeros.map(n => <Badge key={n} variant="secondary">{n} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setNumeros(numeros.filter(x => x !== n))}/></Badge>)}</div>
                  <Button className="w-full" onClick={() => setStep(7)} disabled={numeros.length === 0}>Próximo</Button>
                </div>
              )}
              {step === 7 && (
                <div className="space-y-4 flex flex-col items-center">
                  <Label>Valor da Aposta (R$)</Label>
                  <Input value={valor} onChange={e => setValor(e.target.value)} type="number" className="text-center text-lg max-w-xs"/>
                  {numeros.length > 1 && selectedModalidade?.numeroCount === 1 && <div className="flex items-center gap-2"><Switch checked={divideValor} onCheckedChange={setDivideValor}/><Label>Dividir valor entre as apostas</Label></div>}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full font-bold" onClick={handleAddAposta} disabled={step !== 7 || !valor}>Adicionar ao Bilhete</Button>
          </CardFooter>
        </Card>

        <LotteryBetSlip items={bilhete} totalValue={totalBilheteValue} totalPossibleReturn={totalRetornoPossivel} onRemoveItem={(id) => setBilhete(bilhete.filter(b => b.id !== id))} onFinalize={handleFinalizarBilhete} lotteryName="Jogo do Bicho" />
      </main>

      <TicketDialog isOpen={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} onNewBet={() => { setBilhete([]); resetFullForm(); }} ticketId={generatedTicketId} generationTime={ticketGenerationTime} lotteryName="Jogo do Bicho" ticketItems={bilhete} totalValue={totalBilheteValue} possibleReturn={totalRetornoPossivel} />
    </div>
  );
}
