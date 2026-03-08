'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext, SnookerBet } from "@/context/AppContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HandCoins } from "lucide-react";
import { cn } from '@/lib/utils';

interface MySnookerBetsProps {
    channelId: string;
}

const calculateCashOutValue = (bet: SnookerBet, channel: any, config: any): number => {
    if (!bet || !channel || !config || bet.pick === null) return 0;
    
    const oddsMap = { A: channel.odds.A, B: channel.odds.B, EMPATE: channel.odds.D };
    const currentOdd = oddsMap[bet.pick];
    const originalOdd = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD }[bet.pick];

    if (!currentOdd || !originalOdd) return 0;

    const potentialPayout = bet.amount * originalOdd;
    const fairValue = potentialPayout / currentOdd;
    const cashOutMargin = (config.cashOutMargin || 5) / 100;
    const houseCut = fairValue * cashOutMargin;
    
    return fairValue - houseCut;
};

export const MySnookerBets = ({ channelId }: MySnookerBetsProps) => {
    const { snookerBets, snookerChannels, snookerLiveConfig, cashOutSnookerBet } = useAppContext();
    const [selectedBet, setSelectedBet] = useState<SnookerBet | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCashOutValue, setCurrentCashOutValue] = useState(0);

    const openBets = useMemo(() => {
        return snookerBets
            .filter(bet => bet.userId === 'user-01' && bet.status === 'open' && bet.channelId === channelId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerBets, channelId]);

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
            
            calculateAndSet(); // Initial calculation
            const interval = setInterval(calculateAndSet, 2000); // Recalculate every 2 seconds
            
            return () => clearInterval(interval);
        }
    }, [isDialogOpen, selectedBet, channel, snookerLiveConfig]);

    if (openBets.length === 0) {
        return null; // Don't render the card if there are no open bets for this channel
    }

    return (
        <>
            <Card className="casino-card">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Minhas Apostas em Aberto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {openBets.map(bet => (
                        <div key={bet.id} className="p-3 bg-black/20 rounded-lg flex justify-between items-center">
                            <div>
                                <div className="font-semibold">
                                    Aposta em <Badge variant="secondary">{bet.pick}</Badge> de R$ {bet.amount.toFixed(2).replace('.', ',')}
                                </div>
                                <p className="text-xs text-white/60">
                                    Odd original: {({A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD}[bet.pick]).toFixed(2)}
                                </p>
                            </div>
                             <Button 
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-8 px-3"
                                onClick={() => handleOpenDialog(bet)}
                                disabled={channel?.status !== 'live'}
                            >
                                <HandCoins className="mr-2 h-4 w-4" />
                                Cash Out
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {selectedBet && (
                <AlertDialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Cash Out</AlertDialogTitle>
                            <AlertDialogDescription>
                                Você está prestes a encerrar sua aposta antecipadamente. O valor será creditado no seu saldo.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4 p-4 bg-muted rounded-lg space-y-2 text-center">
                            <p className="text-sm text-muted-foreground">Aposta Original</p>
                            <p className="font-bold">R$ {selectedBet.amount.toFixed(2).replace('.', ',')} em "{selectedBet.pick}" (Odd: {({A: selectedBet.oddsA, B: selectedBet.oddsB, EMPATE: selectedBet.oddsD}[selectedBet.pick]).toFixed(2)})</p>
                            <div className="pt-2">
                                <p className="text-sm text-muted-foreground">Valor do Cash Out Agora</p>
                                <p className={cn(
                                    "text-3xl font-extrabold transition-colors",
                                    currentCashOutValue > selectedBet.amount ? "text-green-500" : "text-red-500"
                                )}>
                                    R$ {currentCashOutValue.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmCashOut} disabled={currentCashOutValue <= 0.01}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};
