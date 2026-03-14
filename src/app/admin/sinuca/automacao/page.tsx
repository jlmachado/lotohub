'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, RefreshCw, Zap, Settings2, History, 
  CheckCircle2, AlertTriangle, Info, Trash2, Eye, 
  ExternalLink, MousePointer2, Save, RotateCcw, 
  Play, ShieldCheck, Database, LayoutList, Check, X
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
import { useAppContext, SnookerChannel, SnookerSyncLog } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    archiveAutoSnookerChannel
  } = useAppContext();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');

  // Local state for settings form
  const [settings, setSettings] = useState(snookerAutomationSettings);

  const handleSaveSettings = () => {
    updateSnookerAutomationSettings(settings);
    toast({ title: "Configurações Salvas", description: "O motor de automação foi atualizado." });
  };

  const handleManualSync = async () => {
    await syncSnookerFromYoutube(true);
  };

  // Filter channels created by automation
  const autoChannels = useMemo(() => 
    snookerChannels.filter(c => c.source === 'youtube' && !c.isArchived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [snookerChannels]);

  const stats = useMemo(() => ({
    total: autoChannels.length,
    live: autoChannels.filter(c => c.status === 'live').length,
    pending: autoChannels.filter(c => c.sourceStatus === 'detected').length,
    synced: autoChannels.filter(c => c.sourceStatus === 'synced').length,
    errors: snookerSyncLogs.filter(l => l.status === 'error').length
  }), [autoChannels, snookerSyncLogs]);

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/sinuca">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Central de Automação</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Gestão Inteligente TV Snooker Brasil</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleManualSync}
            disabled={snookerSyncState === 'syncing'}
            className="h-11 rounded-xl font-bold border-white/10 bg-white/5"
          >
            {snookerSyncState === 'syncing' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Sincronizar Agora
          </Button>
          <Button onClick={handleSaveSettings} className="h-11 rounded-xl font-black uppercase italic lux-shine px-6">
            <Save className="mr-2 h-4 w-4" /> Salvar Tudo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Jogos Sincronizados" value={stats.total} icon={LayoutList} color="text-blue-400" />
        <StatCard title="Ao Vivo Agora" value={stats.live} icon={Play} color="text-red-500" />
        <StatCard title="Aguardando Aprovação" value={stats.pending} icon={MousePointer2} color="text-amber-500" />
        <Card className={cn(
          "border-primary/20 bg-primary/5 shadow-inner overflow-hidden relative",
          snookerSyncState === 'syncing' && "animate-pulse"
        )}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-white/5 rounded-xl text-primary">
              <RefreshCw size={20} className={snookerSyncState === 'syncing' ? 'animate-spin' : ''} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Motor de Sync</p>
              <p className="text-xl font-black text-white italic uppercase">{snookerSyncState}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px] bg-slate-900 border border-white/10 p-1 rounded-xl h-12">
          <TabsTrigger value="settings" className="rounded-lg font-black uppercase italic text-[10px]">Configurações</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg font-black uppercase italic text-[10px]">Itens Detectados</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-black uppercase italic text-[10px]">Logs do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-white/10 bg-card/50">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                  <Settings2 size={16} className="text-primary" /> Parâmetros do Scraper
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL do Canal Base (YouTube)</Label>
                  <Input 
                    value={settings.youtubeChannelUrl} 
                    onChange={e => setSettings({...settings, youtubeChannelUrl: e.target.value})}
                    placeholder="https://www.youtube.com/@Canal"
                    className="bg-black/20 border-white/10 h-11"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Automação Ativa</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Liga/Desliga o motor global.</p>
                    </div>
                    <Switch checked={settings.enabled} onCheckedChange={v => setSettings({...settings, enabled: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Auto-Criar Canais</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Cria novos jogos ao detectar.</p>
                    </div>
                    <Switch checked={settings.autoCreateChannels} onCheckedChange={v => setSettings({...settings, autoCreateChannels: v})} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-amber-500">Exigir Aprovação</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Novos jogos entram como pendentes.</p>
                    </div>
                    <Switch checked={settings.requireAdminApproval} onCheckedChange={v => setSettings({...settings, requireAdminApproval: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Manter Odds Manuais</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Não altera odds editadas no admin.</p>
                    </div>
                    <Switch checked={settings.keepManualOdds} onCheckedChange={v => setSettings({...settings, keepManualOdds: v})} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                  <Database size={16} className="text-primary" /> Inteligência de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <ToggleItem label="Extrair Jogadores" checked={settings.autoFillPlayers} onChange={v => setSettings({...settings, autoFillPlayers: v})} />
                <ToggleItem label="Extrair Torneio" checked={settings.autoFillTournament} onChange={v => setSettings({...settings, autoFillTournament: v})} />
                <ToggleItem label="Extrair Agenda" checked={settings.autoFillSchedule} onChange={v => setSettings({...settings, autoFillSchedule: v})} />
                <ToggleItem label="Extrair Premiação" checked={settings.autoFillPrize} onChange={v => setSettings({...settings, autoFillPrize: v})} />
                <ToggleItem label="Auto-Live Sync" checked={settings.autoMarkLive} onChange={v => setSettings({...settings, autoMarkLive: v})} />
                <ToggleItem label="Auto-Finish Sync" checked={settings.autoMarkFinished} onChange={v => setSettings({...settings, autoMarkFinished: v})} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-white/5 h-10">
                  <TableHead className="text-[9px] uppercase font-black px-4">Thumb / Jogo</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Metadados Detectados</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Status Sync</TableHead>
                  <TableHead className="text-[9px] uppercase font-black text-right px-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoChannels.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">Nenhum item automático detectado.</TableCell></TableRow>
                ) : (
                  autoChannels.map(channel => (
                    <TableRow key={channel.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                            <img src={channel.thumbnailUrl || 'https://picsum.photos/seed/thumb/80/48'} className="object-cover w-full h-full" alt="" />
                            {channel.status === 'live' && <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center animate-pulse"><Zap size={14} className="text-white" /></div>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-white uppercase italic truncate">{channel.playerA.name} vs {channel.playerB.name}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold truncate">{channel.tournamentName || channel.title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase bg-black/20">Confiança: {(channel.metadataConfidence || 0) * 100}%</Badge>
                          {channel.modality && <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase bg-black/20">{channel.modality}</Badge>}
                          {channel.location && <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase bg-black/20">{channel.location}</Badge>}
                          {channel.prizeLabel && <Badge variant="outline" className="text-[8px] h-4 border-green-500/20 text-green-500 uppercase bg-green-500/5">{channel.prizeLabel}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[8px] h-5 uppercase font-black italic",
                          channel.sourceStatus === 'synced' ? "bg-green-600/20 text-green-500" : "bg-amber-600/20 text-amber-500"
                        )}>
                          {channel.sourceStatus === 'synced' ? 'SINCRONIZADO' : 'PENDENTE APROVAÇÃO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4 space-x-1">
                        {channel.sourceStatus === 'detected' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                            onClick={() => approveAutoSnookerChannel(channel.id)}
                          >
                            <Check size={14} />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-white/30 hover:text-white"
                          onClick={() => window.open(channel.youtubeUrl, '_blank')}
                        >
                          <ExternalLink size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => archiveAutoSnookerChannel(channel.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-white/5 bg-card/50 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-white/5 flex flex-row items-center justify-between p-4">
              <CardTitle className="text-xs font-black uppercase italic tracking-widest text-white flex items-center gap-2">
                <History size={14} className="text-primary" /> Histórico de Sincronização
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearSnookerSyncLogs} className="h-7 text-[9px] font-black uppercase hover:bg-red-500/10 hover:text-red-500">
                Limpar Logs
              </Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-950/20">
                <TableRow className="border-white/5 h-8">
                  <TableHead className="text-[9px] uppercase font-black px-4">Data/Hora</TableHead>
                  <TableHead className="text-[9px] uppercase font-black">Operação</TableHead>
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
                        <span className="text-[10px] font-black text-white uppercase italic">{log.type}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] text-slate-300 max-w-md truncate">{log.message}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[7px] h-4 uppercase font-black px-1.5",
                          log.status === 'success' ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"
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

function ToggleItem({ label, checked, onChange, disabled = false }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <Label className="text-[11px] font-bold text-slate-300 uppercase">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="scale-75" />
    </div>
  );
}
