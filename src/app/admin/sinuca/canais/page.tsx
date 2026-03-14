'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, PlusCircle, Edit, Trash2, Zap, RefreshCw, 
  History, Info, ExternalLink, Copy, Check, X, Filter, 
  Video, MonitorPlay, ShieldAlert
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

const getYoutubeEmbedId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export default function AdminSinucaCanaisPage() {
    const { 
        snookerChannels, addSnookerChannel, updateSnookerChannel, 
        deleteSnookerChannel, syncSnookerFromYoutube, snookerSyncState,
        approveAutoSnookerChannel
    } = useAppContext();
    
    const { toast } = useToast();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<FormState>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filtros
    const [filterType, setFilterType] = useState<'all' | 'manual' | 'youtube' | 'live' | 'pending'>('all');
    const [originFilter, setOriginFilter] = useState('all');

    const filteredChannels = useMemo(() => {
        let items = [...snookerChannels].filter(c => !c.isArchived);
        
        if (filterType === 'manual') items = items.filter(c => c.source === 'manual' || !c.source);
        if (filterType === 'youtube') items = items.filter(c => c.source === 'youtube');
        if (filterType === 'live') items = items.filter(c => c.status === 'live');
        if (filterType === 'pending') items = items.filter(c => c.sourceStatus === 'detected');
        
        if (originFilter !== 'all') {
          items = items.filter(c => c.sourceId === originFilter);
        }

        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerChannels, filterType, originFilter]);

    const availableOrigins = useMemo(() => {
      const origins = new Set(snookerChannels.filter(c => c.sourceName).map(c => JSON.stringify({id: c.sourceId, name: c.sourceName})));
      return Array.from(origins).map(o => JSON.parse(o));
    }, [snookerChannels]);

    const handleAddNew = () => {
        setEditingId(null);
        setCurrentChannel(initialFormState);
        setIsDialogOpen(true);
    };

    const handleEdit = (channel: SnookerChannel) => {
        setEditingId(channel.id);
        const { status, odds, scoreA, scoreB, bancaId, createdAt, updatedAt, ...editableData } = channel;
        setCurrentChannel({
            ...editableData,
            isManualOverride: channel.isManualOverride || false
        });
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
            toast({ variant: 'destructive', title: 'Erro', description: 'Título, URL e Horário são obrigatórios.' });
            return;
        }

        const embedId = getYoutubeEmbedId(currentChannel.youtubeUrl);
        if (!embedId) {
            toast({ variant: 'destructive', title: 'URL Inválida', description: 'O link do YouTube não foi reconhecido.' });
            return;
        }
        
        const channelData = { ...currentChannel, embedId };

        if (editingId) {
            updateSnookerChannel({ ...channelData, id: editingId } as SnookerChannel);
            toast({ title: 'Canal atualizado!' });
        } else {
            addSnookerChannel({ ...channelData, source: 'manual', sourceName: 'Manual', enabled: true });
            toast({ title: 'Canal manual criado!' });
        }
        setIsDialogOpen(false);
        setEditingId(null);
    };

    const handleSyncManual = async () => {
        setIsSyncing(true);
        await syncSnookerFromYoutube(true);
        setIsSyncing(false);
    };

    const handleDuplicateAsManual = (channel: SnookerChannel) => {
        const { id, source, sourceVideoId, sourceStatus, autoCreated, ...rest } = channel;
        addSnookerChannel({
            ...rest,
            title: `${rest.title} (Manual)`,
            source: 'manual',
            sourceName: 'Manual',
            isManualOverride: true,
            enabled: true
        });
        toast({ title: 'Duplicado!', description: 'Convertido em registro manual independente.' });
    };
    
    const getStatusVariant = (status: SnookerChannel['status']) => {
        switch(status) {
            case 'live': return 'destructive';
            case 'imminent': return 'default';
            case 'scheduled': return 'secondary';
            case 'finished': return 'outline';
            default: return 'outline';
        }
    };

    const getOriginBadge = (channel: SnookerChannel) => {
        if (channel.source === 'youtube') return <Badge className="bg-red-600/10 text-red-500 border-red-500/20 text-[8px] h-4 uppercase">{channel.sourceName || 'YouTube'}</Badge>;
        return <Badge variant="outline" className="text-[8px] h-4 uppercase opacity-60">Manual</Badge>;
    };

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Gestão Multicanal</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Controle de Transmissões Híbridas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline"
                        disabled={isSyncing || snookerSyncState === 'syncing'}
                        onClick={handleSyncManual}
                        className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
                    >
                        {(isSyncing || snookerSyncState === 'syncing') ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        Sincronizar Tudo
                    </Button>
                    <Button onClick={handleAddNew} className="lux-shine font-black uppercase rounded-xl h-11 px-6"><PlusCircle className="mr-2 h-4 w-4" /> Novo Jogo Manual</Button>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                <div className="flex flex-wrap gap-2 flex-1">
                    <FilterBtn active={filterType === 'all'} onClick={() => setFilterType('all')} label="Todos" />
                    <FilterBtn active={filterType === 'live'} onClick={() => setFilterType('live')} label="Ao Vivo" color="text-red-500" />
                    <FilterBtn active={filterType === 'pending'} onClick={() => setFilterType('pending')} label="Pendentes" color="text-amber-500" />
                    <FilterBtn active={filterType === 'youtube'} onClick={() => setFilterType('youtube')} label="YouTube" />
                    <FilterBtn active={filterType === 'manual'} onClick={() => setFilterType('manual')} label="Manual" />
                </div>
                <div className="w-full md:w-auto flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Origem:</span>
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="h-8 w-40 bg-black/40 border-white/10 text-[10px] font-bold uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableOrigins.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-slate-950/50">
                        <TableRow className="border-white/5 h-10">
                            <TableHead className="text-[9px] uppercase font-black px-4">Jogo / Torneio</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Horário</TableHead>
                            <TableHead className="text-[9px] uppercase font-black">Origem / Status</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-center">Visível</TableHead>
                            <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredChannels.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">Nenhum canal encontrado.</TableCell></TableRow>
                        ) : (
                            filteredChannels.map(channel => (
                                <TableRow key={channel.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {channel.thumbnailUrl && (
                                                <div className="w-12 h-8 rounded border border-white/10 overflow-hidden shrink-0 hidden sm:block">
                                                    <img src={channel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black text-white uppercase italic truncate">{channel.playerA.name} vs {channel.playerB.name}</span>
                                                <span className="text-[9px] text-muted-foreground truncate max-w-[180px] font-bold uppercase">{channel.tournamentName || channel.title}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono text-slate-300">{new Date(channel.scheduledAt).toLocaleDateString('pt-BR')}</span>
                                            <span className="text-[9px] font-mono text-primary font-bold">{new Date(channel.scheduledAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                {getOriginBadge(channel)}
                                                <Badge variant={getStatusVariant(channel.status)} className="text-[8px] h-4 uppercase font-black italic">{channel.status}</Badge>
                                            </div>
                                            {channel.isManualOverride && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] h-4 uppercase font-black w-fit"><ShieldAlert size={8} className="mr-1" /> Override</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch 
                                            checked={channel.enabled} 
                                            onCheckedChange={(v) => updateSnookerChannel({...channel, enabled: v})} 
                                            className="scale-75"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right px-4 space-x-1">
                                        {channel.sourceStatus === 'detected' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:bg-green-500/10" onClick={() => approveAutoSnookerChannel(channel.id)} title="Aprovar">
                                                <Check size={14} />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(channel)}><Edit size={14} /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => handleDuplicateAsManual(channel)} title="Duplicar"><Copy size={14} /></Button>
                                        {channel.youtubeUrl && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => window.open(channel.youtubeUrl, '_blank')}>
                                                <ExternalLink size={14} />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(channel.id)}><Trash2 size={14} /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* MODAL DE EDIÇÃO */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl bg-[#0f172a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                            {editingId ? 'Editar Canal' : 'Novo Canal Manual'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Título / Torneio</Label>
                            <Input value={currentChannel.title} onChange={(e) => setCurrentChannel({ ...currentChannel, title: e.target.value })} className="h-11 bg-black/20 border-white/10" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className='p-4 border border-white/5 rounded-2xl bg-black/20 space-y-3'>
                                <Label className='text-[10px] uppercase font-black text-primary'>Mandante</Label>
                                <Input value={currentChannel.playerA.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, name: e.target.value} })} />
                                <Input type="number" value={currentChannel.playerA.level} onChange={(e) => setCurrentChannel({ ...currentChannel, playerA: {...currentChannel.playerA, level: parseInt(e.target.value) || 1} })} placeholder="Nível (1-10)" />
                            </div>
                            <div className='p-4 border border-white/5 rounded-2xl bg-black/20 space-y-3'>
                                <Label className='text-[10px] uppercase font-black text-primary'>Visitante</Label>
                                <Input value={currentChannel.playerB.name} onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, name: e.target.value} })} />
                                <Input type="number" value={currentChannel.playerB.level} onChange={(e) => setCurrentChannel({ ...currentChannel, playerB: {...currentChannel.playerB, level: parseInt(e.target.value) || 1} })} placeholder="Nível (1-10)" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] uppercase font-bold">Início Agendado</Label>
                                <Input type="datetime-local" value={currentChannel.scheduledAt} onChange={(e) => setCurrentChannel({ ...currentChannel, scheduledAt: e.target.value })} className="h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] uppercase font-bold">URL YouTube</Label>
                                <Input value={currentChannel.youtubeUrl} onChange={(e) => setCurrentChannel({ ...currentChannel, youtubeUrl: e.target.value })} className="h-11" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2">
                                <Switch id="manual-override" checked={currentChannel.isManualOverride} onCheckedChange={(v) => setCurrentChannel({...currentChannel, isManualOverride: v})}/>
                                <div className="space-y-0.5">
                                    <Label htmlFor="manual-override" className="text-sm font-bold text-amber-500 uppercase italic">Bloquear Sobrescrita Automática</Label>
                                    <p className="text-[10px] text-muted-foreground">Impede que o robô altere nomes e títulos editados.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="border-white/10">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave} className="lux-shine font-black uppercase italic px-10">Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Canal?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">Esta ação é permanente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10">Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-white font-bold uppercase">Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

function FilterBtn({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color?: string }) {
    return (
        <Button 
            variant={active ? 'default' : 'outline'} 
            size="sm" 
            onClick={onClick}
            className={cn(
                "h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-white/10",
                active && "bg-primary text-black",
                !active && color
            )}
        >
            {label}
        </Button>
    );
}
