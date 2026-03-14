
'use client';
import { useAppContext, SnookerChannel } from "@/context/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { Calendar, Video, Clock, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelSelectorProps {
    activeChannelId: string;
    onChannelChange: (channelId: string) => void;
}

const CountdownTimer = ({ scheduledAt }: { scheduledAt: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const scheduled = new Date(scheduledAt).getTime();
            const distance = scheduled - now;

            if (distance < 0) {
                setTimeLeft('Iniciado');
                clearInterval(interval);
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
            else setTimeLeft(`${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [scheduledAt]);

    return <span className="font-mono text-primary">{timeLeft}</span>;
};

const getStatusVariant = (status: SnookerChannel['status']) => {
    switch(status) {
        case 'live': return 'destructive';
        case 'imminent': return 'default';
        case 'scheduled': return 'secondary';
        case 'finished': return 'outline';
        default: return 'outline';
    }
};

export const ChannelSelector = ({ activeChannelId, onChannelChange }: ChannelSelectorProps) => {
    const { snookerChannels, snookerPrimaryChannelId } = useAppContext();

    const availableChannels = useMemo(() => {
        // Sort by priorityScore (highest first)
        return (snookerChannels || [])
            .filter(c => c.enabled && !c.isArchived)
            .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    }, [snookerChannels]);

    const activeChannel = useMemo(() => 
        availableChannels.find(c => c.id === activeChannelId), 
    [availableChannels, activeChannelId]);

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 text-white/60 font-black uppercase italic text-[10px] tracking-widest shrink-0">
                <Video size={14} className="text-primary" />
                Selecione a Transmissão
            </div>
             <Select value={activeChannelId} onValueChange={onChannelChange}>
                <SelectTrigger className="w-full md:min-w-[400px] h-12 bg-black/40 border-white/10 text-white rounded-xl shadow-xl hover:border-primary/30 transition-all">
                    <SelectValue>
                        {activeChannel ? (
                            <div className="flex items-center justify-between gap-4 w-full pr-4">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="font-bold text-sm italic uppercase truncate">
                                        {activeChannel.playerA.name} <span className="text-primary/50">vs</span> {activeChannel.playerB.name}
                                    </span>
                                    {activeChannel.id === snookerPrimaryChannelId && (
                                        <Star size={12} className="text-primary fill-primary shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={getStatusVariant(activeChannel.status)} className="h-5 text-[8px] uppercase font-black italic">
                                        {activeChannel.status}
                                    </Badge>
                                </div>
                            </div>
                        ) : "Escolha um jogo..."}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {availableChannels.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">Nenhum jogo disponível no momento.</div>
                    ) : (
                        availableChannels.map(channel => (
                            <SelectItem key={channel.id} value={channel.id} className="hover:bg-white/5 cursor-pointer p-3 border-b border-white/5 last:border-0">
                                <div className="flex flex-col gap-1 w-full min-w-[300px]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="font-black text-sm uppercase italic">
                                              {channel.playerA.name} <span className="text-primary/50">vs</span> {channel.playerB.name}
                                          </span>
                                          {channel.id === snookerPrimaryChannelId && (
                                            <Badge className="bg-primary text-black text-[7px] font-black h-3.5 px-1 uppercase italic">Principal</Badge>
                                          )}
                                          {channel.metadataConfidence && channel.metadataConfidence > 0.8 && (
                                            <ShieldCheck size={10} className="text-green-500" title="Alta Confiança" />
                                          )}
                                        </div>
                                        <Badge variant={getStatusVariant(channel.status)} className="h-4 text-[7px] uppercase font-black">
                                            {channel.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={10} />
                                            {new Date(channel.scheduledAt).toLocaleDateString('pt-BR')} • {new Date(channel.scheduledAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {channel.prizeLabel && (
                                              <span className="text-green-500 font-black italic">{channel.prizeLabel}</span>
                                            )}
                                            {channel.status === 'imminent' && (
                                                <div className="flex items-center gap-1 text-primary">
                                                    <Clock size={10} />
                                                    <CountdownTimer scheduledAt={channel.scheduledAt} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
