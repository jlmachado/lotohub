'use client';

/**
 * @fileOverview Página de Aposta Jogo do Bicho Profissional.
 * Fluxo: Data > Estado > Banca > Horário > Modalidade > Números > Valor.
 */

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, MapPin, Building2, Clock, CalendarDays } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { TicketDialog } from '@/components/ticket-dialog';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';
import { cn } from '@/lib/utils';

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

const ALL_COLOCACOES = [
  { nome: '1º PRÊMIO', id: '1-premio' },
  { nome: '1º ao 2º PRÊMIO', id: '1-ao-2-premio' },
  { nome: '1º ao 3º PRÊMIO', id: '1-ao-3-premio' },
  { nome: '1º ao 4º PRÊMIO', id: '1-ao-4-premio' },
  { nome: '1º ao 5º PRÊMIO', id: '1-ao-5-premio' },
];

const MODALIDADES_DEFAULTS = [
    { nome: 'Grupo', id: 'grupo', multiplicador: 18, numeroCount: 1, digitLength: 2 },
    { nome: 'Milhar', id: 'milhar', multiplicador: 5000, numeroCount: 1, digitLength: 4 },
    { nome: 'Centena', id: 'centena', multiplicador: 700, numeroCount: 1, digitLength: 3 },
    { nome: 'Dezena', id: 'dezena', multiplicador: 60, numeroCount: 1, digitLength: 2 },
    { nome: 'Dupla de Grupo', id: 'dupla-de-grupo', multiplicador: 160, numeroCount: 2, digitLength: 2 },
    { nome: 'Terno de Grupo', id: 'terno-de-grupo', multiplicador: 1300, numeroCount: 3, digitLength: 2 },
];

