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
    const { snookerLiveConfig, snookerChannels, joinChannel, leaveChannel, celebrationTrigger, clearCelebration } = useAppContext();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    
    const userId = useMemo(() => "user-01", []);

    useEffect(() => {
        if (snookerLiveConfig?.defaultChannelId && !activeChannelId) {
            setActiveChannelId(snookerLiveConfig.defaultChannelId);
        } else if (!activeChannelId && snookerChannels && snookerChannels.length > 0) {
            // Fallback to the first enabled channel
            const firstChannel = snookerChannels.find(c => c.enabled);
            if (firstChannel) {
                setActiveChannelId(firstChannel.id);
            } else if (snookerChannels[0]) {
                setActiveChannelId(snookerChannels[0].id);
            }
        }
    }, [snookerLiveConfig, activeChannelId, snookerChannels]);

    useEffect(() => {
        if (!activeChannelId) return;

        joinChannel(activeChannelId, userId);

        return () => {
            leaveChannel(activeChannelId, userId);
        };
    }, [activeChannelId, joinChannel, leaveChannel, userId]);


    if (!activeChannelId) {
        return (
            <CasinoLayout>
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-white/70">Carregando canais de sinuca...</p>
                </div>
            </CasinoLayout>
        );
    }
    
    return (
        <CasinoLayout>
             <ConfettiCannon fire={celebrationTrigger} onComplete={clearCelebration} />
            <div className="mb-6">
                <ChannelSelector
                    activeChannelId={activeChannelId}
                    onChannelChange={setActiveChannelId}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main Content: Player and Widgets */}
                <div className="lg:col-span-2 space-y-6">
                    <LivePlayer channelId={activeChannelId} />
                    <ActivityTicker channelId={activeChannelId} />
                    <BetTicker channelId={activeChannelId} />
                    <BettingPanel channelId={activeChannelId} />
                    <MySnookerBets channelId={activeChannelId} />
                </div>

                {/* Sidebar Content: Chat and Scoreboard */}
                <div className="lg:col-span-1 space-y-6">
                    <ScoreboardCard channelId={activeChannelId} />
                    <LiveChat channelId={activeChannelId}/>
                    <ReactionsPanel channelId={activeChannelId} />
                </div>
            </div>
        </CasinoLayout>
    );
}
