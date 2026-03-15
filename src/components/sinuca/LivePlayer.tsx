/**
 * @fileOverview Player de Vídeo para Sinuca ao Vivo blindado.
 * Reforçado com validação rigorosa de embedId para evitar erros de "vídeo indisponível".
 */

'use client';
import { Card } from "@/components/ui/card";
import { Eye, Volume2, VolumeX, Maximize, MonitorOff, ShieldAlert, AlertTriangle } from "lucide-react";
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

    // VALIDAÇÃO CRÍTICA: Verifica se o ID é real antes de tentar carregar o iframe
    const isVideoReady = useMemo(() => 
        isValidYoutubeVideoId(channel?.embedId), 
    [channel?.embedId]);

    if (!channel) return null;

    const showBadge = snookerLiveConfig?.showLiveBadge && channel.status === 'live';

    return (
        <Card className="casino-card-glow relative overflow-hidden bg-black rounded-2xl group shadow-2xl">
            {/* Overlays de Informação */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                {showBadge && isVideoReady && (
                    <div className="live-badge live-badge-pulsing shadow-xl shadow-red-600/20">
                        <span className="live-pulse"></span>
                        AO VIVO
                    </div>
                )}
                <div className="viewer-count">
                    <Eye className="h-3 w-3 text-white/70" />
                    <span className="text-[10px] font-bold">{viewerCount.toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {isVideoReady && (
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
                {isVideoReady ? (
                    <iframe
                        id="youtube-player"
                        className="w-full h-full"
                        src={`${buildYoutubeEmbedUrl(channel.embedId!)}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playsinline=1&playlist=${channel.embedId}&modestbranding=1`}
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
                            <p className="text-white font-black uppercase italic tracking-tighter text-lg">Transmissão Indisponível</p>
                            <p className="text-white/40 text-[10px] font-bold uppercase max-w-[300px] leading-relaxed">
                                O identificador de vídeo informado é inválido ou a incorporação foi desativada pelo autor.
                            </p>
                            <div className="mt-4 p-3 bg-red-600/10 rounded-xl border border-red-600/20 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <AlertTriangle size={14} />
                                    <span className="text-[10px] font-black uppercase">Diagnóstico Admin</span>
                                </div>
                                <span className="text-[9px] font-mono text-slate-400 break-all">ID: {channel.embedId || 'NÃO DETECTADO'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-black/40 border-t border-white/5 py-2 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-1 h-1 rounded-full", isVideoReady ? "bg-red-500" : "bg-slate-600")} />
                    <span className="text-[8px] font-black uppercase tracking-[3px] text-white/30 italic">
                        {channel.sourceName || 'Fonte Manual'}
                    </span>
                </div>
                {channel.source === 'youtube' && (
                    <span className="bg-primary/10 text-primary border border-primary/20 text-[7px] font-black h-4 px-1.5 rounded-full flex items-center">
                        REALTIME SYNC
                    </span>
                )}
            </div>
        </Card>
    );
}
