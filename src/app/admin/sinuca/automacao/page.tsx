'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, RefreshCw, Zap, Settings2, History, 
  CheckCircle2, AlertTriangle, Info, Trash2, Eye, 
  ExternalLink, MousePointer2, Save, RotateCcw, 
  Play, ShieldCheck, Database, LayoutList, Check, X,
  PlusCircle, Edit, Power, PowerOff, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerChannel, SnookerSyncLog, SnookerAutomationSettings, SnookerAutomationSource } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { isValidYoutubeVideoId } from '@/utils/youtube';

export default function AdminSnookerAutomationPage() {
  const { 
    snookerAutomationSettings, 
    updateSnookerAutomationSettings,
    snookerSyncLogs,
    clearSnookerSyncLogs,
    snookerChannels,
    syncSnookerFromYoutube,
    snookerSyncState,
    approveAutoSnookerChannel,
    archiveAutoSnookerChannel,
    toggleSnookerSource,
    updateSnookerAutomationSource
  } = useAppContext();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sources');
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SnookerAutomationSource | null>(null);

  // Filter channels created by automation
  const autoChannels = useMemo(() => 
    snookerChannels.filter(c => c.source === 'youtube' && !c.isArchived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [snookerChannels]);

  const stats = useMemo(() => ({
    total: autoChannels.length,
    live: autoChannels.filter(c => c.status === 'live').length,
    pending: autoChannels.filter(c => c.sourceStatus === 'detected').length,
    invalid: autoChannels.filter(c => !isValidYoutubeVideoId(c.embedId)).length,
    activeSources: snookerAutomationSettings.sources.filter(s => s.enabled).length,
    errors: snookerSyncLogs.filter(l => l.status === 'error').length
  }), [autoChannels, snookerSyncLogs, snookerAutomationSettings.sources]);

  const handleManualSyncAll = async () => {
    await syncSnookerFromYoutube(true);
  };

  const handleEditSource = (source: SnookerAutomationSource) => {
    setEditingSource(source);
    setIsSourceDialogOpen(true);
  };

  const handleSaveSource = () => {
    if (editingSource) {
      updateSnookerAutomationSource(editingSource.id, editingSource);
      setIsSourceDialogOpen(false);
      setEditingSource(null);
      toast({ title: "Fonte Atualizada" });
    }
  };

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/sinuca">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central Multicanal</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Gestão de Automação Híbrida YouTube</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleManualSyncAll}
            disabled={snookerSyncState === 'syncing'}
            className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
          >
            {snookerSyncState === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Sincronizar Tudo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Fontes Ativas" value={stats.activeSources} icon={Database} color="text-primary" />
        <StatCard title="Ao Vivo" value={stats.live} icon={Play} color="text-red-500" />
        <StatCard title="Pendentes" value={stats.pending} icon={MousePointer2} color="text-amber-500" />
        <StatCard title="Vídeos Inválidos" value={stats.invalid} icon={Video} color="text-red-400" />
        
        <Card className={cn(
          "border-white/5 bg-slate-900 shadow-inner overflow-hidden relative",
          snookerSyncState === 'syncing' && "animate-pulse"
        )}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-white/5 rounded-xl text-primary">
              <RefreshCw size={20} className={snookerSyncState === 'syncing' ? 'animate-spin' : ''} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Motor Global</p>
              <p className="text-xl font-black text-white italic uppercase">{snookerSyncState}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[450px] bg-slate-900 border border-white/10 p-1 rounded-xl h-12">
          <TabsTrigger value="sources" className="rounded-lg font-black uppercase italic text-[10px]">Fontes de Dados</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg font-black uppercase italic text-[10px]">Itens Detectados</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-black uppercase italic text-[10px]">Logs de Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-6 space-y-6">
          <div className="grid gap-4">
            {snookerAutomationSettings.sources.map(source => (
              <Card key={source.id} className={cn(
                "border-white/5 transition-all overflow-hidden",
                source.enabled ? "bg-slate-900/50" : "bg-black opacity-60 grayscale"
              )}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                      <Zap size={20} className={source.enabled ? "text-primary" : "text-slate-600"} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white uppercase italic">{source.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">{source.channelHandle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Último Sync</p>
                      <p className="text-[10px] font-bold text-white">{source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-5 border-white/10 uppercase bg-black/20">Prioridade: {source.priority}</Badge>
                    <div className="flex items-center gap-1">
                      <button className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-white" onClick={() => handleEditSource(source)}><Edit size={16}/></button>
                      <button 
                        className={cn("h-9 w-9 flex items-center justify-center", source.enabled ? "text-green-500" : "text-red-500")}
                        onClick={() => toggleSnookerSource(source.id, !source.enabled)}
                      >
                        {source.enabled ? <Power size={16}/> : <PowerOff size={16}/>}
                      </button>
                      <Button variant="outline" size="sm" onClick={() => syncSnookerFromYoutube(true, source.id)} className="h-9 font-bold text-[10px] px-3 border-white/10 bg-white/5 ml-2">SYNC</Button>
                    </div>
                  </div>
                </div>
                {source.lastSyncStatus === 'error' && (
                  <div className="px-4 py-2 bg-red-600/10 border-t border-red-600/20 text-[10px] text-red-500 font-bold">
                    <AlertTriangle className="inline h-3 w-3 mr-1" /> {source.lastSyncMessage}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-white/5 h-10">
                  <TableHead className="text-[9px] uppercase font-black px-4">Thumb / Jogo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Origem / Canal</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Status do Vídeo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoChannels.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">Nenhum item automático detectado.</TableCell></TableRow>
                ) : (
                  autoChannels.map(channel => {
                    const isVideoValid = isValidYoutubeVideoId(channel.embedId);
                    return (
                      <TableRow key={channel.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                              <img src={channel.thumbnailUrl || 'https://picsum.photos/seed/thumb/80/48'} className="object-cover w-full h-full" alt="" />
                              {channel.status === 'live' && isVideoValid && <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center animate-pulse"><Zap size={14} className="text-white" /></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-white uppercase italic truncate">{channel.playerA.name} vs {channel.playerB.name}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold truncate">{channel.tournamentName || channel.title}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-primary uppercase italic">{channel.sourceName}</span>
                            <span className="text-[8px] text-slate-500 font-mono">{channel.sourceVideoId || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-4 uppercase font-black px-1.5",
                              isVideoValid ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-red-500/20 text-red-500 bg-red-500/5"
                            )}>
                              {isVideoValid ? <Check size={8} className="mr-1"/> : <X size={8} className="mr-1"/>}
                              Video {isVideoValid ? 'OK' : 'Inválido'}
                            </Badge>
                            <Badge className={cn(
                              "text-[8px] h-4 uppercase font-black italic",
                              channel.sourceStatus === 'synced' ? "bg-green-600/20 text-green-500" : "bg-amber-600/20 text-amber-500"
                            )}>
                              {channel.sourceStatus === 'synced' ? 'SINC' : 'PENDENTE'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-4 space-x-1">
                          {channel.sourceStatus === 'detected' && isVideoValid && (
                            <button 
                              className="h-8 w-8 text-green-500 hover:bg-green-500/10 flex items-center justify-center rounded-lg"
                              onClick={() => approveAutoSnookerChannel(channel.id)}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button className="h-8 w-8 text-white/30 hover:text-white flex items-center justify-center" onClick={() => window.open(channel.youtubeUrl, '_blank')}><ExternalLink size={14} /></button>
                          <button className="h-8 w-8 text-destructive hover:bg-destructive/10 flex items-center justify-center rounded-lg" onClick={() => archiveAutoSnookerChannel(channel.id)}><Trash2 size={14} /></button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between p-4">
              <CardTitle className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                <History size={14} className="text-primary" /> Histórico Técnico
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearSnookerSyncLogs} className="h-7 text-[9px] font-black uppercase hover:bg-red-500/10 hover:text-red-500">Limpar Logs</Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-950/20">
                <TableRow className="border-white/5 h-8">
                  <TableHead className="text-[9px] uppercase font-black px-4">Data/Hora</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Fonte</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Mensagem</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snookerSyncLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">Nenhum log registrado.</TableCell></TableRow>
                ) : (
                  snookerSyncLogs.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="px-4 py-3">
                        <span className="text-[10px] font-mono text-slate-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-black text-white uppercase italic">{log.sourceName || 'Global'}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] text-slate-300 max-w-md truncate">{log.message}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[7px] h-4 uppercase font-black px-1.5",
                          log.status === 'success' ? "bg-green-600/20 text-green-500" : log.status === 'error' ? "bg-red-600/20 text-red-500" : "bg-amber-600/20 text-amber-500"
                        )}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="bg-[#0f172a] border-white/10 text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Editar Fonte YouTube</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Nome da Fonte</Label>
                <Input value={editingSource.name} onChange={e => setEditingSource({...editingSource, name: e.target.value})} className="h-11 bg-black/20 border-white/10" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Perfil de Parser</Label>
                  <Select value={editingSource.parseProfile} onValueChange={(v: any) => setEditingSource({...editingSource, parseProfile: v})}>
                    <SelectTrigger className="h-11 bg-black/20 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tv_snooker_brasil">TV Snooker Brasil</SelectItem>
                      <SelectItem value="junior_snooker">Junior Snooker</SelectItem>
                      <SelectItem value="generic">Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Prioridade (Sync)</Label>
                  <Input type="number" value={editingSource.priority} onChange={e => setEditingSource({...editingSource, priority: parseInt(e.target.value) || 0})} className="h-11 bg-black/20 border-white/10" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Auto Aprovar Jogos</Label>
                  <p className="text-[10px] text-muted-foreground">Se desligado, jogos entram como Pendentes.</p>
                </div>
                <Switch checked={!editingSource.requireAdminApproval} onCheckedChange={v => setEditingSource({...editingSource, requireAdminApproval: !v})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="border-white/10">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveSource} className="lux-shine font-black uppercase italic">Salvar Configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-inner">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5", color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
          <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
