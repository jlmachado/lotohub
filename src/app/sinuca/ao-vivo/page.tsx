
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

export default function SinucaAoVivoPage() {
    const { snookerLiveConfig, snookerChannels, joinChannel, leaveChannel, celebrationTrigger, clearCelebration, user } = useAppContext();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    
    // Auto-select best channel
    useEffect(() => {
        if (activeChannelId || !snookerChannels || snookerChannels.length === 0) return;

        // Priorities: 1. Live, 2. Imminent, 3. Scheduled, 4. Default Config
        const enabled = snookerChannels.filter(c => c.enabled);
        const live = enabled.find(c => c.status === 'live');
        const imminent = enabled.find(c => c.status === 'imminent');
        const scheduled = enabled.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).find(c => c.status === 'scheduled');

        if (live) setActiveChannelId(live.id);
        else if (imminent) setActiveChannelId(imminent.id);
        else if (scheduled) setActiveChannelId(scheduled.id);
        else if (snookerLiveConfig?.defaultChannelId) setActiveChannelId(snookerLiveConfig.defaultChannelId);
        else if (enabled[0]) setActiveChannelId(enabled[0].id);
    }, [activeChannelId, snookerChannels, snookerLiveConfig]);

    useEffect(() => {
        if (!activeChannelId || !user) return;

        joinChannel(activeChannelId, user.id);

        return () => {
            leaveChannel(activeChannelId, user.id);
        };
    }, [activeChannelId, joinChannel, leaveChannel, user]);

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
