'use client';
import { useAppContext } from "@/context/AppContext";
import { List } from "lucide-react";
import { useMemo } from "react";

interface BetTickerProps {
    channelId: string;
}

export const BetTicker = ({ channelId }: BetTickerProps) => {
    const { snookerBetsFeed } = useAppContext();
    
    const feedItems = useMemo(() =>
        snookerBetsFeed.filter(f => f.channelId === channelId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20),
    [snookerBetsFeed, channelId]);

    if (feedItems.length === 0) {
        return null; // Don't render if there's no feed
    }

    // Duplicate the content to create a seamless loop
    const tickerContent = [...feedItems, ...feedItems].map((item, index) => (
        <span key={`${item.id}-${index}`} className="flex items-center whitespace-nowrap mx-4">
            <span className="text-white/70">{item.text}</span>
            <span className="mx-2 text-white/40">•</span>
        </span>
    ));

    return (
        <div className="bet-ticker-container w-full overflow-hidden">
            <div className="flex items-center">
                <div className="flex-shrink-0 bg-amber-500/10 px-3 py-1 flex items-center gap-2">
                    <List className="h-4 w-4 text-amber-500"/>
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-400">APOSTAS</span>
                </div>
                <div className="flex bet-ticker-content">
                    {tickerContent}
                </div>
            </div>
        </div>
    );
};
