'use client';
import { useAppContext, SnookerChannel } from "@/context/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";

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
            
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [scheduledAt]);

    return <Badge variant="secondary" className="ml-4 font-mono">{timeLeft}</Badge>;
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
    const { snookerChannels } = useAppContext();

    const availableChannels = useMemo(() => {
        return (snookerChannels || [])
            .filter(c => c.enabled)
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }, [snookerChannels]);

    return (
        <div className="flex items-center gap-4">
            <span className="text-white font-semibold">Jogo:</span>
             <Select value={activeChannelId} onValueChange={onChannelChange}>
                <SelectTrigger className="w-full md:w-[300px] casino-input text-white">
                    <SelectValue placeholder="Selecione um jogo..." />
                </SelectTrigger>
                <SelectContent>
                    {availableChannels.map(channel => (
                        <SelectItem key={channel.id} value={channel.id}>
                            <div className="flex items-center justify-between w-full">
                                <span>{channel.playerA.name} vs {channel.playerB.name}</span>
                                <div className="flex items-center">
                                    <Badge variant={getStatusVariant(channel.status)} className="ml-4">
                                        {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
                                    </Badge>
                                    {channel.status === 'imminent' && <CountdownTimer scheduledAt={channel.scheduledAt} />}
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
