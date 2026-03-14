
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Trophy, MapPin, Timer, Award, Zap } from "lucide-react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ScoreboardCardProps {
    channelId: string;
}

export const ScoreboardCard = ({ channelId }: ScoreboardCardProps) => {
    const { snookerChannels, snookerScoreboards } = useAppContext();
    
    const channel = useMemo(() => snookerChannels.find(c => c.id === channelId), [snookerChannels, channelId]);
    const scoreboard = useMemo(() => snookerScoreboards[channelId], [snookerScoreboards, channelId]);
    
    const [scoreAUpdated, setScoreAUpdated] = useState(false);
    const [scoreBUpdated, setScoreBUpdated] = useState(false);

    const prevScoreA = useRef(channel?.scoreA);
    const prevScoreB = useRef(channel?.scoreB);

    useEffect(() => {
        if (channel && prevScoreA.current !== undefined && channel.scoreA !== prevScoreA.current) {
            setScoreAUpdated(true);
            setTimeout(() => setScoreAUpdated(false), 300);
            prevScoreA.current = channel.scoreA;
        }
    }, [channel?.scoreA]);

    useEffect(() => {
        if (channel && prevScoreB.current !== undefined && channel.scoreB !== prevScoreB.current) {
            setScoreBUpdated(true);
            setTimeout(() => setScoreBUpdated(false), 300);
            prevScoreB.current = channel.scoreB;
        }
    }, [channel?.scoreB]);

    if (!channel) return null;
    
    return (
        <Card className="casino-card text-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-sm text-white font-black uppercase italic tracking-widest flex items-center gap-2">
                            <BarChart className="text-primary h-4 w-4" /> Placar
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase bg-black/20">BO{channel.bestOf}</Badge>
                            {channel.source === 'youtube' && <Badge className="bg-red-600/10 text-red-500 border-red-500/20 text-[8px] h-4 uppercase font-black italic">Live Sync</Badge>}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                {(channel.tournamentName || channel.prizeLabel) && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1.5">
                        {channel.tournamentName && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase italic text-primary truncate">
                                <Trophy size={12} /> {channel.tournamentName}
                                {channel.phase && <span className="text-white/40">• {channel.phase}</span>}
                            </div>
                        )}
                        {channel.prizeLabel && (
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-green-500 uppercase italic">
                                <Award size={10} /> Bolsa: {channel.prizeLabel}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                        <Image src={`https://picsum.photos/seed/${channel.playerA.name}/48/48`} alt="" width={40} height={40} className="rounded-full border-2 border-primary/20" />
                        <div className="min-w-0">
                            <span className="font-black text-sm uppercase italic truncate block">{channel.playerA.name}</span>
                            <p className="text-[9px] text-white/40 uppercase font-bold">Nível {channel.playerA.level}/10</p>
                        </div>
                    </div>
                    <span className={cn("text-4xl font-black italic tracking-tighter text-primary tabular-nums transition-all", scoreAUpdated && "scale-125 brightness-150")}>{channel.scoreA}</span>
                </div>

                <div className="flex items-center justify-center -my-2 relative z-10">
                    <div className="bg-slate-900 border border-white/10 px-3 py-0.5 rounded-full text-[9px] font-black uppercase italic tracking-[3px] text-muted-foreground shadow-lg">VS</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                        <Image src={`https://picsum.photos/seed/${channel.playerB.name}/48/48`} alt="" width={40} height={40} className="rounded-full border-2 border-primary/20" />
                        <div className="min-w-0">
                            <span className="font-black text-sm uppercase italic truncate block">{channel.playerB.name}</span>
                            <p className="text-[9px] text-white/40 uppercase font-bold">Nível {channel.playerB.level}/10</p>
                        </div>
                    </div>
                    <span className={cn("text-4xl font-black italic tracking-tighter text-primary tabular-nums transition-all", scoreBUpdated && "scale-125 brightness-150")}>{channel.scoreB}</span>
                </div>

                <div className="text-center pt-2 space-y-1">
                    <p className="text-[10px] text-primary font-black uppercase italic tracking-widest">
                        {scoreboard?.statusText || (channel.status === 'live' ? 'EM DISPUTA' : 'AGUARDANDO INÍCIO')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
