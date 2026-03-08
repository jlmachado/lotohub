'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerScoreboard } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminSinucaPlacarPage() {
    const { snookerScoreboards, snookerChannels, updateSnookerScoreboard } = useAppContext();
    const { toast } = useToast();

    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [scoreboard, setScoreboard] = useState<SnookerScoreboard | null>(null);

    useEffect(() => {
        if (selectedChannelId && snookerScoreboards[selectedChannelId]) {
            setScoreboard(snookerScoreboards[selectedChannelId]);
        } else {
            setScoreboard(null);
        }
    }, [selectedChannelId, snookerScoreboards]);

    const handlePlayerChange = (player: 'A' | 'B', field: 'name' | 'avatarUrl', value: string) => {
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
    
    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Controle do Placar ao Vivo</h1>
            </div>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Placar da Partida</CardTitle>
                    <CardDescription>
                        Selecione um canal e atualize os dados da partida em tempo real.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid gap-2 max-w-sm">
                        <Label htmlFor="channel-select">Selecione o Canal</Label>
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                            <SelectTrigger id="channel-select">
                                <SelectValue placeholder="Selecione um canal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {snookerChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {scoreboard ? (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="match-title">Título da Partida</Label>
                                <Input id="match-title" value={scoreboard.matchTitle} onChange={(e) => setScoreboard(prev => prev ? {...prev, matchTitle: e.target.value} : null)} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Player A */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-semibold text-lg">Jogador A</h3>
                                    <div className="grid gap-2">
                                        <Label htmlFor="playerA-name">Nome</Label>
                                        <Input id="playerA-name" value={scoreboard.playerA.name} onChange={(e) => handlePlayerChange('A', 'name', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Pontuação</Label>
                                        <div className="flex items-center gap-4">
                                            <Button size="icon" variant="outline" onClick={() => handleScoreChange('A', -1)}><Minus /></Button>
                                            <Input type="number" className="text-center text-2xl font-bold h-12" value={scoreboard.scoreA} onChange={(e) => setScoreboard(prev => prev ? {...prev, scoreA: parseInt(e.target.value) || 0} : null)} />
                                            <Button size="icon" variant="outline" onClick={() => handleScoreChange('A', 1)}><Plus /></Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Player B */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-semibold text-lg">Jogador B</h3>
                                    <div className="grid gap-2">
                                        <Label htmlFor="playerB-name">Nome</Label>
                                        <Input id="playerB-name" value={scoreboard.playerB.name} onChange={(e) => handlePlayerChange('B', 'name', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Pontuação</Label>
                                        <div className="flex items-center gap-4">
                                            <Button size="icon" variant="outline" onClick={() => handleScoreChange('B', -1)}><Minus /></Button>
                                            <Input type="number" className="text-center text-2xl font-bold h-12" value={scoreboard.scoreB} onChange={(e) => setScoreboard(prev => prev ? {...prev, scoreB: parseInt(e.target.value) || 0} : null)} />
                                            <Button size="icon" variant="outline" onClick={() => handleScoreChange('B', 1)}><Plus /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="status-text">Status da Partida</Label>
                                    <Input id="status-text" value={scoreboard.statusText} onChange={(e) => setScoreboard(prev => prev ? {...prev, statusText: e.target.value} : null)} placeholder="Ex: Em andamento, Finalizado" />
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="frame">Frame / Set (Opcional)</Label>
                                    <Input id="frame" type="number" value={scoreboard.frame} onChange={(e) => setScoreboard(prev => prev ? {...prev, frame: parseInt(e.target.value) || 0} : null)} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Selecione um canal para ver ou editar o placar.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button size="lg" onClick={handleSave} disabled={!scoreboard}>Atualizar Placar</Button>
                </CardFooter>
            </Card>
        </main>
    );
}