export default function JogoDoBichoPage() {
  const [step, setStep] = useState(1);
  const { handleFinalizarAposta, jdbLoterias = [] } = useAppContext();
  const { toast } = useToast();

  // Selections
  const [apostaData, setApostaData] = useState<'hoje' | 'amanha' | undefined>();
  const [estadoId, setEstadoId] = useState<string | undefined>();
  const [bancaId, setBancaId] = useState<string | undefined>();
  const [horario, setHorario] = useState('');
  const [modalidade, setModalidade] = useState<string | undefined>();
  const [colocacao, setColocacao] = useState<string | undefined>();
  
  // Inputs
  const [numeroInput, setNumeroInput] = useState('');
  const [numeros, setNumeros] = useState<string[]>([]);
  const [valor, setValor] = useState('');
  
  // Workflow
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [bilhete, setBilhete] = useState<ApostaItem[]>([]);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

  // --- Logic ---

  const selectedEstado = useMemo(() => jdbLoterias.find(e => e.id === estadoId), [jdbLoterias, estadoId]);
  const selectedBanca = useMemo(() => selectedEstado?.bancas?.find(b => b.id === bancaId), [selectedEstado, bancaId]);

  const horariosDisponiveis = useMemo(() => {
    if (!selectedBanca || !apostaData) return [];
    const hoje = new Date();
    const diaSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][hoje.getDay()];
    const diaAlvo = apostaData === 'amanha'
      ? ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][(hoje.getDay() + 1) % 7]
      : diaSemana;
    
    const diaConfig = selectedBanca.dias?.[diaAlvo];
    if (!diaConfig?.selecionado) return [];

    return diaConfig.horarios
      .filter(h => h && isHorarioDisponivel(h, apostaData))
      .sort();
  }, [selectedBanca, apostaData]);

  function isHorarioDisponivel(horarioStr: string, diaAposta: 'hoje' | 'amanha'): boolean {
    if (diaAposta === 'amanha') return true;
    const agora = new Date();
    const parts = horarioStr.split(':');
    if (parts.length !== 2) return false;
    const horarioSorteio = new Date();
    horarioSorteio.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    return agora.getTime() < (horarioSorteio.getTime() - 60000);
  }

  const modalidades = useMemo(() => {
    if (!selectedEstado || !selectedEstado.modalidades?.length) return MODALIDADES_DEFAULTS;
    return MODALIDADES_DEFAULTS.map(base => {
      const custom = selectedEstado.modalidades.find(m => m.nome === base.nome);
      return custom ? { ...base, multiplicador: custom.multiplicador } : base;
    });
  }, [selectedEstado]);

  const selectedModObj = modalidades.find(m => m.id === modalidade);

  const availableColocacoes = useMemo(() => {
    if (!selectedModObj) return ALL_COLOCACOES;
    if (selectedModObj.numeroCount >= 3) return ALL_COLOCACOES.filter(c => !['1-premio', '1-ao-2-premio'].includes(c.id));
    if (selectedModObj.numeroCount >= 2) return ALL_COLOCACOES.filter(c => c.id !== '1-premio');
    return ALL_COLOCACOES;
  }, [selectedModObj]);

  const handleAddAposta = () => {
    if (!selectedEstado || !selectedBanca || !horario || !modalidade || !colocacao || !valor || !selectedModObj) return;

    const valorFloat = parseFloat(valor.replace(',', '.')) || 0;
    const divisor = colocacao === '1-premio' ? 1 : parseInt(colocacao.match(/\d+/g)?.[1] || '1');
    const retorno = (valorFloat * selectedModObj.multiplicador) / divisor;

    const novas: ApostaItem[] = (selectedModObj.numeroCount === 1 ? numeros : [numeros.join(',')]).map(nStr => ({
      id: Date.now() + Math.random(),
      dataAposta: apostaData!,
      modalidade,
      modalidadeLabel: selectedModObj.nome,
      colocacao,
      colocacaoLabel: ALL_COLOCACOES.find(c => c.id === colocacao)?.nome || '',
      loteria: selectedBanca.id,
      loteriaLabel: selectedBanca.nome,
      estadoLabel: selectedEstado.sigla,
      horario,
      numeros: nStr.split(','),
      valor: valorFloat.toFixed(2).replace('.', ','),
      retornoPossivel: retorno
    }));

    setBilhete([...bilhete, ...novas]);
    setModalidade(undefined); setColocacao(undefined); setNumeros([]); setValor('');
    setStep(5);
    toast({ title: 'Adicionado!', description: `${novas.length} aposta(s) incluída(s) no bilhete.` });
  };

  const handleFinalizarBilhete = () => {
    if (bilhete.length === 0 || isFinalizing) return;
    setIsFinalizing(true);
    const total = bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0);
    handleFinalizarAposta({
      loteria: 'Jogo do Bicho',
      concurso: 'Manual',
      data: new Date().toLocaleString('pt-BR'),
      valor: `R$ ${total.toFixed(2).replace('.', ',')}`,
      numeros: bilhete.map(b => `${b.modalidadeLabel}: ${b.numeros.join(',')}`).join('; '),
      detalhes: bilhete,
    }, total).then(id => {
      if (id) {
        setGeneratedTicketId(id);
        setTicketGenerationTime(new Date().toLocaleString('pt-BR'));
        setIsTicketDialogOpen(true);
      }
      setIsFinalizing(false);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        <Card className="shadow-2xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6">
            <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-center text-primary">Jogo do Bicho</CardTitle>
            <CardDescription className="text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Extrações Oficiais em Tempo Real</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 px-2">
              {step > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="text-muted-foreground hover:text-white"><ChevronLeft /></Button>
              )}
              <div className="flex-1 text-center">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Passo {step} de 8</p>
                <h3 className="text-lg font-black italic uppercase tracking-tight text-white">
                  {step === 1 && "Quando deseja apostar?"}
                  {step === 2 && "Escolha o Estado"}
                  {step === 3 && "Escolha a Banca"}
                  {step === 4 && "Escolha o Horário"}
                  {step === 5 && "Modalidade de Jogo"}
                  {step === 6 && "Onde deseja ganhar?"}
                  {step === 7 && "Seus Números"}
                  {step === 8 && "Valor do Palpite"}
                </h3>
              </div>
              <div className="w-10" />
            </div>

            <div className="min-h-[320px] flex flex-col justify-center animate-in fade-in duration-500">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <SelectionCard label="Hoje" sub="Extrações de agora" active={apostaData === 'hoje'} onClick={() => { setApostaData('hoje'); setStep(2); }} icon={<CalendarDays size={32}/>} />
                  <SelectionCard label="Amanhã" sub="Sorteios futuros" active={apostaData === 'amanha'} onClick={() => { setApostaData('amanha'); setStep(2); }} icon={<Clock size={32}/>} />
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {jdbLoterias.map(est => (
                    <SelectionCard key={est.id} label={est.nome} sub={est.sigla} active={estadoId === est.id} onClick={() => { setEstadoId(est.id); setStep(3); }} icon={<MapPin size={24}/>} />
                  ))}
                </div>
              )}

              {step === 3 && selectedEstado && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedEstado.bancas?.map(b => (
                    <SelectionCard key={b.id} label={b.nome} active={bancaId === b.id} onClick={() => { setBancaId(b.id); setStep(4); }} icon={<Building2 size={24}/>} />
                  ))}
                  {(!selectedEstado.bancas || selectedEstado.bancas.length === 0) && (
                    <p className="col-span-2 text-center py-12 text-muted-foreground italic">Nenhuma banca cadastrada para este estado.</p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {horariosDisponiveis.map(h => (
                    <button key={h} onClick={() => { setHorario(h); setStep(5); }} className="h-14 bg-black/40 border border-white/5 rounded-xl text-lg font-black text-white hover:border-primary transition-all shadow-inner">{h}</button>
                  ))}
                  {horariosDisponiveis.length === 0 && (
                    <p className="col-span-full text-center py-12 text-muted-foreground italic">Todas as extrações para este dia já foram encerradas.</p>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {modalidades.map(m => (
                    <button key={m.id} onClick={() => { setModalidade(m.id); setStep(6); }} className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-primary transition-all group">
                      <span className="text-[11px] font-black uppercase text-white group-hover:text-primary mb-1">{m.nome}</span>
                      <span className="text-xl font-black italic text-primary">{m.multiplicador}x</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="grid gap-3">
                  {availableColocacoes.map(c => (
                    <button key={c.id} onClick={() => { setColocacao(c.id); setStep(7); }} className="h-14 bg-black/40 border border-white/5 rounded-xl font-black uppercase italic text-sm text-white hover:border-primary hover:bg-primary/10 transition-all">{c.nome}</button>
                  ))}
                </div>
              )}

              {step === 7 && selectedModObj && (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Input 
                      value={numeroInput} 
                      onChange={e => setNumeroInput(e.target.value.replace(/\D/g, ''))} 
                      placeholder={`Digite ${selectedModObj.digitLength} dígitos...`} 
                      type="tel" maxLength={selectedModObj.digitLength}
                      className="h-14 bg-black/40 border-white/10 text-center font-black text-2xl text-primary"
                      onKeyDown={e => e.key === 'Enter' && numeroInput.length === selectedModObj.digitLength && (setNumeros([...numeros, numeroInput]), setNumeroInput(''))}
                    />
                    <Button onClick={() => { if(numeroInput.length === selectedModObj.digitLength) { setNumeros([...numeros, numeroInput]); setNumeroInput(''); } }} className="h-14 px-8 font-black uppercase italic">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {numeros.map((n, i) => (
                      <Badge key={i} className="h-10 px-4 text-lg font-black bg-primary text-black gap-2 border-0 shadow-lg">
                        {n} <X className="h-4 w-4 cursor-pointer" onClick={() => setNumeros(numeros.filter((_, idx) => idx !== i))}/>
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full h-14 rounded-xl font-black uppercase italic text-lg lux-shine" onClick={() => setStep(8)} disabled={numeros.length === 0}>Próximo Passo</Button>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-8 flex flex-col items-center">
                  <div className="w-full max-w-xs space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block text-center">Valor do Palpite (R$)</Label>
                    <Input 
                      value={valor} 
                      onChange={e => setValor(e.target.value.replace(',', '.'))} 
                      type="number" 
                      placeholder="0.00" 
                      className="text-center text-5xl font-black italic h-24 bg-black/40 border-primary/30 text-primary shadow-[0_0_30px_rgba(251,191,36,0.1)]" 
                    />
                  </div>
                  {valor && (
                    <div className="p-4 rounded-2xl bg-green-600/10 border border-green-500/20 text-center animate-in zoom-in-95">
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Retorno Máximo Estimado</p>
                      <p className="text-3xl font-black text-green-400 italic">R$ {((parseFloat(valor) * (selectedModObj?.multiplicador || 0)) / (parseInt(colocacao?.match(/\d+/g)?.[1] || '1'))).toFixed(2).replace('.', ',')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-[#020617] p-6 border-t border-white/5">
            <Button size="lg" className="w-full h-16 rounded-2xl font-black uppercase italic text-xl lux-shine bg-primary text-black" onClick={handleAddAposta} disabled={step !== 8 || !valor}>Adicionar ao Bilhete</Button>
          </CardFooter>
        </Card>

        <LotteryBetSlip 
          items={bilhete} 
          totalValue={bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0)} 
          totalPossibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} 
          onRemoveItem={(id) => setBilhete(bilhete.filter(b => b.id !== id))} 
          onFinalize={handleFinalizarBilhete} 
          lotteryName="Jogo do Bicho" 
        />
      </main>

      <TicketDialog 
        isOpen={isTicketDialogOpen} 
        onOpenChange={setIsTicketDialogOpen} 
        onNewBet={() => { setBilhete([]); setStep(1); setIsTicketDialogOpen(false); }} 
        ticketId={generatedTicketId} 
        generationTime={ticketGenerationTime} 
        lotteryName="Jogo do Bicho" 
        ticketItems={bilhete} 
        totalValue={bilhete.reduce((acc, a) => acc + parseFloat(a.valor.replace(',', '.')), 0)} 
        possibleReturn={bilhete.reduce((acc, a) => acc + a.retornoPossivel, 0)} 
      />
    </div>
  );
}

function SelectionCard({ label, sub, active, onClick, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group relative overflow-hidden",
        active ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(251,191,36,0.2)]" : "bg-black/20 border-white/5 hover:border-white/20"
      )}
    >
      <div className={cn("mb-3 transition-transform group-hover:scale-110", active ? "text-primary" : "text-slate-500")}>
        {icon}
      </div>
      <span className={cn("text-sm font-black uppercase italic leading-none mb-1", active ? "text-white" : "text-slate-400")}>{label}</span>
      {sub && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{sub}</span>}
    </button>
  );
}
