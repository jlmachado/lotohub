
'use client';
import { CasinoLayout } from "@/components/sinuca/CasinoLayout";
import { LiveChat } from "@/components/sinuca/LiveChat";
import { LivePlayer } from "@/components/sinuca/LivePlayer";
import { ScoreboardCard } from "@/components/sinuca/ScoreboardCard";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState, useMemo } from "react";
import { ChannelSelector } from "@/components/sinuca/ChannelSelector";
import { BetTicker } from "@/components/sinuca/BetTicker";
import { ConfettiCannon } from "@/components/Confetti";
import { ReactionsPanel } from "@/components/sinuca/ReactionsPanel";
import { BettingPanel } from "@/components/sinuca/BettingPanel";
import { ActivityTicker } from "@/components/sinuca/ActivityTicker";
import { MySnookerBets } from "@/components/sinuca/MySnookerBets";
import { VideoOff } from "lucide-react";

export default function SinucaAoVivoPage() {
    const { snookerLiveConfig, snookerChannels, snookerPrimaryChannelId, joinChannel, leaveChannel, celebrationTrigger, clearCelebration, user } = useAppContext();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // Lista apenas canais visíveis (Ao vivo ou Próximos)
    const visibleChannels = useMemo(() => 
        (snookerChannels || []).filter(c => 
            c.enabled && 
            !c.isArchived && 
            (c.visibilityStatus === 'live' || c.visibilityStatus === 'upcoming')
        ),
    [snookerChannels]);

    // Sincroniza canal ativo com o sugerido pelo sistema ou pelo admin
    useEffect(() => {
        if (!isClient || visibleChannels.length === 0) return;

        // Se o canal atual não está na lista de visíveis (ficou expirado por exemplo), troca
        if (activeChannelId && !visibleChannels.some(c => c.id === activeChannelId)) {
            setActiveChannelId(snookerPrimaryChannelId || visibleChannels[0].id);
            return;
        }

        if (!activeChannelId) {
            setActiveChannelId(snookerPrimaryChannelId || visibleChannels[0].id);
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

    if (visibleChannels.length === 0) {
        return (
            <CasinoLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-4">
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                        <VideoOff className="h-10 w-10 text-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Nenhuma Transmissão Ativa</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto">
                            Aguardando o início de novos jogos ao vivo ou próximos eventos agendados.
                        </p>
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
                {/* Main Content: Player and Widgets */}
                <div className="lg:col-span-2 space-y-6">
                    {activeChannelId && <LivePlayer channelId={activeChannelId} />}
                    {activeChannelId && <ActivityTicker channelId={activeChannelId} />}
                    {activeChannelId && <BetTicker channelId={activeChannelId} />}
                    {activeChannelId && <BettingPanel channelId={activeChannelId} />}
                    {activeChannelId && <MySnookerBets channelId={activeChannelId} />}
                </div>

                {/* Sidebar Content: Chat and Scoreboard */}
                <div className="lg:col-span-1 space-y-6">
                    {activeChannelId && <ScoreboardCard channelId={activeChannelId} />}
                    {activeChannelId && <LiveChat channelId={activeChannelId}/>}
                    {activeChannelId && <ReactionsPanel channelId={activeChannelId} />}
                </div>
            </div>
        </CasinoLayout>
    );
}
