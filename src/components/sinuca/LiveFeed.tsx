'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { List } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useEffect } from "react";

interface LiveFeedProps {
    channelId: string;
}

export const LiveFeed = ({ channelId }: LiveFeedProps) => {
    const { snookerBetsFeed } = useAppContext();
    const feedEndRef = useRef<HTMLDivElement>(null);
    
    const feedItems = useMemo(() =>
        snookerBetsFeed.filter(f => f.channelId === channelId)
        .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-30), // Get last 30 items
    [snookerBetsFeed, channelId]);

    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [feedItems]);

    return (
        <Card className="casino-card">
            <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                    <List className="text-purple-400" />
                    Feed de Apostas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 h-64 overflow-y-auto">
                {feedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 text-sm p-2 bg-black/20 rounded-md animate-in fade-in-0 slide-in-from-bottom-2">
                         <Image src={`https://picsum.photos/seed/${item.userId}/24/24`} width={24} height={24} alt={item.userName} className="rounded-full" />
                         <p className="text-white/90">
                            <span className="font-semibold">{item.userName}</span> {item.text}
                         </p>
                    </div>
                ))}
                <div ref={feedEndRef} />
                 {feedItems.length === 0 && (
                    <p className="text-center text-white/60 pt-8">Aguardando novas apostas...</p>
                )}
            </CardContent>
        </Card>
    );
};
