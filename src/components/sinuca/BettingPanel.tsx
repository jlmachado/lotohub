'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSnookerMarketState } from '@/utils/snooker-rules';

interface BettingPanelProps {
    channelId: string;
}

export const BettingPanel = ({ channelId }: BettingPanelProps) => {
    const { snookerLiveConfig, snookerChannels, placeSnookerBet, user, balance } = useAppContext();
    const { toast } = useToast();
    
    const channel = snookerChannels.find(c => c.id === channelId);
    const market = useMemo(() => getSnookerMarketState(channel), [channel]);
    
    const [amount, setAmount] = useState(snookerLiveConfig?.minBet || 5);
    const [selectedBet, setSelectedBet] = useState<'A' | 'B' | 'EMPATE' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [updatedOdd, setUpdatedOdd] = useState<'A' | 'B' | 'D' | null>(null);
    const prevOdds = useRef(channel?.odds);

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

        if (!market.isBettable) {
            toast({ variant: 'destructive', title: 'Mercado Fechado', description: market.reason || '' });
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

    const isLockedByProfile = !user;

    return (
        <Card className="casino-card border-primary/10">
            <CardHeader className="pb-2 sm:pb-3 flex flex-row items-center justify-between p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg text-white font-black uppercase italic tracking-tighter">
                    Painel de Apostas
                </CardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {market.isBettable && (
                        <div className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                    <Badge className={cn(
                        "text-[8px] sm:text-[9px] uppercase font-black px-1.5 sm:px-2 h-4.5 sm:h-5",
                        market.isBettable ? "bg-green-600" : "bg-slate-800"
                    )}>
                        {market.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 p-3 sm:p-6">
                {!market.isBettable && !isLockedByProfile && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 sm:p-3 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] sm:text-[10px] text-amber-200/70 font-bold uppercase tracking-wide leading-relaxed">
                            {market.reason}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <BetButton 
                        label={channel?.playerA.name || 'Mandante'} 
                        odd={channel?.odds.A || 1} 
                        active={selectedBet === 'A'} 
                        updated={updatedOdd === 'A'}
                        onClick={() => setSelectedBet('A')}
                        disabled={!market.isBettable && !selectedBet}
                    />
                    <BetButton 
                        label="Empate" 
                        odd={channel?.odds.D || 1} 
                        active={selectedBet === 'EMPATE'} 
                        updated={updatedOdd === 'D'}
                        onClick={() => setSelectedBet('EMPATE')}
                        disabled={!market.isBettable && !selectedBet}
                    />
                    <BetButton 
                        label={channel?.playerB.name || 'Visitante'} 
                        odd={channel?.odds.B || 1} 
                        active={selectedBet === 'B'} 
                        updated={updatedOdd === 'B'}
                        onClick={() => setSelectedBet('B')}
                        disabled={!market.isBettable && !selectedBet}
                    />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-white/70 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest ml-1">Valor da Aposta (R$)</Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 border-white/10 rounded-xl flex-shrink-0" onClick={() => handleAmountChange(-5)} disabled={!market.isBettable}><Minus className="h-4 w-4"/></Button>
                        <Input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="casino-input text-center font-black text-xl sm:text-2xl h-10 sm:h-12 rounded-xl flex-grow"
                            disabled={!market.isBettable}
                        />
                         <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 border-white/10 rounded-xl flex-shrink-0" onClick={() => handleAmountChange(5)} disabled={!market.isBettable}><Plus className="h-4 w-4"/></Button>
                    </div>
                </div>

                <Button 
                    className={cn(
                        "w-full h-12 sm:h-16 text-sm sm:text-lg font-black uppercase italic rounded-xl shadow-xl transition-all active:scale-95",
                        !market.isBettable || isLockedByProfile ? "bg-gray-800 text-gray-500 border-white/5" : "casino-gold-button lux-shine"
                    )}
                    onClick={handlePlaceBet}
                    disabled={!market.isBettable || isLockedByProfile || isProcessing}
                >
                    {isProcessing ? 'PROCESSANDO...' : isLockedByProfile ? 'LOGUE PARA APOSTAR' : market.isBettable ? (channel?.status === 'live' ? 'APOSTA AO VIVO' : 'APOSTA PRÉ-JOGO') : market.label}
                </Button>

                {selectedBet && channel && market.isBettable && (
                    <div className="bg-primary/10 border border-primary/20 p-2.5 sm:p-3 rounded-xl flex items-center justify-between animate-in zoom-in-95">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <CheckCircle2 className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-[10px] sm:text-xs font-bold text-white uppercase">Retorno:</span>
                        </div>
                        <span className="text-base sm:text-lg font-black text-primary italic">
                            R$ {(amount * (selectedBet === 'A' ? channel.odds.A : selectedBet === 'B' ? channel.odds.B : channel.odds.D)).toFixed(2).replace('.', ',')}
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
                "flex-col h-16 sm:h-20 border-white/10 transition-all rounded-xl p-1",
                active && "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/20",
                !active && "hover:bg-white/5"
            )}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="text-[7px] sm:text-[9px] uppercase font-black opacity-60 truncate w-full px-1 mb-0.5 sm:mb-1">{label}</span>
            <span className={cn("text-base sm:text-xl font-black italic text-primary", updated && 'odds-update-flash')}>@{odd.toFixed(2)}</span>
        </Button>
    );
}
