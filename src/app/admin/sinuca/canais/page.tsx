'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, PlusCircle, Edit, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerChannel } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';

const calculateOddsPreview = (levelA: number, levelB: number, margin: number) => {
    const diff = levelA - levelB;
    let probA = 0.45;
    let probB = 0.45;
    let probD = 0.10;

    if (diff !== 0) {
        const adjustment = Math.abs(diff) * 0.05;
        if (diff > 0) {
            probA = Math.min(0.70, 0.45 + adjustment);
            probB = Math.max(0.20, 0.45 - adjustment);
        } else {
            probA = Math.max(0.20, 0.45 - adjustment);
            probB = Math.min(0.70, 0.45 + adjustment);
        }
    }

    const totalProb = probA + probB + probD;
    const normProbA = probA / totalProb;
    const normProbB = probB / totalProb;
    const normProbD = probD / totalProb;

    const marginFactor = 1 + margin / 100;
    const oddA = 1 / (normProbA * marginFactor);
    const oddB = 1 / (normProbB * marginFactor);
    const oddD = 1 / (normProbD * marginFactor);

    return {
        odds: { A: oddA.toFixed(2), B: oddB.toFixed(2), D: oddD.toFixed(2) },
        probs: { A: (normProbA * 100).toFixed(1), B: (normProbB * 100).toFixed(1), D: (normProbD * 100).toFixed(1) }
    };
};

type FormState = Omit<SnookerChannel, 'id' | 'createdAt' | 'updatedAt' | 'bancaId' | 'status' | 'odds' | 'scoreA' | 'scoreB'>;

const initialFormState: FormState = {
  title: '',
  description: '',
  youtubeUrl: '',
  embedId: '',
  scheduledAt: '',
  playerA: { name: '', level: 5 },
  playerB: { name: '', level: 5 },
  houseMargin: 8,
  bestOf: 9,
  priority: 10,
  enabled: true,
};

