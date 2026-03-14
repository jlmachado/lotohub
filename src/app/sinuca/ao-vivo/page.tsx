
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
import { isValidYoutubeVideoId } from "@/utils/youtube";

export default function SinucaAoVivoPage() {
    const { snookerLiveConfig, snookerChannels, snookerPrimaryChannelId, joinChannel, leaveChannel, celebrationTrigger, clearCelebration, user } = useAppContext();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // Auto-select best channel based on Priority Score logic from Context
    useEffect(() => {
        if (!isClient || !snookerChannels || snookerChannels.length === 0) return;

        // If we have an elected primary channel and haven't manually changed it in this session yet
        if (snookerPrimaryChannelId && !activeChannelId) {
            setActiveChannelId(snookerPrimaryChannelId);
            return;
        }

        // Fallback fallback: if primary is gone but we have channels, pick first enabled
        if (!activeChannelId) {
            const fallback = snookerChannels.find(c => c.enabled && !c.isArchived);
            if (fallback) setActiveChannelId(fallback.id);
        }
    }, [isClient, snookerChannels, snookerPrimaryChannelId, activeChannelId]);

    useEffect(() => {
        if (!activeChannelId || !user) return;

        joinChannel(activeChannelId, user.id);

        return () => {
            leaveChannel(activeChannelId, user.id);
        };
    }, [activeChannelId, joinChannel, leaveChannel, user]);

    if (!isClient) return null;

    if (!activeChannelId && (!snookerChannels || snookerChannels.length === 0)) {
        return (
            <CasinoLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-primary animate-spin" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs italic">Aguardando transmissões...</p>
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
