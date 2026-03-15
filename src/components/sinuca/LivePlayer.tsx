/**
 * @fileOverview Player de Vídeo para Sinuca ao Vivo blindado.
 * Corrigido para validar o embedId antes de renderizar o iframe.
 */

'use client';
import { Card } from "@/components/ui/card";
import { Eye, Volume2, VolumeX, Maximize, MonitorOff } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { isValidYoutubeVideoId, buildYoutubeEmbedUrl } from "@/utils/youtube";

interface LivePlayerProps {
    channelId: string;
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

    // Validação definitiva do ID do vídeo (11 caracteres)
    const isVideoValid = useMemo(() => 
        channel?.embedId && isValidYoutubeVideoId(channel.embedId), 
    [channel?.embedId]);

    if (!channel) return null;

    const showBadge = snookerLiveConfig?.showLiveBadge && (channel.status === 'live' || channel.status === 'imminent');

    return (
        <Card className="casino-card-glow relative overflow-hidden bg-black rounded-2xl group shadow-2xl">
            {/* Overlays */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                {showBadge && isVideoValid && (
                    <div className="live-badge live-badge-pulsing shadow-xl shadow-red-600/20">
                        <span className="live-pulse"></span>
                        {channel.status === 'live' ? 'AO VIVO' : 'IMINENTE'}
                    </div>
                )}
                <div className="viewer-count">
                    <Eye className="h-3 w-3 text-white/70" />
                    <span className="text-[10px] font-bold">{viewerCount.toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isVideoValid && (
                    <>
                        <button onClick={() => setIsMuted(!isMuted)} className="player-control-btn h-9 w-9 bg-black/60 border border-white/10 rounded-xl">
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <button onClick={() => {
                            const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
                            if (iframe?.requestFullscreen) iframe.requestFullscreen();
                        }} className="player-control-btn h-9 w-9 bg-black/60 border border-white/10 rounded-xl">
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
                        src={`${buildYoutubeEmbedUrl(channel.embedId!)}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&loop=1&playsinline=1&playlist=${channel.embedId}&modestbranding=1`}
                        title={channel.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen>
                    </iframe>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
                        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                            <MonitorOff className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-black uppercase italic text-lg">Transmissão Indisponível</p>
                            <p className="text-white/40 text-[10px] font-bold uppercase max-w-[300px]">
                                O ID da transmissão não pôde ser validado ou o vídeo foi removido.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-black/40 border-t border-white/5 py-2 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-1 h-1 rounded-full", isVideoValid ? "bg-red-500" : "bg-slate-600")} />
                    <span className="text-[8px] font-black uppercase tracking-[3px] text-white/30 italic">
                        {channel.sourceName || 'Fonte Manual'}
                    </span>
                </div>
                {channel.source === 'youtube' && (
                    <span className="bg-primary/10 text-primary border border-primary/20 text-[7px] font-black h-4 px-1.5 rounded-full">
                        SYNC OK
                    </span>
                )}
            </div>
        </Card>
    );
}
