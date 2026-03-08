'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, User, Timer } from "lucide-react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
        <div className="flex items-center gap-2 text-sm text-primary font-mono">
            <Timer className="h-4 w-4" />
            <span>{timeLeft}</span>
        </div>
    );
};

export const ScoreboardCard = ({ channelId }: ScoreboardCardProps) => {
    const { snookerChannels, snookerScoreboards } = useAppContext();
    const channel = snookerChannels.find(c => c.id === channelId);
    const scoreboard = snookerScoreboards[channelId];
    
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


    if (!channel || !scoreboard) {
        return (
            <Card className="casino-card">
                <CardContent className="p-6 text-center text-white/60">
                    Carregando placar...
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="casino-card text-white">
            <CardHeader className="pb-2">
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <BarChart className="text-primary" />
                        Placar ao Vivo
                    </CardTitle>
                    {scoreboard.round.endsAt && <CountdownTimer endsAt={scoreboard.round.endsAt} />}
                </div>
                <p className="text-sm text-white/60">{channel.title} - Melhor de {channel.bestOf}</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {/* Player A */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <div className="flex items-center gap-3">
                         <Image src={channel.playerA.avatarUrl || `https://picsum.photos/seed/${channel.playerA.name}/40/40`} alt={channel.playerA.name} width={40} height={40} className="rounded-full border-2 border-white/20"/>
                        <div>
                            <span className="font-semibold">{channel.playerA.name}</span>
                            <p className="text-xs text-white/50">Nível {channel.playerA.level}</p>
                        </div>
                    </div>
                    <span className={cn("text-3xl font-bold text-primary score-value", scoreAUpdated && "score-updated")}>{channel.scoreA}</span>
                </div>

                {/* Player B */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <div className="flex items-center gap-3">
                        <Image src={channel.playerB.avatarUrl || `https://picsum.photos/seed/${channel.playerB.name}/40/40`} alt={channel.playerB.name} width={40} height={40} className="rounded-full border-2 border-white/20"/>
                        <div>
                            <span className="font-semibold">{channel.playerB.name}</span>
                            <p className="text-xs text-white/50">Nível {channel.playerB.level}</p>
                        </div>
                    </div>
                    <span className={cn("text-3xl font-bold text-primary score-value", scoreBUpdated && "score-updated")}>{channel.scoreB}</span>
                </div>

                <div className="text-center pt-2">
                    <p className="text-sm text-white/80 font-semibold">{scoreboard.statusText}</p>
                    {scoreboard.frame > 0 && <p className="text-xs text-white/60">Frame: {scoreboard.frame}</p>}
                </div>
            </CardContent>
        </Card>
    );
};
