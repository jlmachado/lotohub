
'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Clock, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BettingPanelProps {
    channelId: string;
}

export const BettingPanel = ({ channelId }: BettingPanelProps) => {
    const { snookerLiveConfig, snookerChannels, snookerAutomationSettings, placeSnookerBet, user, balance } = useAppContext();
    const { toast } = useToast();
    const channel = snookerChannels.find(c => c.id === channelId);
    
    const [amount, setAmount] = useState(snookerLiveConfig?.minBet || 5);
    const [selectedBet, setSelectedBet] = useState<'A' | 'B' | 'EMPATE' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [updatedOdd, setUpdatedOdd] = useState<'A' | 'B' | 'D' | null>(null);
    const prevOdds = useRef(channel?.odds);

    // Monitora atualização visual de odds
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

        if (amount > (user.tipoUsuario === 'CAMBISTA' ? 999999 : balance)) {
            toast({ variant: 'destructive', title: 'Saldo Insuficiente' });
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
            isPreMatch: channel.status !== 'live'
        });
        
        if (success) {
            toast({ title: 'Aposta Confirmada!' });
            setSelectedBet(null);
        }
        setIsProcessing(false);
    };
    
    const getMarketState = () => {
        if (!user) return { text: 'FAÇA LOGIN PARA APOSTAR', disabled: true, label: 'Bloqueado' };
        if (!snookerLiveConfig?.betsEnabled || !channel?.enabled) return { text: 'MERCADO DESABILITADO', disabled: true, label: 'Fechado' };
        if (!channel) return { text: 'CARREGANDO...', disabled: true, label: '...' };

        const isLive = channel.status === 'live';
        const isScheduled = channel.status === 'scheduled' || channel.status === 'imminent';
        const isFinished = channel.status === 'finished' || channel.status === 'cancelled';

        if (isFinished) return { text: 'JOGO ENCERRADO', disabled: true, label: 'Finalizado' };

        // Regra de Apostas Pré-Live
        if (isScheduled) {
            if (!snookerAutomationSettings.allowPreMatchBetting) {
                return { text: 'APOSTAS SOMENTE AO VIVO', disabled: true, label: 'Pré-jogo' };
            }
            return { text: isProcessing ? '...' : 'CONFIRMAR PRÉ-JOGO', disabled: !selectedBet, label: 'Pré-jogo' };
        }

        if (isLive) {
            if (!snookerAutomationSettings.allowLiveBetting) {
                return { text: 'MERCADO LIVE FECHADO', disabled: true, label: 'Ao vivo' };
            }
            return { text: isProcessing ? '...' : 'CONFIRMAR APOSTA LIVE', disabled: !selectedBet, label: 'Ao vivo' };
        }

        return { text: 'MERCADO INDISPONÍVEL', disabled: true, label: 'Fechado' };
    };

    const market = getMarketState();

    return (
        <Card className="casino-card border-primary/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white font-black uppercase italic tracking-tighter">
                    Painel de Apostas
                </CardTitle>
                <Badge className={cn(
                    "text-[9px] uppercase font-black px-2 h-5",
                    market.label === 'Ao vivo' ? "bg-red-600 animate-pulse" : "bg-blue-600"
                )}>
                    {market.label}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                    <BetButton 
                        label={channel?.playerA.name || 'Mandante'} 
                        odd={channel?.odds.A || 1} 
                        active={selectedBet === 'A'} 
                        updated={updatedOdd === 'A'}
                        onClick={() => setSelectedBet('A')}
                        disabled={market.disabled && !selectedBet}
                    />
                    <BetButton 
                        label="Empate" 
                        odd={channel?.odds.D || 1} 
                        active={selectedBet === 'EMPATE'} 
                        updated={updatedOdd === 'D'}
                        onClick={() => setSelectedBet('EMPATE')}
                        disabled={market.disabled && !selectedBet}
                    />
                    <BetButton 
                        label={channel?.playerB.name || 'Visitante'} 
                        odd={channel?.odds.B || 1} 
                        active={selectedBet === 'B'} 
                        updated={updatedOdd === 'B'}
                        onClick={() => setSelectedBet('B')}
                        disabled={market.disabled && !selectedBet}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-white/70 text-[10px] uppercase font-bold tracking-widest ml-1">Valor da Aposta (R$)</Label>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 rounded-xl" onClick={() => handleAmountChange(-5)}><Minus/></Button>
                        <Input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="casino-input text-center font-black text-2xl h-12 rounded-xl"
                        />
                         <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 rounded-xl" onClick={() => handleAmountChange(5)}><Plus/></Button>
                    </div>
                </div>

                <Button 
                    className={cn(
                        "w-full h-16 text-lg font-black uppercase italic rounded-xl shadow-xl transition-all active:scale-95",
                        market.disabled ? "bg-gray-800 text-gray-500 border-white/5" : "casino-gold-button lux-shine"
                    )}
                    onClick={handlePlaceBet}
                    disabled={market.disabled}
                >
                    {market.text}
                </Button>

                {selectedBet && channel && (
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between">
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

function BetButton({ label, odd, active, updated, onClick, disabled }: any) {
    return (
        <Button 
            variant={active ? 'default' : 'outline'}
            className={cn(
                "flex-col h-20 border-white/10 transition-all rounded-xl",
                active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="text-[9px] uppercase font-black opacity-60 truncate w-full px-1 mb-1">{label}</span>
            <span className={cn("text-xl font-black italic text-primary", updated && 'odds-update-flash')}>@{odd.toFixed(2)}</span>
        </Button>
    );
}
