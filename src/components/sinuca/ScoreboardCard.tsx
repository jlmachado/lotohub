
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Trophy, MapPin, Timer, Award } from "lucide-react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ScoreboardCardProps {
    channelId: string;
}

const CountdownTimer = ({ endsAt }: { endsAt: string }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(endsAt).getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft("00:00");
                clearInterval(interval);
                return;
            }
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endsAt]);

    return (
        <div className="flex items-center gap-2 text-sm text-primary font-mono bg-black/40 px-2 py-1 rounded-lg">
            <Timer className="h-3 w-3" />
            <span>{timeLeft}</span>
        </div>
    );
};

export const ScoreboardCard = ({ channelId }: ScoreboardCardProps) => {
    const { snookerChannels, snookerScoreboards } = useAppContext();
    
    const channel = useMemo(() => 
        snookerChannels.find(c => c.id === channelId), 
    [snookerChannels, channelId]);
    
    const scoreboard = useMemo(() => 
        snookerScoreboards[channelId], 
    [snookerScoreboards, channelId]);
    
    const [scoreAUpdated, setScoreAUpdated] = useState(false);
    const [scoreBUpdated, setScoreBUpdated] = useState(false);

    const prevScoreA = useRef(channel?.scoreA);
    const prevScoreB = useRef(channel?.scoreB);

    useEffect(() => {
        if (channel && prevScoreA.current !== undefined && channel.scoreA !== prevScoreA.current) {
            setScoreAUpdated(true);
            const timer = setTimeout(() => setScoreAUpdated(false), 300);
            prevScoreA.current = channel.scoreA;
            return () => clearTimeout(timer);
        }
         if (channel && prevScoreA.current === undefined) {
             prevScoreA.current = channel.scoreA;
         }
    }, [channel?.scoreA]);

    useEffect(() => {
        if (channel && prevScoreB.current !== undefined && channel.scoreB !== prevScoreB.current) {
            setScoreBUpdated(true);
            const timer = setTimeout(() => setScoreBUpdated(false), 300);
            prevScoreB.current = channel.scoreB;
            return () => clearTimeout(timer);
        }
         if (channel && prevScoreB.current === undefined) {
             prevScoreB.current = channel.scoreB;
         }
    }, [channel?.scoreB]);


    if (!channel) {
        return (
            <Card className="casino-card flex items-center justify-center p-8 border-dashed">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">Aguardando dados da partida...</p>
            </Card>
        );
    }
    
    return (
        <Card className="casino-card text-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-sm text-white font-black uppercase italic tracking-widest flex items-center gap-2">
                            <BarChart className="text-primary h-4 w-4" /> Placar ao Vivo
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase font-black bg-black/20">BO{channel.bestOf}</Badge>
                            {channel.modality && <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase font-black bg-black/20">{channel.modality}</Badge>}
                        </div>
                    </div>
                    {scoreboard?.round?.endsAt && <CountdownTimer endsAt={scoreboard.round.endsAt} />}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                {/* METADATA AUTO-SYNC */}
                {(channel.tournamentName || channel.prizeLabel || channel.location) && (
                    <div className="grid grid-cols-1 gap-2 mb-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        {channel.tournamentName && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase italic text-primary truncate">
                                <Trophy size={12} /> {channel.tournamentName}
                                {channel.phase && <span className="text-white/40">• {channel.phase}</span>}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            {channel.location && (
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                    <MapPin size={10} className="text-primary/50" /> {channel.location}
                                </div>
                            )}
                            {channel.prizeLabel && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-green-500 uppercase italic">
                                    <Award size={10} /> {channel.prizeLabel}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Player A */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                         <div className="relative">
                            <Image 
                                src={channel.playerA.avatarUrl || `https://picsum.photos/seed/${channel.playerA.name}/48/48`} 
                                alt={channel.playerA.name} 
                                width={40} 
                                height={40} 
                                className="rounded-full border-2 border-primary/20 bg-slate-800"
                            />
                            {channel.scoreA > channel.scoreB && <div className="absolute -top-1 -right-1 bg-primary text-black rounded-full p-0.5"><Trophy size={10}/></div>}
                         </div>
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

                {/* Player B */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                            <Image 
                                src={channel.playerB.avatarUrl || `https://picsum.photos/seed/${channel.playerB.name}/48/48`} 
                                alt={channel.playerB.name} 
                                width={40} 
                                height={40} 
                                className="rounded-full border-2 border-primary/20 bg-slate-800"
                            />
                            {channel.scoreB > channel.scoreA && <div className="absolute -top-1 -right-1 bg-primary text-black rounded-full p-0.5"><Trophy size={10}/></div>}
                        </div>
                        <div className="min-w-0">
                            <span className="font-black text-sm uppercase italic truncate block">{channel.playerB.name}</span>
                            <p className="text-[9px] text-white/40 uppercase font-bold">Nível {channel.playerB.level}/10</p>
                        </div>
                    </div>
                    <span className={cn("text-4xl font-black italic tracking-tighter text-primary tabular-nums transition-all", scoreBUpdated && "scale-125 brightness-150")}>{channel.scoreB}</span>
                </div>

                <div className="text-center pt-2 space-y-1">
                    <p className="text-[10px] text-primary font-black uppercase italic tracking-widest">{scoreboard?.statusText || channel.status.toUpperCase()}</p>
                    {scoreboard && scoreboard.frame > 0 && <p className="text-[9px] text-white/40 uppercase font-bold tracking-tighter">Frame em disputa: {scoreboard.frame}</p>}
                </div>
            </CardContent>
        </Card>
    );
};
