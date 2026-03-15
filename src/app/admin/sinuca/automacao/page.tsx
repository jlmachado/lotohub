/**
 * @fileOverview Painel de Controle de Automação de Sinuca.
 * Finalizado para operação real com YouTube Data API e diagnóstico de saúde de vídeo.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, RefreshCw, Zap, Settings2, History, 
  CheckCircle2, AlertTriangle, Info, Trash2, Eye, 
  ExternalLink, Save, RotateCcw, 
  Play, ShieldCheck, Database, LayoutList, Check, X,
  PlusCircle, Edit, Power, PowerOff, Video, Star, BarChart, MonitorOff, Key,
  ShieldAlert
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
import { isValidYoutubeVideoId, isValidYoutubeChannelId } from '@/utils/youtube';

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
    updateSnookerAutomationSource,
    snookerPrimaryChannelId,
    setManualPrimarySnookerChannel
  } = useAppContext();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sources');
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SnookerAutomationSource | null>(null);

  const candidates = useMemo(() => 
    [...snookerChannels]
      .filter(c => !c.isArchived && isValidYoutubeVideoId(c.embedId))
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)),
  [snookerChannels]);

  const autoChannels = useMemo(() => 
    snookerChannels.filter(c => c.source === 'youtube' && !c.isArchived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [snookerChannels]);

  const stats = useMemo(() => ({
    total: autoChannels.length,
    live: autoChannels.filter(c => c.status === 'live' && isValidYoutubeVideoId(c.embedId)).length,
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
      if (!isValidYoutubeChannelId(editingSource.channelId)) {
        toast({ variant: 'destructive', title: 'Channel ID Inválido', description: 'O ID do canal deve ter 24 caracteres e começar com UC.' });
        return;
      }
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
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Automação</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-red-600 text-white font-black italic uppercase text-[10px]">Operação Real • Feed RSS</Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Gestão Global de Sincronismo</span>
            </div>
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
            Sincronizar Fontes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Fontes Ativas" value={stats.activeSources} icon={Database} color="text-primary" />
        <StatCard title="Lives Reais" value={stats.live} icon={Play} color="text-green-500" />
        <StatCard title="Vídeos Inválidos" value={stats.invalid} icon={MonitorOff} color="text-red-500" />
        
        <Card className={cn(
          "border-white/5 bg-slate-900 shadow-inner overflow-hidden relative",
          snookerSyncState === 'syncing' && "animate-pulse"
        )}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-white/5 rounded-xl text-primary shadow-inner">
              {snookerSyncState === 'error' ? <AlertTriangle className="text-red-500" size={20} /> : <RefreshCw size={20} className={snookerSyncState === 'syncing' ? 'animate-spin' : ''} />}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Motor Snooker</p>
              <p className={cn("text-xl font-black italic uppercase", snookerSyncState === 'error' ? "text-red-500" : "text-white")}>
                {snookerSyncState === 'error' ? 'Falha' : snookerSyncState === 'idle' ? 'Pronto' : 'Sync...'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/5 shadow-inner overflow-hidden">
          <CardHeader className="p-3 pb-0">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Logs de Erro</p>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className={cn("text-xl font-black italic tabular-nums", stats.errors > 0 ? "text-red-500" : "text-green-500")}>
              {stats.errors}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-[600px] bg-slate-900 border border-white/10 p-1 rounded-xl h-12">
          <TabsTrigger value="sources" className="rounded-lg font-black uppercase italic text-[10px]">Fontes XML</TabsTrigger>
          <TabsTrigger value="ranking" className="rounded-lg font-black uppercase italic text-[10px]">Ranking Principal</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg font-black uppercase italic text-[10px]">Inspeção de Itens</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-black uppercase italic text-[10px]">Logs Técnicos</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-6 space-y-6">
          <div className="grid gap-4">
            {snookerAutomationSettings.sources.map(source => {
              const isIdValid = isValidYoutubeChannelId(source.channelId);
              return (
                <Card key={source.id} className={cn(
                  "border-white/5 transition-all overflow-hidden",
                  source.enabled ? "bg-slate-900/50" : "bg-black opacity-60 grayscale"
                )}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                        <Video size={20} className={source.enabled ? "text-primary" : "text-slate-600"} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white uppercase italic">{source.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{source.channelId}</p>
                          <Badge variant="outline" className={cn("text-[7px] h-3.5 px-1 uppercase font-black", isIdValid ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500")}>
                            {isIdValid ? "ID OK" : "ID INVÁLIDO"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[8px] h-5 border-white/10 uppercase bg-black/20">Prioridade: {source.priority}</Badge>
                      <div className="flex items-center gap-1">
                        <button className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-white" onClick={() => handleEditSource(source)} title="Editar Fonte"><Edit size={16}/></button>
                        <button 
                          className={cn("h-9 w-9 flex items-center justify-center", source.enabled ? "text-green-500" : "text-red-500")}
                          onClick={() => toggleSnookerSource(source.id, !source.enabled)}
                          title={source.enabled ? "Desativar" : "Ativar"}
                        >
                          {source.enabled ? <Power size={16}/> : <PowerOff size={16}/>}
                        </button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!isIdValid || snookerSyncState === 'syncing'}
                          onClick={() => syncSnookerFromYoutube(true, source.id)} 
                          className="h-9 font-bold text-[10px] px-3 border-white/10 bg-white/5 ml-2"
                        >
                          SYNC
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 p-4">
              <CardTitle className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                <Star size={14} className="text-primary fill-primary" />Ranking de Escolha Profissional
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-950/20">
                <TableRow className="border-white/5 h-10">
                  <TableHead className="text-[9px] uppercase font-black px-4 w-[60px]">Pos</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Confronto / Canal</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Score</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Diagnóstico</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-right px-4">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((chan, idx) => {
                  const isPrimary = chan.id === snookerPrimaryChannelId;
                  const isForced = chan.id === snookerAutomationSettings.manualPrimaryChannelId;
                  return (
                    <TableRow key={chan.id} className={cn("border-white/5 hover:bg-white/5 transition-colors", isPrimary && "bg-primary/5")}>
                      <TableCell className="px-4 font-black italic text-lg text-white/20">#{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-white uppercase italic">{chan.playerA.name} vs {chan.playerB.name}</span>
                            {isPrimary && <Badge className="bg-primary text-black text-[7px] font-black h-3.5 italic uppercase">PRINCIPAL</Badge>}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-mono uppercase">{chan.sourceName} • {chan.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-black tabular-nums border-white/10", (chan.priorityScore || 0) > 150 ? "text-green-500" : "text-amber-500")}>
                          {chan.priorityScore || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-[9px] text-slate-400 italic max-w-md leading-relaxed">{chan.primaryReason || 'Análise de relevância concluída.'}</p>
                      </TableCell>
                      <TableCell className="text-right px-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-8 text-[9px] font-black uppercase", isForced ? "text-red-500" : "text-primary")}
                          onClick={() => setManualPrimarySnookerChannel(isForced ? null : chan.id)}
                        >
                          {isForced ? 'Desafixar' : 'Fixar Principal'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-white/5 h-10">
                  <TableHead className="text-[9px] uppercase font-black px-4">Thumbnail / Jogo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Saúde do Vídeo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoChannels.map(channel => {
                  const isVideoValid = isValidYoutubeVideoId(channel.embedId);
                  return (
                    <TableRow key={channel.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-14 rounded-lg overflow-hidden border border-white/10 shrink-0 relative bg-black shadow-inner">
                            <img src={channel.thumbnailUrl} className="object-cover w-full h-full opacity-60" alt="" />
                            {!isVideoValid && <div className="absolute inset-0 flex items-center justify-center bg-red-600/40"><MonitorOff size={16} className="text-white" /></div>}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase italic">{channel.playerA.name} vs {channel.playerB.name}</p>
                            <p className="text-[9px] text-muted-foreground font-mono uppercase">{channel.sourceName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className={cn("text-[8px] h-4 uppercase font-black", isVideoValid ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500')}>
                            {isVideoValid ? 'VÁLIDO' : 'ID INVÁLIDO'}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] h-4 uppercase font-black border-white/10">{channel.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-4 space-x-1">
                        {channel.sourceStatus === 'detected' && isVideoValid && (
                          <button className="h-8 w-8 text-green-500 hover:bg-green-500/10 flex items-center justify-center rounded-lg" onClick={() => approveAutoSnookerChannel(channel.id)} title="Aprovar"><Check size={14} /></button>
                        )}
                        <button className="h-8 w-8 text-white/30 hover:text-white flex items-center justify-center" onClick={() => window.open(channel.youtubeUrl, '_blank')} title="Ver no YouTube"><ExternalLink size={14} /></button>
                        <button className="h-8 w-8 text-destructive hover:bg-destructive/10 flex items-center justify-center rounded-lg" onClick={() => archiveAutoSnookerChannel(channel.id)} title="Arquivar"><Trash2 size={14} /></button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between p-4">
              <CardTitle className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                <History size={14} className="text-primary" /> Log de Transações do Sync
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearSnookerSyncLogs} className="h-7 text-[9px] font-black uppercase hover:bg-red-500/10 hover:text-red-500 px-3">Limpar</Button>
            </CardHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-950/20">
                  <TableRow className="border-white/5 h-8">
                    <TableHead className="text-[9px] uppercase font-black px-4">Hora</TableHead>
                    <TableHead className="text-[9px] uppercase font-black">Fonte</TableHead>
                    <TableHead className="text-[9px] uppercase font-black">Mensagem</TableHead>
                    <TableHead className="text-[9px] uppercase font-black text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snookerSyncLogs.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="px-4 py-3"><span className="text-[10px] font-mono text-slate-400">{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</span></TableCell>
                      <TableCell><span className="text-[10px] font-black text-white uppercase italic">{log.sourceName || 'Global'}</span></TableCell>
                      <TableCell><p className="text-[10px] text-slate-300 max-w-md truncate">{log.message}</p></TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[7px] h-4 uppercase font-black px-1.5", log.status === 'success' ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500")}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="bg-[#0f172a] border-white/10 text-white sm:max-w-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">Configurar Fonte de Dados</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Nome da Transmissão</Label>
                <Input value={editingSource.name} onChange={e => setEditingSource({...editingSource, name: e.target.value})} className="h-11 bg-black/20 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Channel ID (24 caracteres começando com UC)</Label>
                <Input 
                  value={editingSource.channelId} 
                  onChange={e => setEditingSource({...editingSource, channelId: e.target.value})} 
                  className={cn("h-11 bg-black/20 text-white font-mono", !isValidYoutubeChannelId(editingSource.channelId) ? "border-red-500/50" : "border-white/10")} 
                  placeholder="Ex: UCkb_vWhEvID_v_vXOnZ_sqQ"
                />
                {!isValidYoutubeChannelId(editingSource.channelId) && editingSource.channelId.length > 0 && (
                  <p className="text-[10px] text-red-500 font-bold uppercase mt-1 flex items-center gap-1">
                    <ShieldAlert size={10} /> ID do canal inválido ou incompleto. Deve ter 24 caracteres.
                  </p>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Prioridade</Label>
                  <Input type="number" value={editingSource.priority} onChange={e => setEditingSource({...editingSource, priority: parseInt(e.target.value) || 0})} className="h-11 bg-black/20 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Perfil de Inteligência</Label>
                  <Select value={editingSource.parseProfile} onValueChange={(v: any) => setEditingSource({...editingSource, parseProfile: v})}>
                    <SelectTrigger className="h-11 bg-black/20 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tv_snooker_brasil">TV Snooker Brasil</SelectItem>
                      <SelectItem value="junior_snooker">Junior Snooker</SelectItem>
                      <SelectItem value="generic">Genérico (Fallback)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="border-white/10 h-11 px-6 font-bold">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveSource} disabled={!editingSource || !isValidYoutubeChannelId(editingSource.channelId)} className="lux-shine font-black uppercase italic h-11 px-8 rounded-xl shadow-lg">Salvar Configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/5 shadow-inner overflow-hidden relative">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5 shadow-inner", color)}>
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
