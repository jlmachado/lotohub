'use client';
import { Card } from "@/components/ui/card";
import { Eye, Volume2, VolumeX, Maximize, Timer } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface LivePlayerProps {
    channelId: string;
}

// Helper to extract YouTube video ID from various URL formats
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

        // Calculate initial elapsed time
        const start = new Date(startedAt).getTime();
        setElapsed(Math.floor((Date.now() - start) / (1000 * 60)));

        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(startedAt).getTime();
            setElapsed(Math.floor((now - start) / (1000 * 60)));
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    if (elapsed === null || elapsed < 0) {
        return null;
    }

    return (
        <div className="viewer-count">
            <Timer className="h-4 w-4" />
            <span>{elapsed}'</span>
        </div>
    );
}


export const LivePlayer = ({ channelId }: LivePlayerProps) => {
    const { snookerChannels, snookerPresence } = useAppContext();
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
             <Card className="casino-card-glow relative overflow-hidden aspect-video flex items-center justify-center">
                <p className="text-white/70">Canal não encontrado.</p>
             </Card>
        )
    }

    return (
        <Card className="casino-card-glow relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
                {channel.status === 'live' && (
                    <div className={cn("live-badge", channel.status === 'live' && "live-badge-pulsing")}>
                        <span className="live-pulse"></span>
                        AO VIVO
                    </div>
                )}
                {channel.status === 'live' && <ElapsedTime startedAt={channel.startedAt} />}
                <div className="viewer-count">
                    <Eye className="h-4 w-4" />
                    <span>{viewerCount.toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button onClick={() => setIsMuted(!isMuted)} className="player-control-btn">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                 <button onClick={() => {
                    const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
                    if (iframe && iframe.requestFullscreen) {
                        iframe.requestFullscreen();
                    }
                 }} className="player-control-btn">
                    <Maximize className="h-5 w-5" />
                </button>
            </div>
            
            <div className="aspect-video bg-black">
                {embedId ? (
                    <iframe
                        id="youtube-player"
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${embedId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playsinline=1&playlist=${embedId}`}
                        title={channel.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen>
                    </iframe>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-white/70">URL do vídeo inválida ou não configurada.</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
