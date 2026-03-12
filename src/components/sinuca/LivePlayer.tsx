'use client';
import { Card } from "@/components/ui/card";
import { Eye, Volume2, VolumeX, Maximize, Timer } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface LivePlayerProps {
    channelId: string;
}

const getYoutubeEmbedId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const ElapsedTime = ({ startedAt }: { startedAt: string | undefined }) => {
    const [elapsed, setElapsed] = useState<number | null>(null);

    useEffect(() => {
        if (!startedAt) {
            setElapsed(null);
            return;
        }

        const start = new Date(startedAt).getTime();
        setElapsed(Math.max(0, Math.floor((Date.now() - start) / (1000 * 60))));

        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(startedAt).getTime();
            setElapsed(Math.max(0, Math.floor((now - start) / (1000 * 60))));
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    if (elapsed === null) return null;

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

    const embedId = useMemo(() => 
        channel?.youtubeUrl ? getYoutubeEmbedId(channel.youtubeUrl) : null, 
    [channel?.youtubeUrl]);

    if (!channel) {
        return (
             <Card className="casino-card relative overflow-hidden aspect-video flex items-center justify-center border-dashed">
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs italic">Selecione um jogo para assistir</p>
             </Card>
        )
    }

    const showBadge = snookerLiveConfig?.showLiveBadge && channel.status === 'live';

    return (
        <Card className="casino-card-glow relative overflow-hidden bg-black rounded-2xl group shadow-2xl">
            {/* Overlays */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                {showBadge && (
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
                <button onClick={() => setIsMuted(!isMuted)} className="player-control-btn h-9 w-9 bg-black/60">
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                 <button onClick={() => {
                    const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
                    if (iframe?.requestFullscreen) iframe.requestFullscreen();
                 }} className="player-control-btn h-9 w-9 bg-black/60">
                    <Maximize size={18} />
                </button>
            </div>
            
            <div className="aspect-video bg-[#020617] relative">
                {embedId ? (
                    <iframe
                        id="youtube-player"
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${embedId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playsinline=1&playlist=${embedId}&modestbranding=1`}
                        title={channel.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen>
                    </iframe>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-white/10 animate-spin border-t-primary" />
                        <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Conectando ao Stream...</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
