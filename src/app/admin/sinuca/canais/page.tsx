'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
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

    const overround = (1 / oddA) + (1 / oddB) + (1 / oddD);
    const realMargin = (overround - 1) * 100;

    return {
        odds: {
            A: oddA.toFixed(2),
            B: oddB.toFixed(2),
            D: oddD.toFixed(2),
        },
        probs: {
            A: (normProbA * 100).toFixed(1),
            B: (normProbB * 100).toFixed(1),
            D: (normProbD * 100).toFixed(1),
        },
        realMargin: realMargin.toFixed(2),
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
    const [preview, setPreview] = useState<ReturnType<typeof calculateOddsPreview> | null>(null);
    
    const sortedChannels = [...snookerChannels].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    useEffect(() => {
        const levelA = currentChannel.playerA.level;
        const levelB = currentChannel.playerB.level;
        const margin = currentChannel.houseMargin;

        if (!isNaN(levelA) && !isNaN(levelB) && !isNaN(margin) && levelA >= 1 && levelA <= 10 && levelB >= 1 && levelB <= 10 && margin >= 5 && margin <= 20) {
            const previewData = calculateOddsPreview(levelA, levelB, margin);
            setPreview(previewData);
        } else {
            setPreview(null);
        }
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
            toast({ variant: 'destructive', title: 'Erro', description: 'Título, URL do YouTube e Data/Hora de início são obrigatórios.' });
            return;
        }

        const now = new Date();
        const scheduledDate = new Date(currentChannel.scheduledAt);
        if (scheduledDate < now) {
            toast({
                variant: 'destructive',
                title: 'Data Inválida',
                description: 'A data de início deve ser no futuro.',
            });
            return;
        }

        const diffInMinutes = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);
        if (diffInMinutes < 30) {
            toast({
                variant: 'destructive',
                title: 'Agendamento Inválido',
                description: 'O jogo deve ser agendado com pelo menos 30 minutos de antecedência.',
            });
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
            toast({ title: 'Canal atualizado com sucesso!' });
        } else {
            addSnookerChannel(channelData);
            toast({ title: 'Canal criado com sucesso!' });
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
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Gerenciar Jogos de Sinuca</h1>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Jogos Agendados</CardTitle>
                        <CardDescription>Adicione, edite e organize os jogos de sinuca ao vivo.</CardDescription>
                    </div>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Agendar Novo Jogo</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jogo</TableHead>
                                <TableHead>Horário</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Habilitado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedChannels.map(channel => (
                                <TableRow key={channel.id}>
                                    <TableCell className="font-medium">{channel.playerA.name} vs {channel.playerB.name}</TableCell>
                                    <TableCell>{new Date(channel.scheduledAt).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(channel.status)}>
                                            {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{channel.enabled ? 'Sim' : 'Não'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(channel)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(channel.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Jogo' : 'Agendar Novo Jogo'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Título do Evento</Label>
                            <Input id="title" value={currentChannel.title} onChange={(e) => setCurrentChannel({ ...currentChannel, title: e.target.value })} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className='space-y-4 p-4 border rounded-lg'>
                                <h3 className='font-medium'>Jogador A</h3>
                                <div className="grid gap-2">
                                    <Label htmlFor="playerA-name">Nome</Label>
                                    <Input id="playerA-name" value={currentChannel.playerA.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, name: e.target.value} })} />
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="playerA-level">Nível (1-10)</Label>
                                    <Input 
                                        id="playerA-level" 
                                        type="number" 
                                        min="1" 
                                        max="10" 
                                        value={isNaN(currentChannel.playerA.level) ? '' : currentChannel.playerA.level} 
                                        onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, level: parseInt(e.target.value) || 0} })} 
                                    />
                                </div>
                            </div>
                            <div className='space-y-4 p-4 border rounded-lg'>
                                <h3 className='font-medium'>Jogador B</h3>
                                <div className="grid gap-2">
                                    <Label htmlFor="playerB-name">Nome</Label>
                                    <Input id="playerB-name" value={currentChannel.playerB.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, name: e.target.value} })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="playerB-level">Nível (1-10)</Label>
                                    <Input 
                                        id="playerB-level" 
                                        type="number" 
                                        min="1" 
                                        max="10" 
                                        value={isNaN(currentChannel.playerB.level) ? '' : currentChannel.playerB.level} 
                                        onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, level: parseInt(e.target.value) || 0} })} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="scheduledAt">Data e Hora de Início</Label>
                            <Input id="scheduledAt" type="datetime-local" value={currentChannel.scheduledAt} onChange={(e) => setCurrentChannel({ ...currentChannel, scheduledAt: e.target.value })}/>
                        </div>
                         <div className="grid md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="bestOf">Melhor de (Frames)</Label>
                                <Select value={String(currentChannel.bestOf)} onValueChange={(v) => setCurrentChannel({...currentChannel, bestOf: parseInt(v) || 1})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="7">7</SelectItem>
                                        <SelectItem value="9">9</SelectItem>
                                        <SelectItem value="11">11</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="houseMargin">Margem de Lucro (%)</Label>
                                <Input 
                                    id="houseMargin" 
                                    type="number" 
                                    min="5" 
                                    max="20" 
                                    step="0.5" 
                                    value={isNaN(currentChannel.houseMargin) ? '' : currentChannel.houseMargin} 
                                    onChange={(e) => setCurrentChannel({ ...currentChannel, houseMargin: parseFloat(e.target.value) || 0 })} 
                                />
                            </div>
                        </div>
                        {preview && (
                            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                                <h4 className="font-medium text-center">📊 Prévia das Odds</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className='p-2 rounded bg-green-500/10 text-green-500'>
                                        <strong className='text-xs'>Jogador A</strong>
                                        <p className="text-lg font-bold">{preview.odds.A}</p>
                                        <small className="text-xs opacity-80">{preview.probs.A}%</small>
                                    </div>
                                    <div className='p-2 rounded bg-amber-500/10 text-amber-500'>
                                        <strong className='text-xs'>Empate</strong>
                                        <p className="text-lg font-bold">{preview.odds.D}</p>
                                        <small className="text-xs opacity-80">{preview.probs.D}%</small>
                                    </div>
                                    <div className='p-2 rounded bg-red-500/10 text-red-500'>
                                        <strong className='text-xs'>Jogador B</strong>
                                        <p className="text-lg font-bold">{preview.odds.B}</p>
                                        <small className="text-xs opacity-80">{preview.probs.B}%</small>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-muted-foreground pt-2">Margem Real: {preview.realMargin}%</p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="youtubeUrl">URL do YouTube</Label>
                            <Input id="youtubeUrl" value={currentChannel.youtubeUrl} onChange={(e) => setCurrentChannel({ ...currentChannel, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="description">Descrição (opcional)</Label>
                            <Textarea id="description" value={currentChannel.description} onChange={(e) => setCurrentChannel({ ...currentChannel, description: e.target.value })} />
                        </div>
                         <div className="flex items-center space-x-2">
                            <Switch id="enabled" checked={currentChannel.enabled} onCheckedChange={(checked) => setCurrentChannel({...currentChannel, enabled: checked})}/>
                            <Label htmlFor="enabled">Jogo Habilitado</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o canal.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
