
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
    const initialSyncDone = useRef(false);

    useEffect(() => {
        setIsClient(true);
        // Atualiza o relógio interno a cada minuto para manter status de visibilidade preciso
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 1. Sincronização Automática ao entrar na rota
    useEffect(() => {
        if (isClient && !initialSyncDone.current) {
            initialSyncDone.current = true;
            console.log('[Sinuca ao Vivo] Iniciando sincronização automática de entrada...');
            syncSnookerFromYoutube(true);
        }
    }, [isClient, syncSnookerFromYoutube]);
    
    // 2. Filtra canais visíveis usando a lógica de tempo real (mesma da HOME)
    const visibleChannels = useMemo(() => 
        (snookerChannels || []).filter(c => isSnookerVisibleOnHome(c, now)),
    [snookerChannels, now]);

    // 3. Lógica de Seleção do Canal Ativo (Reativa ao Sync)
    useEffect(() => {
        if (!isClient) return;

        // Verifica se o canal atual ainda é válido/visível
        const currentActiveIsValid = activeChannelId && visibleChannels.some(c => c.id === activeChannelId);
        
        if (!currentActiveIsValid) {
            // Tenta selecionar o principal sugerido pelo sistema
            if (snookerPrimaryChannelId && visibleChannels.some(c => c.id === snookerPrimaryChannelId)) {
                setActiveChannelId(snookerPrimaryChannelId);
            } 
            // Fallback: primeiro canal da lista visível
            else if (visibleChannels.length > 0) {
                setActiveChannelId(visibleChannels[0].id);
            } 
            // Nenhum canal disponível
            else {
                setActiveChannelId(null);
            }
        }
    }, [isClient, visibleChannels, snookerPrimaryChannelId, activeChannelId]);

    // 4. Gestão de Presença no Canal
    useEffect(() => {
        if (!activeChannelId || !user) return;
        joinChannel(activeChannelId, user.id);
        return () => {
            leaveChannel(activeChannelId, user.id);
        };
    }, [activeChannelId, joinChannel, leaveChannel, user]);

    if (!isClient) return null;

    // Estado de Loading Inicial (quando não há canais e está sincronizando)
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

    // Fallback para nenhum canal encontrado
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
                {/* Conteúdo Principal: Player e Widgets */}
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

                {/* Sidebar: Chat e Placar */}
                <div className="lg:col-span-1 space-y-6">
                    {activeChannelId && <ScoreboardCard channelId={activeChannelId} />}
                    {activeChannelId && <LiveChat channelId={activeChannelId}/>}
                    {activeChannelId && <ReactionsPanel channelId={activeChannelId} />}
                </div>
            </div>
        </CasinoLayout>
    );
}
