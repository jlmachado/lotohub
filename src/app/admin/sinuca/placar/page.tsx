
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus, Zap, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerScoreboard } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AdminSinucaPlacarPage() {
    const { snookerScoreboards, snookerChannels, updateSnookerScoreboard } = useAppContext();
    const { toast } = useToast();

    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [scoreboard, setScoreboard] = useState<SnookerScoreboard | null>(null);

    const activeChannel = useMemo(() => 
        snookerChannels.find(c => c.id === selectedChannelId), 
    [selectedChannelId, snookerChannels]);

    useEffect(() => {
        if (selectedChannelId && snookerScoreboards[selectedChannelId]) {
            setScoreboard(JSON.parse(JSON.stringify(snookerScoreboards[selectedChannelId])));
        } else {
            setScoreboard(null);
        }
    }, [selectedChannelId, snookerScoreboards]);

    const handlePlayerChange = (player: 'A' | 'B', field: 'name' | 'score', value: string) => {
        setScoreboard(prev => prev ? {
            ...prev,
            [player === 'A' ? 'playerA' : 'playerB']: {
                ...prev[player === 'A' ? 'playerA' : 'playerB'],
                [field]: value
            }
        } : null);
    };
    
    const handleScoreChange = (player: 'A' | 'B', delta: number) => {
        if (!scoreboard) return;
        const currentScore = player === 'A' ? scoreboard.scoreA : scoreboard.scoreB;
        const newScore = Math.max(0, currentScore + delta);
        setScoreboard(prev => prev ? { ...prev, [player === 'A' ? 'scoreA' : 'scoreB']: newScore } : null);
    };

    const handleSave = () => {
        if (scoreboard && selectedChannelId) {
            updateSnookerScoreboard(selectedChannelId, scoreboard);
            toast({
                title: 'Placar Atualizado!',
                description: 'O placar foi atualizado para todos os espectadores.'
            });
        }
    };

    const handleResetFromAutomation = () => {
        if (!activeChannel || !scoreboard) return;
        setScoreboard({
            ...scoreboard,
            matchTitle: activeChannel.tournamentName || activeChannel.title,
            playerA: { ...scoreboard.playerA, name: activeChannel.playerA.name },
            playerB: { ...scoreboard.playerB, name: activeChannel.playerB.name },
            statusText: activeChannel.status === 'live' ? 'AO VIVO' : 'Agendado'
        });
        toast({ title: "Dados da Automação Carregados", description: "O cabeçalho e nomes foram atualizados conforme o YouTube." });
    };
    
    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Controle de Placar</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Modo Assistido Híbrido Ativo</p>
                    </div>
                </div>
                {activeChannel?.source === 'youtube' && scoreboard && (
                    <Button variant="outline" size="sm" onClick={handleResetFromAutomation} className="gap-2 font-bold border-white/10 h-10 px-4 rounded-xl">
                        <RefreshCw size={14} className="text-primary" /> Resetar p/ Automação
                    </Button>
                )}
            </div>

            <Card className="max-w-4xl mx-auto border-white/5 bg-card/50 shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                        <Zap size={16} className="text-primary" /> Terminal do Juiz
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold">
                        Selecione a mesa e atualize a pontuação frame a frame.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <div className="grid gap-2 max-w-sm">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Mesa em Operação</Label>
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                            <SelectTrigger className="bg-slate-900 h-12 rounded-xl border-white/10 font-bold">
                                <SelectValue placeholder="Selecione um canal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {snookerChannels.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-bold">
                                        {c.playerA.name} x {c.playerB.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {scoreboard ? (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Título / Torneio</Label>
                                    {activeChannel?.source === 'youtube' && (
                                        <Badge variant="secondary" className="bg-red-600/10 text-red-500 border-red-500/20 text-[8px] h-4 uppercase font-black">YouTube Sync</Badge>
                                    )}
                                </div>
                                <Input 
                                    value={scoreboard.matchTitle} 
                                    onChange={(e) => setScoreboard(prev => prev ? {...prev, matchTitle: e.target.value} : null)} 
                                    className="bg-black/20 border-white/10 h-12 text-lg font-black uppercase italic"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Player A */}
                                <div className="space-y-6 p-6 border border-white/5 rounded-2xl bg-black/20 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase italic text-primary">Jogador A (Mandante)</h3>
                                        <ShieldCheck size={16} className="text-white/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] uppercase font-bold">Nome de Exibição</Label>
                                        <Input value={scoreboard.playerA.name} onChange={(e) => handlePlayerChange('A', 'name', e.target.value)} className="h-10 font-bold" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[9px] uppercase font-bold">Placar Geral (Gols/Frames)</Label>
                                        <div className="flex items-center gap-4 bg-slate-900 rounded-xl p-2 border border-white/5 shadow-2xl">
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg hover:bg-white/5" onClick={() => handleScoreChange('A', -1)}><Minus /></Button>
                                            <Input 
                                                type="number" 
                                                className="text-center text-4xl font-black italic bg-transparent border-0 h-12 text-primary" 
                                                value={scoreboard.scoreA} 
                                                onChange={(e) => setScoreboard(prev => prev ? {...prev, scoreA: parseInt(e.target.value) || 0} : null)} 
                                            />
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg hover:bg-white/5" onClick={() => handleScoreChange('A', 1)}><Plus /></Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Player B */}
                                <div className="space-y-6 p-6 border border-white/5 rounded-2xl bg-black/20 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase italic text-primary">Jogador B (Visitante)</h3>
                                        <ShieldCheck size={16} className="text-white/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] uppercase font-bold">Nome de Exibição</Label>
                                        <Input value={scoreboard.playerB.name} onChange={(e) => handlePlayerChange('B', 'name', e.target.value)} className="h-10 font-bold" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[9px] uppercase font-bold">Placar Geral (Gols/Frames)</Label>
                                        <div className="flex items-center gap-4 bg-slate-900 rounded-xl p-2 border border-white/5 shadow-2xl">
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg hover:bg-white/5" onClick={() => handleScoreChange('B', -1)}><Minus /></Button>
                                            <Input 
                                                type="number" 
                                                className="text-center text-4xl font-black italic bg-transparent border-0 h-12 text-primary" 
                                                value={scoreboard.scoreB} 
                                                onChange={(e) => setScoreboard(prev => prev ? {...prev, scoreB: parseInt(e.target.value) || 0} : null)} 
                                            />
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg hover:bg-white/5" onClick={() => handleScoreChange('B', 1)}><Plus /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-white/5 rounded-2xl bg-black/10">
                                <div className="space-y-2">
                                    <Label className="text-[9px] uppercase font-bold">Status do Jogo (Banner)</Label>
                                    <Input 
                                        value={scoreboard.statusText} 
                                        onChange={(e) => setScoreboard(prev => prev ? {...prev, statusText: e.target.value} : null)} 
                                        placeholder="Ex: Intervalo, Pausa Técnica..." 
                                        className="h-10 text-xs font-bold uppercase italic"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label className="text-[9px] uppercase font-bold">Frame/Set Atual</Label>
                                    <Input 
                                        type="number" 
                                        value={scoreboard.frame} 
                                        onChange={(e) => setScoreboard(prev => prev ? {...prev, frame: parseInt(e.target.value) || 0} : null)} 
                                        className="h-10 font-black text-primary"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                            <p className="font-bold uppercase text-xs tracking-widest">Selecione uma mesa acima para abrir o terminal.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-slate-950/50 border-t border-white/5 p-6 rounded-b-xl">
                    <Button 
                        size="lg" 
                        onClick={handleSave} 
                        disabled={!scoreboard}
                        className="w-full md:w-auto h-14 px-12 rounded-xl font-black uppercase italic lux-shine ml-auto"
                    >
                        Salvar e Publicar Placar
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
