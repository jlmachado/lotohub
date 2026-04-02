'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, ChevronLeft, Building2, MapPin, PlusCircle, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, JDBEstado, JDBBanca } from '@/context/AppContext';
import { MODALIDADES_PADRAO } from '@/constants/loterias';

const JDB_ESTADOS_PADRAO = [
  { stateName: 'Rio de Janeiro', stateCode: 'RJ', bancas: [{ nome: 'PT Rio', horarios: ['09:15', '11:15', '14:15', '16:15', '18:15', '21:15'] }] },
  { stateName: 'São Paulo', stateCode: 'SP', bancas: [
    { nome: 'PTSP', horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
    { nome: 'Bandeirantes', horarios: ['15:30', '17:20', '19:00'] }
  ]},
  { stateName: 'Bahia', stateCode: 'BA', bancas: [{ nome: 'Paratodos', horarios: ['10:00', '12:00', '15:00', '19:00', '21:00'] }] },
  { stateName: 'Goiás', stateCode: 'GO', bancas: [{ nome: 'Look', horarios: ['11:00', '14:00', '16:00', '18:00', '21:00'] }] },
  { stateName: 'Brasília', stateCode: 'DF', bancas: [{ nome: 'LBR', horarios: ['08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '20:30'] }] },
];

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const createInitialDiasState = (horarios: string[] = []) => {
    return DIAS_SEMANA.reduce((acc, dia) => ({ ...acc, [dia]: { selecionado: true, horarios } }), {});
}

export default function GerenciarJogoDoBichoPage() {
    const { toast } = useToast();
    const { jdbLoterias, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria, activeBancaId } = useAppContext();

    // UI state
    const [isEditing, setIsEditing] = useState(false);
    const [currentEstadoId, setCurrentEstadoId] = useState<string | null>(null);
    
    // Form state (Estado)
    const [nomeEstado, setNomeEstado] = useState('');
    const [siglaEstado, setSiglaEstado] = useState('');
    const [modalidades, setModalidades] = useState(MODALIDADES_PADRAO.map(m => ({ nome: m.nome, multiplicador: parseInt(m.multiplicador) })));
    const [bancas, setBancas] = useState<JDBBanca[]>([]);

    // Form state (Adding Bank)
    const [newBankName, setNewBankName] = useState('');

    const handleImportarPadrao = () => {
        const jaExistentes = new Set(jdbLoterias.map(l => l.sigla));
        let criadas = 0;
        JDB_ESTADOS_PADRAO.forEach(est => {
            if (jaExistentes.has(est.stateCode)) return;
            const id = `jdb-${est.stateCode.toLowerCase()}`;
            
            const novasBancas: JDBBanca[] = est.bancas.map((b, idx) => ({
                id: `bank-${est.stateCode.toLowerCase()}-${idx}`,
                nome: b.nome,
                dias: createInitialDiasState(b.horarios)
            }));

            const novoEstado: JDBEstado = {
                id,
                bancaId: activeBancaId,
                nome: est.stateName,
                sigla: est.stateCode,
                modalidades: MODALIDADES_PADRAO.map(m => ({ nome: m.nome, multiplicador: parseInt(m.multiplicador) })),
                bancas: novasBancas
            };
            addJDBLoteria(novoEstado);
            criadas++;
        });
        toast({ title: 'Importação concluída', description: `${criadas} estados adicionados com bancas reais.` });
    };

    const handleSaveEstado = () => {
        if (!nomeEstado || !siglaEstado) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nome e Sigla são obrigatórios.' });
            return;
        }

        if (bancas.length === 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Adicione pelo menos 1 banca.' });
            return;
        }

        // Validação de horários
        const bancaInvalida = bancas.find(b => {
            const algumDiaAtivo = Object.values(b.dias).some(d => d.selecionado && d.horarios.some(h => !!h));
            return !algumDiaAtivo;
        });

        if (bancaInvalida) {
            toast({ variant: 'destructive', title: 'Erro', description: `A banca "${bancaInvalida.nome}" não possui horários definidos.` });
            return;
        }

        const estadoData: JDBEstado = {
            id: currentEstadoId || `est-${siglaEstado.toLowerCase()}`,
            bancaId: activeBancaId,
            nome: nomeEstado,
            sigla: siglaEstado.toUpperCase(),
            modalidades,
            bancas
        };

        if (currentEstadoId) {
            updateJDBLoteria(estadoData);
            toast({ title: 'Sucesso', description: 'Estado atualizado.' });
        } else {
            addJDBLoteria(estadoData);
            toast({ title: 'Sucesso', description: 'Estado criado.' });
        }
        resetForm();
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentEstadoId(null);
        setNomeEstado('');
        setSiglaEstado('');
        setModalidades(MODALIDADES_PADRAO.map(m => ({ nome: m.nome, multiplicador: parseInt(m.multiplicador) })));
        setBancas([]);
    };

    const handleEditEstado = (est: JDBEstado) => {
        setIsEditing(true);
        setCurrentEstadoId(est.id);
        setNomeEstado(est.nome);
        setSiglaEstado(est.sigla);
        setModalidades(est.modalidades);
        setBancas(est.bancas || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const addBank = () => {
        if (!newBankName) return;
        const newBank: JDBBanca = {
            id: `bank-${Date.now()}`,
            nome: newBankName,
            dias: createInitialDiasState()
        };
        setBancas([...bancas, newBank]);
        setNewBankName('');
    };

    const removeBank = (id: string) => {
        setBancas(bancas.filter(b => b.id !== id));
    };

    const updateBankSchedule = (bankId: string, dia: string, field: 'selecionado' | 'horarios', value: any) => {
        setBancas(bancas.map(b => {
            if (b.id !== bankId) return b;
            return {
                ...b,
                dias: {
                    ...b.dias,
                    [dia]: { ...b.dias[dia], [field]: value }
                }
            };
        }));
    };

    const addTime = (bankId: string, dia: string) => {
        const bank = bancas.find(b => b.id === bankId);
        if (!bank) return;
        const currentTimes = bank.dias[dia].horarios;
        updateBankSchedule(bankId, dia, 'horarios', [...currentTimes, '']);
    };

    const updateTime = (bankId: string, dia: string, idx: number, val: string) => {
        const bank = bancas.find(b => b.id === bankId);
        if (!bank) return;
        const currentTimes = [...bank.dias[dia].horarios];
        currentTimes[idx] = val;
        updateBankSchedule(bankId, dia, 'horarios', currentTimes);
    };

    const removeTime = (bankId: string, dia: string, idx: number) => {
        const bank = bancas.find(b => b.id === bankId);
        if (!bank) return;
        const currentTimes = bank.dias[dia].horarios.filter((_, i) => i !== idx);
        updateBankSchedule(bankId, dia, 'horarios', currentTimes);
    };

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/loterias">
                        <Button variant="outline" size="icon"><ChevronLeft /></Button>
                    </Link>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Gerenciar Extrações</h1>
                </div>
                {!isEditing && (
                    <Button variant="outline" onClick={handleImportarPadrao} className="gap-2 font-bold uppercase text-[10px]">
                        <MapPin size={14} /> Importar Padrão Real
                    </Button>
                )}
            </div>

            <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/10 border-b border-primary/10">
                    <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                        {isEditing ? <Edit size={16}/> : <PlusCircle size={16}/>}
                        {isEditing ? `Editando: ${nomeEstado}` : 'Novo Estado / Unidade Federativa'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome do Estado</Label>
                            <Input value={nomeEstado} onChange={e => setNomeEstado(e.target.value)} placeholder="Ex: Rio de Janeiro" className="h-12 bg-black/20 border-white/10 text-lg font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sigla (UF)</Label>
                            <Input value={siglaEstado} onChange={e => setSiglaEstado(e.target.value.toUpperCase())} maxLength={2} placeholder="Ex: RJ" className="h-12 bg-black/20 border-white/10 text-lg font-black text-primary text-center" />
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-4">
                        <h3 className="text-lg font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                            <Building2 size={18} className="text-primary" /> Bancas Vinculadas
                        </h3>
                        
                        <div className="flex gap-2">
                            <Input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Nome da Banca (Ex: PT Rio, Look...)" className="bg-black/20 border-white/10" />
                            <Button onClick={addBank} className="font-bold"><Plus className="mr-1 h-4 w-4"/> Adicionar Banca</Button>
                        </div>

                        <div className="space-y-6">
                            {bancas.map(bank => (
                                <Card key={bank.id} className="border-white/5 bg-black/40">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5">
                                        <CardTitle className="text-xs font-black uppercase text-white italic">{bank.nome}</CardTitle>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBank(bank.id)}><Trash2 size={14}/></Button>
                                    </CardHeader>
                                    <CardContent className="p-4 overflow-x-auto">
                                        <div className="flex gap-4 min-w-max pb-2">
                                            {DIAS_SEMANA.map(dia => (
                                                <div key={dia} className="w-48 space-y-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox 
                                                            checked={bank.dias[dia]?.selecionado} 
                                                            onCheckedChange={(v) => updateBankSchedule(bank.id, dia, 'selecionado', !!v)}
                                                        />
                                                        <span className="text-[10px] font-black uppercase text-slate-400">{dia}</span>
                                                    </div>
                                                    {bank.dias[dia]?.selecionado && (
                                                        <div className="space-y-2">
                                                            {bank.dias[dia].horarios.map((time, tIdx) => (
                                                                <div key={tIdx} className="flex gap-1">
                                                                    <Input 
                                                                        type="time" 
                                                                        value={time} 
                                                                        onChange={e => updateTime(bank.id, dia, tIdx, e.target.value)}
                                                                        className="h-8 bg-black/20 text-[10px] border-white/10"
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50" onClick={() => removeTime(bank.id, dia, tIdx)}><X size={12}/></Button>
                                                                </div>
                                                            ))}
                                                            <Button variant="outline" size="sm" className="w-full h-7 text-[9px] font-bold uppercase border-dashed" onClick={() => addTime(bank.id, dia)}>+ Hora</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-black uppercase italic tracking-widest text-white">Configuração de Odds</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {modalidades.map((mod, idx) => (
                                <div key={idx} className="space-y-1">
                                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">{mod.nome}</Label>
                                    <Input 
                                        type="number" 
                                        value={mod.multiplicador} 
                                        onChange={e => {
                                            const newMods = [...modalidades];
                                            newMods[idx].multiplicador = parseInt(e.target.value) || 0;
                                            setModalidades(newMods);
                                        }}
                                        className="h-10 bg-black/20 border-white/10 font-bold"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={resetForm} className="font-bold uppercase text-[10px]">Cancelar</Button>
                        <Button onClick={handleSaveEstado} className="lux-shine px-8 font-black uppercase italic"><Save className="mr-2 h-4 w-4" /> {isEditing ? 'Salvar Alterações' : 'Criar Estado'}</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Estados Cadastrados</h2>
                <div className="grid gap-4">
                    {jdbLoterias.map(est => (
                        <Card key={est.id} className="border-white/5 bg-slate-900/50 hover:bg-slate-900 transition-colors">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1" className="border-0">
                                    <div className="p-4 flex items-center justify-between">
                                        <AccordionTrigger className="hover:no-underline p-0 py-0 flex-1">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black italic">{est.sigla}</div>
                                                <div>
                                                    <h3 className="font-black text-sm uppercase italic text-white">{est.nome}</h3>
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{est.bancas?.length || 0} Bancas Vinculadas</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex gap-2 ml-4">
                                            <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-[10px] border-white/10" onClick={() => handleEditEstado(est)}><Edit size={14} className="mr-1.5" /> Editar</Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/50 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteJDBLoteria(est.id)}><Trash2 size={14}/></Button>
                                        </div>
                                    </div>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                            {est.bancas?.map(b => (
                                                <div key={b.id} className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                    <p className="font-black text-xs uppercase italic text-primary mb-2">{b.nome}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(b.dias).map(([dia, cfg]: any) => (
                                                            cfg.selecionado && cfg.horarios.length > 0 ? (
                                                                <Badge key={dia} variant="outline" className="text-[8px] h-4 border-white/5 bg-white/5">{dia}</Badge>
                                                            ) : null
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
