'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext, SnookerBet } from "@/context/AppContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HandCoins, Ticket, ArrowRight } from "lucide-react";
import { cn } from '@/lib/utils';
import { formatBRL } from '@/utils/currency';

interface MySnookerBetsProps {
    channelId: string;
}

const calculateCashOutValue = (bet: SnookerBet, channel: any, config: any): number => {
    if (!bet || !channel || !config || bet.pick === null) return 0;
    
    const oddsMap = { A: channel.odds.A, B: channel.odds.B, EMPATE: channel.odds.D };
    const currentOdd = oddsMap[bet.pick as keyof typeof oddsMap];
    const originalOdd = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD }[bet.pick as keyof typeof oddsMap];

    if (!currentOdd || !originalOdd) return 0;

    const potentialPayout = bet.amount * originalOdd;
    const fairValue = potentialPayout / currentOdd;
    const cashOutMargin = (config.cashOutMargin || 8) / 100;
    const houseCut = fairValue * cashOutMargin;
    
    return Math.max(0.01, fairValue - houseCut);
};

export const MySnookerBets = ({ channelId }: MySnookerBetsProps) => {
    const { snookerBets, snookerChannels, snookerLiveConfig, cashOutSnookerBet, user } = useAppContext();
    const [selectedBet, setSelectedBet] = useState<SnookerBet | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCashOutValue, setCurrentCashOutValue] = useState(0);

    const openBets = useMemo(() => {
        if (!user) return [];
        return snookerBets
            .filter(bet => bet.userId === user.id && bet.status === 'open' && bet.channelId === channelId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerBets, channelId, user]);

    const channel = useMemo(() => snookerChannels.find(c => c.id === channelId), [snookerChannels, channelId]);

    const handleOpenDialog = (bet: SnookerBet) => {
        setSelectedBet(bet);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedBet(null);
    };

    const handleConfirmCashOut = () => {
        if (selectedBet) {
            cashOutSnookerBet(selectedBet.id);
        }
        handleCloseDialog();
    };

    useEffect(() => {
        if (isDialogOpen && selectedBet && channel && snookerLiveConfig) {
            const calculateAndSet = () => {
                const value = calculateCashOutValue(selectedBet, channel, snookerLiveConfig);
                setCurrentCashOutValue(value);
            };
            
            calculateAndSet();
            const interval = setInterval(calculateAndSet, 2000);
            return () => clearInterval(interval);
        }
    }, [isDialogOpen, selectedBet, channel, snookerLiveConfig]);

    if (!user || openBets.length === 0) {
        return null;
    }

    return (
        <>
            <Card className="casino-card border-amber-500/20">
                <CardHeader className="pb-3 border-b border-white/5">
                    <CardTitle className="text-lg text-white font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Ticket className="text-amber-500 h-5 w-5" />
                        Minhas Apostas Abertas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    {openBets.map(bet => {
                        const originalOdd = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD }[bet.pick];
                        const potentialReturn = bet.amount * originalOdd;

                        return (
                            <div key={bet.id} className="p-4 bg-black/40 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-primary text-black font-black italic uppercase text-[10px]">
                                            {bet.pick}
                                        </Badge>
                                        <span className="font-bold text-white">R$ {bet.amount.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Odd: <span className="text-primary">@{originalOdd.toFixed(2)}</span></span>
                                        <span>Retorno: <span className="text-green-500">{formatBRL(potentialReturn)}</span></span>
                                    </div>
                                </div>
                                
                                <Button 
                                    className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase italic text-xs h-10 px-6 rounded-lg w-full md:w-auto shadow-lg"
                                    onClick={() => handleOpenDialog(bet)}
                                    disabled={channel?.status !== 'live'}
                                >
                                    <HandCoins className="mr-2 h-4 w-4" />
                                    Cash Out
                                </Button>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {selectedBet && (
                <AlertDialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
                    <AlertDialogContent className="bg-[#0f172a] border-white/10 max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white uppercase font-black italic text-xl">Encerrar Aposta?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 text-xs font-medium">
                                Confirme o encerramento antecipado. O valor será creditado imediatamente em seu saldo.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="my-6 p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4 text-center shadow-inner">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Aposta Original</p>
                                <p className="font-bold text-white text-sm">
                                    {formatBRL(selectedBet.amount)} em "{selectedBet.pick}" <span className="text-primary italic">(@{({A: selectedBet.oddsA, B: selectedBet.oddsB, EMPATE: selectedBet.oddsD}[selectedBet.pick]).toFixed(2)})</span>
                                </p>
                            </div>
                            
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] text-amber-500 uppercase font-black tracking-[3px] mb-2">Valor Disponível</p>
                                <div className="flex items-center justify-center gap-3">
                                    <p className={cn(
                                        "text-4xl font-black italic tracking-tighter tabular-nums transition-colors",
                                        currentCashOutValue > selectedBet.amount ? "text-green-500" : "text-amber-500"
                                    )}>
                                        {formatBRL(currentCashOutValue)}
                                    </p>
                                    <div className={cn(
                                        "p-1 rounded-md text-[10px] font-black uppercase italic",
                                        currentCashOutValue > selectedBet.amount ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                    )}>
                                        {currentCashOutValue > selectedBet.amount ? `+${((currentCashOutValue/selectedBet.amount - 1)*100).toFixed(0)}%` : `${((currentCashOutValue/selectedBet.amount - 1)*100).toFixed(0)}%`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <AlertDialogFooter className="flex-col gap-2">
                            <AlertDialogAction 
                                onClick={handleConfirmCashOut} 
                                disabled={currentCashOutValue <= 0.01}
                                className="w-full bg-primary text-black font-black uppercase italic h-12 rounded-xl"
                            >
                                Confirmar Recebimento
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full bg-transparent border-white/10 text-white hover:bg-white/5 h-12 rounded-xl">
                                Continuar Apostando
                            </AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};
