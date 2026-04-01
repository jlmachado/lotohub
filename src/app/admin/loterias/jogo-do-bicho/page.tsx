'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, JDBLoteria, JDBModalidade, JDBDia } from '@/context/AppContext';
import { MODALIDADES_PADRAO } from '@/constants/loterias';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const JDB_ESTADOS_PADRAO = [
  { stateName: 'Rio de Janeiro',       stateCode: 'RJ', horarios: ['09:15', '11:15', '14:15', '16:15', '18:15', '21:15'] },
  { stateName: 'São Paulo',            stateCode: 'SP', horarios: ['09:15', '11:15', '14:15', '16:15', '18:15', '21:15'] },
  { stateName: 'Bahia',                stateCode: 'BA', horarios: ['10:00', '12:00', '15:00', '19:00', '21:00'] },
  { stateName: 'Goiás',               stateCode: 'GO', horarios: ['11:00', '14:00', '16:00', '18:00', '21:00'] },
  { stateName: 'Brasília',             stateCode: 'DF', horarios: ['08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '20:30'] },
  { stateName: 'Paraíba',              stateCode: 'PB', horarios: ['10:00', '13:00', '15:00', '17:00', '19:00'] },
  { stateName: 'Minas Gerais',         stateCode: 'MG', horarios: ['12:00', '15:00', '18:00', '21:00'] },
  { stateName: 'Ceará',                stateCode: 'CE', horarios: ['14:00', '19:00'] },
  { stateName: 'Paraná',               stateCode: 'PR', horarios: ['11:00', '14:00', '18:00', '21:00'] },
  { stateName: 'Pernambuco',           stateCode: 'PE', horarios: ['11:00', '12:40', '14:00', '15:40', '17:00', '18:40'] },
  { stateName: 'Rio Grande do Norte',  stateCode: 'RN', horarios: ['11:00', '14:00', '18:00'] },
  { stateName: 'Rio Grande do Sul',    stateCode: 'RS', horarios: ['11:00', '14:00', '18:00'] },
  { stateName: 'Sergipe',              stateCode: 'SE', horarios: ['11:00', '14:00', '18:00'] },
];

const DIAS_SEMANA_TODOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface ModalidadeForm extends JDBModalidade {
  id: number; // Temporary ID for form handling
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const createInitialDiasState = (): Record<string, JDBDia> => {
    return DIAS_SEMANA.reduce((acc, dia) => ({ ...acc, [dia]: { selecionado: false, horarios: [''] } }), {});
}

export default function GerenciarJogoDoBichoPage() {
    const { toast } = useToast();
    const { jdbLoterias, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria, activeBancaId } = useAppContext();

    // Form state
    const [nomeLoteria, setNomeLoteria] = useState('');
    const [stateName, setStateName] = useState('');
    const [modalidades, setModalidades] = useState<ModalidadeForm[]>([{ id: Date.now(), nome: 'Grupo', multiplicador: '18' }]);
    const [dias, setDias] = useState<Record<string, JDBDia>>(createInitialDiasState());

    // Editing state
    const [editingLoteria, setEditingLoteria] = useState<JDBLoteria | null>(null);

    // Deleting state
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [loteriaParaExcluir, setLoteriaParaExcluir] = useState<string | null>(null);

    const handleImportarPadrao = () => {
        const jaExistentes = new Set(jdbLoterias.map((l: any) => l.stateCode));
        let criadas = 0;
        JDB_ESTADOS_PADRAO.forEach(estado => {
            if (jaExistentes.has(estado.stateCode)) return;
            const diasObj = DIAS_SEMANA_TODOS.reduce((acc: any, dia) => ({
                ...acc,
                [dia]: { selecionado: true, horarios: estado.horarios }
            }), {});
            const novaLoteria = {
                id: `jdb-${estado.stateCode.toLowerCase()}`,
                nome: estado.stateName,
                stateName: estado.stateName,
                stateCode: estado.stateCode,
                modalidades: MODALIDADES_PADRAO,
                dias: diasObj,
                bancaId: activeBancaId,
            };
            addJDBLoteria(novaLoteria);
            criadas++;
        });
        if (criadas > 0) {
            toast({ title: 'Importação concluída', description: `${criadas} loterias criadas com os estados padrão do scraper.` });
        } else {
            toast({ title: 'Nada a importar', description: 'Todos os estados já estão cadastrados.' });
        }
    };

    const handleSetPadrao = () => {
        const modalidadesComId = MODALIDADES_PADRAO.map(m => ({ ...m, id: Date.now() + Math.random() }));
        setModalidades(modalidadesComId);
        toast({ title: 'Modalidades padrão carregadas', description: 'As modalidades e multiplicadores foram preenchidos com os valores padrão.' });
    };

    // Modalidade handlers
    const addModalidade = () => setModalidades([...modalidades, { id: Date.now(), nome: '', multiplicador: '' }]);
    const removeModalidade = (id: number) => setModalidades(modalidades.filter(m => m.id !== id));
    const updateModalidade = (id: number, field: 'nome' | 'multiplicador', value: string) => {
        setModalidades(modalidades.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    // Day and Time handlers
    const toggleDia = (dia: string) => {
        setDias(prev => ({ ...prev, [dia]: { ...prev[dia], selecionado: !prev[dia].selecionado } }));
    };
    const addHorario = (dia: string) => {
        setDias(prev => ({ ...prev, [dia]: { ...prev[dia], horarios: [...prev[dia].horarios, ''] } }));
    };
    const removeHorario = (dia: string, index: number) => {
        setDias(prev => ({ ...prev, [dia]: { ...prev[dia], horarios: prev[dia].horarios.filter((_, i) => i !== index) } }));
    };
    const updateHorario = (dia: string, index: number, value: string) => {
        const novosHorarios = [...dias[dia].horarios];
        novosHorarios[index] = value;
        setDias(prev => ({ ...prev, [dia]: { ...prev[dia], horarios: novosHorarios } }));
    };

    // CRUD handlers
    const handleSave = () => {
        if (!nomeLoteria) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O nome da loteria é obrigatório.' });
            return;
        }

        if (modalidades.length === 0 || modalidades.some(m => !m.nome || !m.multiplicador)) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todas as modalidades e multiplicadores.' });
            return;
        }

        const novaLoteria: JDBLoteria = {
            id: editingLoteria ? editingLoteria.id : nomeLoteria.toLowerCase().replace(/\s+/g, '-'),
            nome: nomeLoteria,
            stateName: stateName,
            modalidades: modalidades.map(({id, ...rest}) => rest), // remove temporary form id
            dias: dias,
            bancaId: activeBancaId
        };

        if (editingLoteria) {
            updateJDBLoteria(novaLoteria);
            toast({ title: 'Sucesso', description: 'Loteria atualizada com sucesso!' });
        } else {
            addJDBLoteria(novaLoteria);
            toast({ title: 'Sucesso', description: 'Loteria criada com sucesso!' });
        }
        resetForm();
    };

    const handleEdit = (loteria: JDBLoteria) => {
        setEditingLoteria(loteria);
        setNomeLoteria(loteria.nome);
        setStateName(loteria.stateName || '');
        setModalidades(loteria.modalidades.map(m => ({ ...m, id: Date.now() + Math.random() })));
        setDias(loteria.dias);
        toast({ title: 'Modo de Edição', description: `Carregando dados para ${loteria.nome}.` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (id: string) => {
        setLoteriaParaExcluir(id);
        setDeleteAlertOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (loteriaParaExcluir) {
            deleteJDBLoteria(loteriaParaExcluir);
            toast({ title: 'Sucesso', description: 'Loteria excluída.' });
            setLoteriaParaExcluir(null);
        }
        setDeleteAlertOpen(false);
    };

    const resetForm = () => {
        setNomeLoteria('');
        setStateName('');
        setModalidades([{ id: Date.now(), nome: 'Grupo', multiplicador: '18' }]);
        setDias(createInitialDiasState());
        setEditingLoteria(null);
    };

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/loterias">
                        <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Gerenciar Jogo do Bicho</h1>
                </div>
                <Button variant="outline" onClick={handleImportarPadrao}>
                    Importar padrão do scraper
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{editingLoteria ? 'Editar Loteria' : 'Criar Nova Loteria'}</CardTitle>
                    <CardDescription>Defina nome, estado, modalidades e horários.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="nome-loteria">Nome da Loteria</Label>
                            <Input id="nome-loteria" value={nomeLoteria} onChange={(e) => setNomeLoteria(e.target.value)} placeholder="Ex: PT-RIO" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state-name">Estado</Label>
                            <Input 
                                id="state-name" 
                                value={stateName} 
                                onChange={(e) => setStateName(e.target.value)} 
                                placeholder="Ex: Rio de Janeiro, São Paulo..." 
                            />
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Modalidades e Multiplicadores</Label>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" onClick={handleSetPadrao}>Usar Padrão</Button>
                                <Button size="sm" variant="outline" onClick={addModalidade}><Plus className="mr-2 h-4 w-4"/>Adicionar</Button>
                            </div>
                        </div>
                        {modalidades.map((m, index) => (
                            <div key={m.id} className="flex items-center gap-2">
                                <Input value={m.nome} onChange={e => updateModalidade(m.id, 'nome', e.target.value)} placeholder={`Ex: Grupo`} />
                                <Input value={m.multiplicador} onChange={e => updateModalidade(m.id, 'multiplicador', e.target.value)} placeholder="Ex: 18" />
                                <Button variant="ghost" size="icon" onClick={() => removeModalidade(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <Label>Dias e Horários de Funcionamento</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {DIAS_SEMANA.map(dia => (
                                <div key={dia} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id={`dia-${dia}`} checked={dias[dia]?.selecionado || false} onCheckedChange={() => toggleDia(dia)} />
                                        <Label htmlFor={`dia-${dia}`} className="font-medium">{dia}</Label>
                                    </div>
                                    {dias[dia]?.selecionado && (
                                        <div className="space-y-2">
                                            {dias[dia].horarios.map((h, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input type="time" value={h} onChange={(e) => updateHorario(dia, index, e.target.value)} />
                                                    <Button variant="ghost" size="icon" onClick={() => removeHorario(dia, index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </div>
                                            ))}
                                            <Button size="sm" variant="secondary" className="w-full" onClick={() => addHorario(dia)}><Plus className="mr-2 h-4 w-4"/>Horário</Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <Separator />
                    <div className="flex justify-end gap-2">
                        {editingLoteria && <Button variant="outline" onClick={resetForm}>Cancelar Edição</Button>}
                        <Button onClick={handleSave}>{editingLoteria ? 'Salvar Alterações' : 'Criar Loteria'}</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Loterias Criadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                       {jdbLoterias.map(loteria => (
                            <AccordionItem value={loteria.id} key={loteria.id}>
                                <div className="flex w-full items-center">
                                    <AccordionTrigger className="flex-1 text-left">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{loteria.nome}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{loteria.stateName || 'Nacional'}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex gap-2 pr-4">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(loteria)}><Edit className="mr-2 h-4 w-4"/>Editar</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(loteria.id)}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <p className="font-semibold">Horários:</p>
                                    <p className="text-muted-foreground">{
                                       [...new Set(Object.values(loteria.dias).filter(d => d.selecionado).flatMap(d => d.horarios).filter(Boolean))].sort().join(', ')
                                    }</p>
                                    <div className="mt-2">
                                        <p className="font-semibold text-xs uppercase text-muted-foreground">Modalidades:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {loteria.modalidades.map((m, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px]">{m.nome} (x{m.multiplicador})</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                       ))}
                    </Accordion>
                </CardContent>
            </Card>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente a loteria.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setLoteriaParaExcluir(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
