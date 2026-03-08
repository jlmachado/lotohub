'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerLiveConfig } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function AdminSinucaLivePage() {
    const { snookerLiveConfig, snookerChannels, updateSnookerLiveConfig } = useAppContext();
    const { toast } = useToast();

    const [config, setConfig] = useState<Omit<SnookerLiveConfig, 'updatedAt'> | null>(null);

    useEffect(() => {
        if (snookerLiveConfig) {
            setConfig(snookerLiveConfig);
        }
    }, [snookerLiveConfig]);
    
    const handleInputChange = (field: keyof SnookerLiveConfig, value: any) => {
        if (!config) return;
        setConfig(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (config) {
            updateSnookerLiveConfig(config);
            toast({
                title: 'Configurações Salvas',
                description: 'As configurações da transmissão ao vivo foram atualizadas.'
            });
        }
    };
    
    if (!config) {
        return <div>Carregando configurações...</div>;
    }

    const availableChannels = snookerChannels.filter(c => c.enabled);

    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Gerenciar Transmissão</h1>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Configurações Gerais da Live</CardTitle>
                    <CardDescription>
                        Ajuste as opções globais para as transmissões de sinuca.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="default-channel">Canal Padrão</Label>
                        <Select 
                            value={config.defaultChannelId} 
                            onValueChange={(value) => handleInputChange('defaultChannelId', value)}
                        >
                            <SelectTrigger id="default-channel">
                                <SelectValue placeholder="Selecione um canal padrão" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableChannels.map(channel => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Este será o canal carregado ao abrir a página "Sinuca ao Vivo".</p>
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="show-badge" className="text-base">Mostrar Badge "AO VIVO"</Label>
                            <p className="text-sm text-muted-foreground">Exibe o indicador "AO VIVO" no site.</p>
                        </div>
                        <Switch id="show-badge" checked={config.showLiveBadge} onCheckedChange={(checked) => handleInputChange('showLiveBadge', checked)} />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="bets-enabled" className="text-base">Habilitar Apostas</Label>
                            <p className="text-sm text-muted-foreground">Permite que usuários façam apostas.</p>
                        </div>
                        <Switch id="bets-enabled" checked={config.betsEnabled} onCheckedChange={(checked) => handleInputChange('betsEnabled', checked)} />
                    </div>

                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="min-bet">Aposta Mínima (R$)</Label>
                            <Input id="min-bet" type="number" value={config.minBet} onChange={(e) => handleInputChange('minBet', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="max-bet">Aposta Máxima (R$)</Label>
                            <Input id="max-bet" type="number" value={config.maxBet} onChange={(e) => handleInputChange('maxBet', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                     <div className="grid gap-2">
                        <Label htmlFor="cashout-margin">Margem de Cash Out (%)</Label>
                        <Input id="cashout-margin" type="number" value={config.cashOutMargin} onChange={(e) => handleInputChange('cashOutMargin', parseFloat(e.target.value) || 0)} />
                        <p className="text-xs text-muted-foreground">Taxa extra aplicada sobre o valor do cash out. Recomendado: 5% a 10%.</p>
                    </div>
                    
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="chat-enabled" className="text-base">Habilitar Chat</Label>
                            <p className="text-sm text-muted-foreground">Permite que usuários enviem mensagens no chat.</p>
                        </div>
                        <Switch id="chat-enabled" checked={config.chatEnabled} onCheckedChange={(checked) => handleInputChange('chatEnabled', checked)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="reactions-enabled" className="text-base">Habilitar Reações</Label>
                            <p className="text-sm text-muted-foreground">Permite que usuários enviem reações rápidas.</p>
                        </div>
                        <Switch id="reactions-enabled" checked={config.reactionsEnabled} onCheckedChange={(checked) => handleInputChange('reactionsEnabled', checked)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="profanity-filter-enabled" className="text-base">Filtro de Palavrões</Label>
                            <p className="text-sm text-muted-foreground">Ativa um filtro simples para palavras ofensivas no chat.</p>
                        </div>
                        <Switch id="profanity-filter-enabled" checked={config.profanityFilterEnabled} onCheckedChange={(checked) => handleInputChange('profanityFilterEnabled', checked)} />
                    </div>

                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave}>Salvar Configurações</Button>
                </CardFooter>
            </Card>
        </main>
    );
}
