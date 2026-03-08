'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BettingPanelProps {
    channelId: string;
}

export const BettingPanel = ({ channelId }: BettingPanelProps) => {
    const { snookerLiveConfig, snookerChannels, placeSnookerBet } = useAppContext();
    const { toast } = useToast();
    const channel = snookerChannels.find(c => c.id === channelId);
    
    const [amount, setAmount] = useState(snookerLiveConfig?.minBet || 5);
    const [selectedBet, setSelectedBet] = useState<'A' | 'B' | 'EMPATE' | null>(null);
    const [canBet, setCanBet] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    const [updatedOdd, setUpdatedOdd] = useState<'A' | 'B' | 'D' | null>(null);
    const prevOdds = useRef(channel?.odds);

    // Gating por horário e contagem regressiva
    useEffect(() => {
        if (!channel) return;
        const checkTime = () => {
            const now = new Date().getTime();
            const start = new Date(channel.scheduledAt).getTime();
            const diff = start - now;
            
            if (diff <= 0) {
                setCanBet(channel.status === 'live');
                setTimeLeft('');
            } else {
                setCanBet(false);
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
            }
        };
        checkTime();
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [channel]);

     useEffect(() => {
        if (channel && prevOdds.current) {
            let updated: 'A' | 'B' | 'D' | null = null;
            if (channel.odds.A !== prevOdds.current.A) updated = 'A';
            else if (channel.odds.B !== prevOdds.current.B) updated = 'B';
            else if (channel.odds.D !== prevOdds.current.D) updated = 'D';
            
            if (updated) {
                setUpdatedOdd(updated);
                const timer = setTimeout(() => setUpdatedOdd(null), 500);
                return () => clearTimeout(timer);
            }
        }
        prevOdds.current = channel?.odds;
    }, [channel?.odds]);

    const handleAmountChange = (delta: number) => {
        setAmount(prev => Math.max(snookerLiveConfig?.minBet || 1, prev + delta));
    };

    const handlePlaceBet = () => {
        if (!selectedBet || !channel) {
            toast({ variant: 'destructive', title: 'Selecione uma aposta' });
            return;
        }

        if (!canBet) {
            toast({ variant: 'destructive', title: 'Aposta bloqueada', description: 'O jogo ainda não começou.' });
            return;
        }
        
        const success = placeSnookerBet({
            channelId,
            pick: selectedBet,
            amount,
            oddsA: channel.odds.A,
            oddsB: channel.odds.B,
            oddsD: channel.odds.D,
        });
        
        if (success) {
            toast({ title: 'Aposta realizada com sucesso!' });
        }
    };
    
    const getButtonState = () => {
        if (!snookerLiveConfig?.betsEnabled) {
            return { text: 'APOSTAS DESABILITADAS', disabled: true };
        }
        if (!channel) {
            return { text: 'CARREGANDO JOGO...', disabled: true };
        }
        
        if (!canBet && timeLeft) {
            return { text: `COMEÇA EM ${timeLeft}`, disabled: true };
        }

        switch(channel.status) {
            case 'live':
                return { text: 'APOSTAR', disabled: !selectedBet };
            case 'scheduled':
            case 'imminent':
                return { text: 'AGUARDANDO INÍCIO', disabled: true };
            case 'finished':
            case 'cancelled':
                return { text: 'JOGO ENCERRADO', disabled: true };
            default:
                return { text: 'APOSTAS ENCERRADAS', disabled: true };
        }
    }

    const buttonState = getButtonState();

    return (
        <Card className="casino-card">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-white">Faça sua Aposta</CardTitle>
                    {!canBet && timeLeft && (
                        <Badge variant="outline" className="text-amber-400 border-amber-400/30 flex items-center gap-1 animate-pulse">
                            <Clock className="h-3 w-3" /> {timeLeft}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <Button 
                        variant={selectedBet === 'A' ? 'secondary' : 'outline'}
                        className="flex-col h-16 border-white/20"
                        onClick={() => setSelectedBet('A')}
                        disabled={!canBet}
                    >
                        <span className="truncate w-full text-center px-1">{channel?.playerA.name || 'Jogador A'}</span>
                        <span className={cn("font-bold text-primary", updatedOdd === 'A' && 'odds-update-flash')}>ODD {channel?.odds.A.toFixed(2) ?? "1.00"}</span>
                    </Button>
                    <Button 
                        variant={selectedBet === 'EMPATE' ? 'secondary' : 'outline'}
                        className="flex-col h-16 border-white/20"
                        onClick={() => setSelectedBet('EMPATE')}
                         disabled={!canBet}
                    >
                        <span>Empate</span>
                        <span className={cn("font-bold text-primary", updatedOdd === 'D' && 'odds-update-flash')}>ODD {channel?.odds.D.toFixed(2) ?? "1.00"}</span>
                    </Button>
                    <Button 
                        variant={selectedBet === 'B' ? 'secondary' : 'outline'}
                        className="flex-col h-16 border-white/20"
                        onClick={() => setSelectedBet('B')}
                         disabled={!canBet}
                    >
                        <span className="truncate w-full text-center px-1">{channel?.playerB.name || 'Jogador B'}</span>
                        <span className={cn("font-bold text-primary", updatedOdd === 'B' && 'odds-update-flash')}>ODD {channel?.odds.B.toFixed(2) ?? "1.00"}</span>
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="bet-amount" className="text-white/70">Valor da Aposta (R$)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-12 w-12 border-white/20" onClick={() => handleAmountChange(-5)} disabled={!canBet}><Minus/></Button>
                        <Input 
                            id="bet-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="casino-input text-center font-bold text-2xl h-12"
                             disabled={!canBet}
                        />
                         <Button variant="outline" size="icon" className="h-12 w-12 border-white/20" onClick={() => handleAmountChange(5)} disabled={!canBet}><Plus/></Button>
                    </div>
                </div>
                <Button 
                    className={cn(
                        "w-full h-14 text-lg transition-all",
                        buttonState.disabled ? "bg-gray-800 text-gray-500 border border-white/5" : "casino-gold-button"
                    )}
                    onClick={handlePlaceBet}
                    disabled={buttonState.disabled}
                >
                    {buttonState.text}
                </Button>
                {!canBet && channel && channel.status !== 'finished' && (
                    <p className="text-[10px] text-center text-white/40 uppercase tracking-widest">
                        Disponível a partir de {new Date(channel.scheduledAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};