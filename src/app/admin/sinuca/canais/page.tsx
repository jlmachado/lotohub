
'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, PlusCircle, Edit, Trash2, Zap, RefreshCw, 
  History, Info, ExternalLink, Copy, Check, X, Filter, 
  Video, MonitorPlay, ShieldAlert, AlertTriangle, CheckCircle2, Star, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerChannel } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { isValidYoutubeVideoId, extractYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

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
  isManualOverride: false
};

export default function AdminSinucaCanaisPage() {
    const { 
        snookerChannels, addSnookerChannel, updateSnookerChannel, 
        deleteSnookerChannel, syncSnookerFromYoutube, snookerSyncState,
        approveAutoSnookerChannel, snookerPrimaryChannelId, setManualPrimarySnookerChannel,
        snookerAutomationSettings
    } = useAppContext();
    
    const { toast } = useToast();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<FormState>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filtros
    const [filterType, setFilterType] = useState<'all' | 'manual' | 'youtube' | 'live' | 'pending' | 'invalid'>('all');

    const filteredChannels = useMemo(() => {
        let items = [...snookerChannels].filter(c => !c.isArchived);
        
        if (filterType === 'manual') items = items.filter(c => c.source === 'manual' || !c.source);
        if (filterType === 'youtube') items = items.filter(c => c.source === 'youtube');
        if (filterType === 'live') items = items.filter(c => c.status === 'live');
        if (filterType === 'pending') items = items.filter(c => c.sourceStatus === 'detected');
        if (filterType === 'invalid') items = items.filter(c => !isValidYoutubeVideoId(c.embedId));
        
        return items.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    }, [snookerChannels, filterType]);

    const handleAddNew = () => {
        setEditingId(null);
        setCurrentChannel(initialFormState);
        setIsDialogOpen(true);
    };

    const handleEdit = (channel: SnookerChannel) => {
        setEditingId(channel.id);
        const { status, odds, scoreA, scoreB, bancaId, createdAt, updatedAt, ...editableData } = channel;
        setCurrentChannel({ ...editableData, isManualOverride: channel.isManualOverride || false });
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => { setDeletingId(id); setIsDeleteAlertOpen(true); };

    const handleConfirmDelete = () => {
        if (deletingId) { deleteSnookerChannel(deletingId); toast({ title: 'Canal excluído com sucesso!' }); }
        setIsDeleteAlertOpen(false); setDeletingId(null);
    };

    const handleSave = () => {
        if (!currentChannel.title || !currentChannel.youtubeUrl || !currentChannel.scheduledAt) { toast({ variant: 'destructive', title: 'Erro', description: 'Preencha os campos obrigatórios.' }); return; }
        const embedId = extractYoutubeVideoId(currentChannel.youtubeUrl);
        if (!embedId) { toast({ variant: 'destructive', title: 'URL Inválida', description: 'O link do YouTube informado não é um vídeo real.' }); return; }
        const channelData = { ...currentChannel, embedId };
        if (editingId) { updateSnookerChannel({ ...channelData, id: editingId } as SnookerChannel); toast({ title: 'Canal atualizado!' }); }
        else { addSnookerChannel({ ...channelData, id: `manual_${Date.now()}`, source: 'manual', sourceName: 'Manual', enabled: true }); toast({ title: 'Canal manual criado!' }); }
        setIsDialogOpen(false); setEditingId(null);
    };

    const handleTogglePrimary = (id: string) => {
      const isManual = id === snookerAutomationSettings.manualPrimaryChannelId;
      setManualPrimarySnookerChannel(isManual ? null : id);
      toast({ title: isManual ? "Seleção manual removida" : "Canal fixado como principal" });
    };
    
    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Canais Sinuca</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Gestão de Transmissões Profissionais</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" disabled={isSyncing || snookerSyncState === 'syncing'} onClick={() => syncSnookerFromYoutube(true)} className="h-11 rounded-xl font-bold border-white/10 bg-white/5">
                        {(isSyncing || snookerSyncState === 'syncing') ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        Sync YouTube
                    </Button>
                    <Button onClick={handleAddNew} className="lux-shine font-black uppercase rounded-xl h-11 px-6"><PlusCircle className="mr-2 h-4 w-4" /> Novo Canal</Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <FilterBtn active={filterType === 'all'} onClick={() => setFilterType('all')} label="Todos" />
                <FilterBtn active={filterType === 'live'} onClick={() => setFilterType('live')} label="Ao Vivo" color="text-red-500" />
                <FilterBtn active={filterType === 'pending'} onClick={() => setFilterType('pending')} label="Pendentes" color="text-amber-500" />
                <FilterBtn active={filterType === 'manual'} onClick={() => setFilterType('manual')} label="Manual" />
            </div>

            <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-slate-950/50">
                        <TableRow className="border-white/5 h-10">
                            <TableHead className="text-[9px] uppercase font-black px-4">Jogo / Torneio</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Score / Rank</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Saúde / Origem</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-center">Ativo</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredChannels.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">Nenhum canal encontrado.</TableCell></TableRow>
                        ) : (
                            filteredChannels.map(channel => {
                                const isVideoValid = isValidYoutubeVideoId(channel.embedId);
                                const isPrimary = channel.id === snookerPrimaryChannelId;
                                const isForced = channel.id === snookerAutomationSettings.manualPrimaryChannelId;
                                return (
                                    <TableRow key={channel.id} className={cn("border-white/5 hover:bg-white/5 transition-colors", isPrimary && "bg-primary/5")}>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[11px] font-black text-white uppercase italic truncate">{channel.playerA.name} vs {channel.playerB.name}</span>
                                                  {isPrimary && <Star size={10} className="text-primary fill-primary" />}
                                                </div>
                                                <span className="text-[9px] text-muted-foreground truncate max-w-[180px] font-bold uppercase">{channel.tournamentName || channel.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-[10px] font-black tabular-nums border-white/10">{channel.priorityScore || 0}</Badge>
                                              <span className="text-[8px] text-slate-500 uppercase font-bold">{channel.contentType || 'match'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Badge variant="outline" className="text-[8px] h-4 uppercase opacity-60">{channel.sourceName || 'Manual'}</Badge>
                                                    <Badge className={cn("text-[7px] font-black h-4 uppercase", isVideoValid ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500")}>
                                                        {isVideoValid ? 'VÁLIDO' : 'ERRO VÍDEO'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch checked={channel.enabled} onCheckedChange={(v) => updateSnookerChannel({...channel, enabled: v})} className="scale-75" />
                                        </TableCell>
                                        <TableCell className="text-right px-4 space-x-1">
                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8", isForced ? "text-primary" : "text-white/20")} onClick={() => handleTogglePrimary(channel.id)} title="Fixar como Principal"><Star size={14} className={isForced ? "fill-primary" : ""} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => handleEdit(channel)}><Edit size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(channel.id)}><Trash2 size={14} /></Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl bg-[#0f172a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                            {editingId ? 'Editar Canal' : 'Novo Canal'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Título do Evento</Label>
                            <Input value={currentChannel.title} onChange={(e) => setCurrentChannel({ ...currentChannel, title: e.target.value })} className="h-11 bg-black/20 border-white/10" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-slate-400">URL do YouTube</Label>
                                <Input value={currentChannel.youtubeUrl} onChange={(e) => setCurrentChannel({ ...currentChannel, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="h-11 bg-black/20 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Início Agendado</Label>
                                <Input type="datetime-local" value={currentChannel.scheduledAt} onChange={(e) => setCurrentChannel({ ...currentChannel, scheduledAt: e.target.value })} className="h-11 bg-black/20 border-white/10" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-amber-500 uppercase italic">Override Manual</Label>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Impede que a automação altere os dados deste canal.</p>
                            </div>
                            <Switch checked={currentChannel.isManualOverride} onCheckedChange={(v) => setCurrentChannel({...currentChannel, isManualOverride: v})}/>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="border-white/10">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave} className="lux-shine font-black uppercase italic px-10">Salvar Canal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic">Excluir Canal?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white">Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white font-black uppercase italic">Confirmar Exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

function FilterBtn({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color?: string }) {
    return (
        <Button 
            variant={active ? 'default' : 'ghost'} 
            size="sm" 
            onClick={onClick}
            className={cn("h-8 rounded-lg text-[9px] font-black uppercase tracking-widest px-3", active && "bg-primary text-black", !active && color)}
        >
            {label}
        </Button>
    );
}
