'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Trophy, Award } from "lucide-react";
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
    
    const officialScoreboard = useMemo(() => snookerScoreboards[channelId], [snookerScoreboards, channelId]);
    
    const scoreA = officialScoreboard ? officialScoreboard.scoreA : (channel?.scoreA || 0);
    const scoreB = officialScoreboard ? officialScoreboard.scoreB : (channel?.scoreB || 0);
    
    const [scoreAUpdated, setScoreAUpdated] = useState(false);
    const [scoreBUpdated, setScoreBUpdated] = useState(false);

    const prevScoreA = useRef(scoreA);
    const prevScoreB = useRef(scoreB);

    useEffect(() => {
        if (scoreA !== prevScoreA.current) {
            setScoreAUpdated(true);
            setTimeout(() => setScoreAUpdated(false), 300);
            prevScoreA.current = scoreA;
        }
    }, [scoreA]);

    useEffect(() => {
        if (scoreB !== prevScoreB.current) {
            setScoreBUpdated(true);
            setTimeout(() => setScoreBUpdated(false), 300);
            prevScoreB.current = scoreB;
        }
    }, [scoreB]);

    if (!channel) return null;
    
    return (
        <Card className="casino-card text-white overflow-hidden shadow-2xl">
            <CardHeader className="pb-2 sm:pb-3 border-b border-white/5 bg-white/5">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xs sm:text-sm text-white font-black uppercase italic tracking-widest flex items-center gap-2">
                            <BarChart className="text-primary h-3 w-3 sm:h-4 sm:w-4" /> Placar Oficial
                        </CardTitle>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <Badge variant="outline" className="text-[7px] sm:text-[8px] h-3.5 sm:h-4 border-white/10 uppercase bg-black/20 font-bold">BO{channel.bestOf}</Badge>
                            {officialScoreboard && (
                              <Badge className="bg-green-600/10 text-green-500 border-green-500/20 text-[7px] sm:text-[8px] h-3.5 sm:h-4 uppercase font-black italic">Sincronizado</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 p-3 sm:p-6">
                {(channel.tournamentName || channel.prizeLabel) && (
                    <div className="p-2 sm:p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1 sm:space-y-1.5 shadow-inner">
                        {channel.tournamentName && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase italic text-primary truncate">
                                <Trophy size={10} className="sm:size-3" /> {channel.tournamentName}
                                {channel.phase && <span className="text-white/40 font-bold">• {channel.phase}</span>}
                            </div>
                        )}
                        {channel.prizeLabel && (
                            <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black text-green-500 uppercase italic">
                                <Award size={9} className="sm:size-2.5" /> Bolsa: {channel.prizeLabel}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between p-2 sm:p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner group">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                            <Image src={`https://picsum.photos/seed/${channel.playerA.name}/48/48`} alt="" fill className="rounded-full border-2 border-primary/20 shadow-md object-cover" />
                        </div>
                        <div className="min-w-0">
                            <span className="font-black text-xs sm:text-sm uppercase italic truncate block text-white group-hover:text-primary transition-colors">{channel.playerA.name}</span>
                            <p className="text-[7px] sm:text-[9px] text-white/40 uppercase font-bold">Nível {channel.playerA.level}/10</p>
                        </div>
                    </div>
                    <span className={cn(
                      "text-2xl sm:text-4xl font-black italic tracking-tighter text-primary tabular-nums transition-all duration-300 ml-2", 
                      scoreAUpdated && "scale-150 brightness-150 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                    )}>
                      {scoreA}
                    </span>
                </div>

                <div className="flex items-center justify-center -my-1 sm:-my-2 relative z-10">
                    <div className="bg-slate-900 border border-white/10 px-2 sm:px-3 py-0.5 rounded-full text-[7px] sm:text-[9px] font-black uppercase italic tracking-[2px] sm:tracking-[3px] text-muted-foreground shadow-2xl">VS</div>
                </div>

                <div className="flex items-center justify-between p-2 sm:p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner group">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                            <Image src={`https://picsum.photos/seed/${channel.playerB.name}/48/48`} alt="" fill className="rounded-full border-2 border-primary/20 shadow-md object-cover" />
                        </div>
                        <div className="min-w-0">
                            <span className="font-black text-xs sm:text-sm uppercase italic truncate block text-white group-hover:text-primary transition-colors">{channel.playerB.name}</span>
                            <p className="text-[7px] sm:text-[9px] text-white/40 uppercase font-bold">Nível {channel.playerB.level}/10</p>
                        </div>
                    </div>
                    <span className={cn(
                      "text-2xl sm:text-4xl font-black italic tracking-tighter text-primary tabular-nums transition-all duration-300 ml-2", 
                      scoreBUpdated && "scale-150 brightness-150 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                    )}>
                      {scoreB}
                    </span>
                </div>

                <div className="text-center pt-1 sm:pt-2 space-y-0.5">
                    <p className="text-[8px] sm:text-[10px] text-primary font-black uppercase italic tracking-widest animate-pulse">
                        {officialScoreboard?.statusText || (channel.status === 'live' ? 'EM DISPUTA' : 'AGUARDANDO INÍCIO')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
