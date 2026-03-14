'use client';
import { Card } from "@/components/ui/card";
import { Eye, Volume2, VolumeX, Maximize, Timer, AlertCircle, ShieldAlert } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { isValidYoutubeVideoId, buildYoutubeEmbedUrl } from "@/utils/youtube";

interface LivePlayerProps {
    channelId: string;
}

const ElapsedTime = ({ startedAt }: { startedAt: string | undefined }) => {
    const [elapsed, setElapsed] = useState<number | null>(null);

    useEffect(() => {
        if (!startedAt) {
            setElapsed(null);
            return;
        }

        const tick = () => {
            const start = new Date(startedAt).getTime();
            setElapsed(Math.max(0, Math.floor((Date.now() - start) / 60000)));
        };

        tick();
        const interval = setInterval(tick, 30000);
        return () => clearInterval(interval);
    }, [startedAt]);

    if (elapsed === null || elapsed === 0) return null;

    return (
        <div className="viewer-count border-primary/20">
            <Timer className="h-3 w-3 text-primary" />
            <span className="font-mono text-[10px] font-bold text-primary">{elapsed}'</span>
        </div>
    );
}

export const LivePlayer = ({ channelId }: LivePlayerProps) => {
    const { snookerChannels, snookerPresence, snookerLiveConfig } = useAppContext();
    const [isMuted, setIsMuted] = useState(true);

    const channel = useMemo(() => 
        snookerChannels.find(c => c.id === channelId), 
    [snookerChannels, channelId]);

    const viewerCount = useMemo(() => 
        snookerPresence[channelId]?.viewers.length || channel?.viewerCount || 0,
    [snookerPresence, channelId, channel?.viewerCount]);

    const isVideoValid = useMemo(() => 
        isValidYoutubeVideoId(channel?.embedId), 
    [channel?.embedId]);

    if (!channel) return null;

    const showBadge = snookerLiveConfig?.showLiveBadge && channel.status === 'live';

    return (
        <Card className="casino-card-glow relative overflow-hidden bg-black rounded-2xl group shadow-2xl">
            {/* Overlays */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                {showBadge && isVideoValid && (
                    <div className="live-badge live-badge-pulsing shadow-xl shadow-red-600/20">
                        <span className="live-pulse"></span>
                        AO VIVO
                    </div>
                )}
                {channel.status === 'live' && <ElapsedTime startedAt={channel.startedAt} />}
                <div className="viewer-count">
                    <Eye className="h-3 w-3 text-white/70" />
                    <span className="text-[10px] font-bold">{viewerCount.toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {isVideoValid && (
                    <>
                        <button onClick={() => setIsMuted(!isMuted)} className="player-control-btn h-9 w-9 bg-black/60 border border-white/10 rounded-xl hover:bg-black/80">
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <button onClick={() => {
                            const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
                            if (iframe?.requestFullscreen) iframe.requestFullscreen();
                        }} className="player-control-btn h-9 w-9 bg-black/60 border border-white/10 rounded-xl hover:bg-black/80">
                            <Maximize size={18} />
                        </button>
                    </>
                )}
            </div>
            
            <div className="aspect-video bg-[#020617] relative">
                {isVideoValid ? (
                    <iframe
                        id="youtube-player"
                        className="w-full h-full"
                        src={`${buildYoutubeEmbedUrl(channel.embedId)}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playsinline=1&playlist=${channel.embedId}&modestbranding=1`}
                        title={channel.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen>
                    </iframe>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
                        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                            <AlertCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-black uppercase italic tracking-tighter text-lg">Vídeo não disponível</p>
                            <p className="text-white/40 text-[10px] font-bold uppercase max-w-[250px] leading-relaxed">
                                O link de transmissão deste evento é inválido ou ainda não foi liberado pelo YouTube.
                            </p>
                            {channel.sourceVideoId && (
                                <div className="mt-4 p-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2 justify-center">
                                    <ShieldAlert size={12} className="text-amber-500" />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase">ID Técnico: {channel.sourceVideoId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* CHANNEL BRANDING FOOTER */}
            <div className="bg-black/40 border-t border-white/5 py-2 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-1 h-1 rounded-full", isVideoValid ? "bg-red-500" : "bg-slate-600")} />
                    <span className="text-[8px] font-black uppercase tracking-[3px] text-white/30 italic">
                        {channel.source === 'youtube' ? (channel.sourceName || 'YouTube Network') : 'Transmissão Privada'}
                    </span>
                </div>
                {!isVideoValid && (
                    <Badge variant="outline" className="text-[7px] border-red-500/20 text-red-500 bg-red-500/5 h-4 px-1.5 font-black">ERRO DE SINAL</Badge>
                )}
            </div>
        </Card>
    );
}

const Badge = ({ children, variant, className }: any) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center justify-center whitespace-nowrap",
    variant === 'outline' ? "border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/50" : "bg-primary text-primary-foreground border-transparent",
    className
  )}>
    {children}
  </span>
);
