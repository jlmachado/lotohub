'use client';
import { CasinoLayout } from "@/components/sinuca/CasinoLayout";
import { LiveChat } from "@/components/sinuca/LiveChat";
import { LivePlayer } from "@/components/sinuca/LivePlayer";
import { ScoreboardCard } from "@/components/sinuca/ScoreboardCard";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState, useMemo, useRef } from "react";
import { ChannelSelector } from "@/components/sinuca/ChannelSelector";
import { BetTicker } from "@/components/sinuca/BetTicker";
import { ConfettiCannon } from "@/components/Confetti";
import { ReactionsPanel } from "@/components/sinuca/ReactionsPanel";
import { BettingPanel } from "@/components/sinuca/BettingPanel";
import { ActivityTicker } from "@/components/sinuca/ActivityTicker";
import { MySnookerBets } from "@/components/sinuca/MySnookerBets";
import { VideoOff, Loader2, RefreshCw } from "lucide-react";
import { isSnookerVisibleOnHome } from "@/utils/snooker-rules";
import { Button } from "@/components/ui/button";

export default function SinucaAoVivoPage() {
    const { 
        snookerChannels, 
        snookerPrimaryChannelId, 
        joinChannel, 
        leaveChannel, 
        celebrationTrigger, 
        clearCelebration, 
        user,
        syncSnookerFromYoutube,
        snookerSyncState
    } = useAppContext();
    
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [now, setNow] = useState(new Date());
    const initialSyncDoneRef = useRef(false);

    useEffect(() => {
        setIsClient(true);
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Sincronização Inteligente de Entrada
    useEffect(() => {
        if (!isClient || initialSyncDoneRef.current) return;
        
        const performSync = async () => {
            initialSyncDoneRef.current = true;
            
            // Verifica staleness antes de sync agressivo
            const hasLive = (snookerChannels || []).some(c => c.status === 'live');
            const threshold = hasLive ? 60000 : 300000;
            
            // Para sinuca, como o status de 'live' no YouTube muda rápido, 
            // forçamos o sync se não houver um sync muito recente
            await syncSnookerFromYoutube(true);
        };

        performSync();
    }, [isClient, syncSnookerFromYoutube, snookerChannels]);
    
    const visibleChannels = useMemo(() => 
        (snookerChannels || []).filter(c => isSnookerVisibleOnHome(c, now)),
    [snookerChannels, now]);

    // Atualiza o canal ativo baseado no resultado do Sync ou seleção manual
    useEffect(() => {
        if (!isClient) return;

        const currentActiveIsValid = activeChannelId && visibleChannels.some(c => c.id === activeChannelId);
        
        if (!currentActiveIsValid) {
            if (snookerPrimaryChannelId && visibleChannels.some(c => c.id === snookerPrimaryChannelId)) {
                setActiveChannelId(snookerPrimaryChannelId);
            } 
            else if (visibleChannels.length > 0) {
                setActiveChannelId(visibleChannels[0].id);
            } 
            else {
                setActiveChannelId(null);
            }
        }
    }, [isClient, visibleChannels, snookerPrimaryChannelId, activeChannelId]);

    useEffect(() => {
        if (!activeChannelId || !user) return;
        joinChannel(activeChannelId, user.id);
        return () => {
            leaveChannel(activeChannelId, user.id);
        };
    }, [activeChannelId, joinChannel, leaveChannel, user]);

    if (!isClient) return null;

    const isInitialLoading = snookerSyncState === 'syncing' && visibleChannels.length === 0;

    if (isInitialLoading) {
        return (
            <CasinoLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="space-y-1 text-center">
                        <p className="text-white font-black uppercase italic text-lg tracking-tighter">Preparando Transmissões</p>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-[9px]">Sincronizando eventos em tempo real...</p>
                    </div>
                </div>
            </CasinoLayout>
        );
    }

    if (visibleChannels.length === 0 && snookerSyncState !== 'syncing') {
        return (
            <CasinoLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-4">
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                        <VideoOff className="h-10 w-10 text-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Nenhuma Transmissão Ativa</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto">
                            Não encontramos jogos ao vivo ou próximos eventos agendados para este momento.
                        </p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4 border-white/10 font-bold uppercase text-[10px]"
                            onClick={() => syncSnookerFromYoutube(true)}
                        >
                            <RefreshCw className="mr-2 h-3 w-3" /> Tentar Sincronizar Novamente
                        </Button>
                    </div>
                </div>
            </CasinoLayout>
        );
    }
    
    return (
        <CasinoLayout>
             <ConfettiCannon fire={celebrationTrigger} onComplete={clearCelebration} />
            <div className="mb-6">
                <ChannelSelector
                    activeChannelId={activeChannelId || ''}
                    onChannelChange={setActiveChannelId}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {activeChannelId ? (
                        <LivePlayer channelId={activeChannelId} />
                    ) : (
                        <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5">
                            <p className="text-slate-500 font-black uppercase italic text-xs">Selecione uma mesa para assistir</p>
                        </div>
                    )}
                    {activeChannelId && <ActivityTicker channelId={activeChannelId} />}
                    {activeChannelId && <BetTicker channelId={activeChannelId} />}
                    {activeChannelId && <BettingPanel channelId={activeChannelId} />}
                    {activeChannelId && <MySnookerBets channelId={activeChannelId} />}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {activeChannelId && <ScoreboardCard channelId={activeChannelId} />}
                    {activeChannelId && <LiveChat channelId={activeChannelId}/>}
                    {activeChannelId && <ReactionsPanel channelId={activeChannelId} />}
                </div>
            </div>
        </CasinoLayout>
    );
}