const getYoutubeEmbedId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export default function AdminSinucaCanaisPage() {
    const { snookerChannels, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel } = useAppContext();
    const { toast } = useToast();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<FormState>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const sortedChannels = useMemo(() => 
        [...snookerChannels].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [snookerChannels]);

    const preview = useMemo(() => {
        const levelA = currentChannel.playerA.level;
        const levelB = currentChannel.playerB.level;
        const margin = currentChannel.houseMargin;
        if (levelA && levelB && margin) return calculateOddsPreview(levelA, levelB, margin);
        return null;
    }, [currentChannel.playerA.level, currentChannel.playerB.level, currentChannel.houseMargin]);

    const handleAddNew = () => {
        setEditingId(null);
        setCurrentChannel(initialFormState);
        setIsDialogOpen(true);
    };

    const handleEdit = (channel: SnookerChannel) => {
        setEditingId(channel.id);
        const { status, odds, scoreA, scoreB, bancaId, createdAt, updatedAt, ...editableData } = channel;
        setCurrentChannel(editableData);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsDeleteAlertOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deletingId) {
            deleteSnookerChannel(deletingId);
            toast({ title: 'Canal excluído com sucesso!' });
        }
        setIsDeleteAlertOpen(false);
        setDeletingId(null);
    };

    const handleSave = () => {
        if (!currentChannel.title || !currentChannel.youtubeUrl || !currentChannel.scheduledAt) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Título, URL do YouTube e Data de início são obrigatórios.' });
            return;
        }

        const embedId = getYoutubeEmbedId(currentChannel.youtubeUrl);
        if (!embedId) {
            toast({ variant: 'destructive', title: 'URL Inválida', description: 'A URL do YouTube não é válida.' });
            return;
        }
        
        const channelData = { ...currentChannel, embedId };

        if (editingId) {
            updateSnookerChannel({ ...channelData, id: editingId } as SnookerChannel);
            toast({ title: 'Canal atualizado!' });
        } else {
            // New channels are ALWAYS enabled by default for betting
            addSnookerChannel({ ...channelData, enabled: true });
            toast({ title: 'Canal criado e habilitado para apostas!' });
        }
        setIsDialogOpen(false);
        setEditingId(null);
    };
    
    const getStatusVariant = (status: SnookerChannel['status']) => {
        switch(status) {
            case 'live': return 'destructive';
            case 'imminent': return 'default';
            case 'scheduled': return 'secondary';
            case 'finished': return 'outline';
            default: return 'outline';
        }
    }

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestão de Canais</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Configuração de Transmissões e Odds</p>
                    </div>
                </div>
                <Button onClick={handleAddNew} className="lux-shine font-black uppercase rounded-xl"><PlusCircle className="mr-2 h-4 w-4" /> Agendar Jogo</Button>
            </div>

            <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-slate-950/50">
                        <TableRow className="border-white/5 h-10">
                            <TableHead className="text-[9px] uppercase font-black px-4">Jogo / Título</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Horário</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Status</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-center">Visível</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedChannels.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Nenhum canal agendado.</TableCell></TableRow>
                        ) : (
                            sortedChannels.map(channel => (
                                <TableRow key={channel.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="px-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-white uppercase italic">{channel.playerA.name} vs {channel.playerB.name}</span>
                                            <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{channel.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] font-mono text-slate-300">{new Date(channel.scheduledAt).toLocaleString('pt-BR')}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(channel.status)} className="text-[8px] h-4 uppercase font-black italic">
                                            {channel.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={channel.enabled ? 'default' : 'secondary'} className="text-[8px] h-4 uppercase font-black">
                                            {channel.enabled ? 'SIM' : 'NÃO'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-4 space-x-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(channel)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(channel.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl bg-[#0f172a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                            {editingId ? 'Editar Canal' : 'Agendar Novo Jogo'}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Configure os parâmetros da transmissão</p>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Título do Evento</Label>
                            <Input value={currentChannel.title} onChange={(e) => setCurrentChannel({ ...currentChannel, title: e.target.value })} className="bg-black/20 border-white/10 h-11" placeholder="Ex: Grande Final Matriz" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className='space-y-4 p-4 border border-white/5 rounded-2xl bg-black/20'>
                                <h3 className='text-xs font-black uppercase text-primary italic'>Jogador A (Mandante)</h3>
                                <div className="grid gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold">Nome</Label>
                                        <Input value={currentChannel.playerA.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, name: e.target.value} })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold">Nível Técnico (1-10)</Label>
                                        <Input type="number" min="1" max="10" value={currentChannel.playerA.level} onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, level: parseInt(e.target.value) || 1} })} className="h-9" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className='space-y-4 p-4 border border-white/5 rounded-2xl bg-black/20'>
                                <h3 className='text-xs font-black uppercase text-primary italic'>Jogador B (Visitante)</h3>
                                <div className="grid gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold">Nome</Label>
                                        <Input value={currentChannel.playerB.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, name: e.target.value} })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] uppercase font-bold">Nível Técnico (1-10)</Label>
                                        <Input type="number" min="1" max="10" value={currentChannel.playerB.level} onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, level: parseInt(e.target.value) || 1} })} className="h-9" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] uppercase font-bold">Início Agendado</Label>
                                <Input type="datetime-local" value={currentChannel.scheduledAt} onChange={(e) => setCurrentChannel({ ...currentChannel, scheduledAt: e.target.value })} className="h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] uppercase font-bold">Margem da Casa (%)</Label>
                                <Input type="number" min="1" max="30" value={currentChannel.houseMargin} onChange={(e) => setCurrentChannel({ ...currentChannel, houseMargin: parseFloat(e.target.value) || 8 })} className="h-11" />
                            </div>
                        </div>

                        {preview && (
                            <div className="p-4 border border-primary/20 rounded-2xl bg-primary/5 space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={14} className="text-primary" />
                                    <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Prévia Automática de Odds</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className='p-2 rounded-xl bg-black/40 border border-white/5'>
                                        <p className='text-[8px] uppercase font-bold opacity-50 mb-1'>Casa</p>
                                        <p className="text-lg font-black text-primary italic">@{preview.odds.A}</p>
                                    </div>
                                    <div className='p-2 rounded-xl bg-black/40 border border-white/5'>
                                        <p className='text-[8px] uppercase font-bold opacity-50 mb-1'>Empate</p>
                                        <p className="text-lg font-black text-primary italic">@{preview.odds.D}</p>
                                    </div>
                                    <div className='p-2 rounded-xl bg-black/40 border border-white/5'>
                                        <p className='text-[8px] uppercase font-bold opacity-50 mb-1'>Fora</p>
                                        <p className="text-lg font-black text-primary italic">@{preview.odds.B}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">URL da Transmissão (YouTube)</Label>
                            <Input value={currentChannel.youtubeUrl} onChange={(e) => setCurrentChannel({ ...currentChannel, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="h-11" />
                        </div>

                        <div className="flex items-center gap-2 bg-white/5 p-4 rounded-xl border border-white/10">
                            <Switch id="enabled" checked={currentChannel.enabled} onCheckedChange={(v) => setCurrentChannel({...currentChannel, enabled: v})}/>
                            <div className="space-y-0.5">
                                <Label htmlFor="enabled" className="text-sm font-bold">Habilitar Acesso</Label>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Torna o canal visível e aberto para apostas imediatamente.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-3 border-t border-white/5 pt-6 mt-4">
                        <DialogClose asChild><Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-white/10">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave} className="h-12 px-10 rounded-xl font-black uppercase italic lux-shine">
                            {editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic">Excluir Canal?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Esta ação removerá permanentemente a transmissão e o mercado deste jogo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase italic">Sim, Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
