'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BettingPanelProps {
    channelId: string;
}

export const BettingPanel = ({ channelId }: BettingPanelProps) => {
    const { snookerLiveConfig, snookerChannels, placeSnookerBet, user, balance } = useAppContext();
    const { toast } = useToast();
    const channel = snookerChannels.find(c => c.id === channelId);
    
    const [amount, setAmount] = useState(snookerLiveConfig?.minBet || 5);
    const [selectedBet, setSelectedBet] = useState<'A' | 'B' | 'EMPATE' | null>(null);
    const [canBet, setCanBet] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [updatedOdd, setUpdatedOdd] = useState<'A' | 'B' | 'D' | null>(null);
    const prevOdds = useRef(channel?.odds);

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
        if (!user) {
            toast({ variant: 'destructive', title: 'Acesso Restrito', description: 'Faça login para realizar apostas.' });
            return;
        }

        if (!selectedBet || !channel) {
            toast({ variant: 'destructive', title: 'Selecione uma aposta' });
            return;
        }

        if (amount < (snookerLiveConfig.minBet || 1)) {
            toast({ variant: 'destructive', title: 'Valor inválido', description: `Aposta mínima é R$ ${snookerLiveConfig.minBet}` });
            return;
        }

        if (amount > balance && user.tipoUsuario !== 'CAMBISTA') {
            toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'Realize uma recarga para continuar.' });
            return;
        }

        setIsProcessing(true);
        
        const success = placeSnookerBet({
            channelId,
            pick: selectedBet,
            amount,
            oddsA: channel.odds.A,
            oddsB: channel.odds.B,
            oddsD: channel.odds.D,
        });
        
        if (success) {
            toast({ title: 'Aposta Confirmada!', description: 'Boa sorte!' });
            setSelectedBet(null);
        }
        setIsProcessing(false);
    };
    
    const getButtonState = () => {
        if (!user) return { text: 'FAÇA LOGIN PARA APOSTAR', disabled: true };
        if (!snookerLiveConfig?.betsEnabled) return { text: 'APOSTAS DESABILITADAS', disabled: true };
        if (!channel) return { text: 'CARREGANDO JOGO...', disabled: true };
        
        if (!canBet && timeLeft) return { text: `DISPONÍVEL EM ${timeLeft}`, disabled: true };

        switch(channel.status) {
            case 'live':
                return { text: isProcessing ? 'PROCESSANDO...' : 'CONFIRMAR APOSTA', disabled: !selectedBet || isProcessing };
            case 'scheduled':
            case 'imminent':
                return { text: 'AGUARDANDO INÍCIO', disabled: true };
            case 'finished':
            case 'cancelled':
                return { text: 'JOGO ENCERRADO', disabled: true };
            default:
                return { text: 'MERCADO FECHADO', disabled: true };
        }
    }

    const buttonState = getButtonState();

    return (
        <Card className="casino-card border-primary/10">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-white font-black italic uppercase tracking-tighter">Palpites do Jogo</CardTitle>
                    {!canBet && timeLeft && (
                        <Badge variant="outline" className="text-amber-400 border-amber-400/30 flex items-center gap-1 animate-pulse font-mono">
                            <Clock className="h-3 w-3" /> {timeLeft}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                    <Button 
                        variant={selectedBet === 'A' ? 'default' : 'outline'}
                        className={cn(
                            "flex-col h-20 border-white/10 transition-all rounded-xl",
                            selectedBet === 'A' && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        onClick={() => setSelectedBet('A')}
                        disabled={!canBet}
                    >
                        <span className="text-[10px] uppercase font-black opacity-60 truncate w-full text-center px-1 mb-1">{channel?.playerA.name || 'Jogador A'}</span>
                        <span className={cn("text-xl font-black italic text-primary", updatedOdd === 'A' && 'odds-update-flash')}>@{channel?.odds.A.toFixed(2) ?? "1.00"}</span>
                    </Button>
                    <Button 
                        variant={selectedBet === 'EMPATE' ? 'default' : 'outline'}
                        className={cn(
                            "flex-col h-20 border-white/10 transition-all rounded-xl",
                            selectedBet === 'EMPATE' && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        onClick={() => setSelectedBet('EMPATE')}
                         disabled={!canBet}
                    >
                        <span className="text-[10px] uppercase font-black opacity-60 mb-1">Empate</span>
                        <span className={cn("text-xl font-black italic text-primary", updatedOdd === 'D' && 'odds-update-flash')}>@{channel?.odds.D.toFixed(2) ?? "1.00"}</span>
                    </Button>
                    <Button 
                        variant={selectedBet === 'B' ? 'default' : 'outline'}
                        className={cn(
                            "flex-col h-20 border-white/10 transition-all rounded-xl",
                            selectedBet === 'B' && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        onClick={() => setSelectedBet('B')}
                         disabled={!canBet}
                    >
                        <span className="text-[10px] uppercase font-black opacity-60 truncate w-full text-center px-1 mb-1">{channel?.playerB.name || 'Jogador B'}</span>
                        <span className={cn("text-xl font-black italic text-primary", updatedOdd === 'B' && 'odds-update-flash')}>@{channel?.odds.B.toFixed(2) ?? "1.00"}</span>
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bet-amount" className="text-white/70 text-[10px] uppercase font-bold tracking-widest ml-1">Valor do Bilhete (R$)</Label>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 rounded-xl" onClick={() => handleAmountChange(-5)} disabled={!canBet}><Minus/></Button>
                        <Input 
                            id="bet-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="casino-input text-center font-black text-2xl h-12 rounded-xl"
                             disabled={!canBet}
                        />
                         <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 rounded-xl" onClick={() => handleAmountChange(5)} disabled={!canBet}><Plus/></Button>
                    </div>
                </div>

                <div className="pt-2">
                    <Button 
                        className={cn(
                            "w-full h-16 text-lg font-black uppercase italic rounded-xl shadow-xl transition-all active:scale-95",
                            buttonState.disabled ? "bg-gray-800 text-gray-500 border border-white/5" : "casino-gold-button lux-shine"
                        )}
                        onClick={handlePlaceBet}
                        disabled={buttonState.disabled}
                    >
                        {buttonState.text}
                    </Button>
                </div>

                {selectedBet && channel && (
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-primary h-4 w-4" />
                            <span className="text-xs font-bold text-white uppercase">Retorno Potencial:</span>
                        </div>
                        <span className="text-lg font-black text-primary italic">
                            R$ {(amount * (selectedBet === 'A' ? channel.odds.A : selectedBet === 'B' ? channel.odds.B : channel.odds.D)).toFixed(2)}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
