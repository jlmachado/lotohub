'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";
import { Send } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useEffect, useState } from "react";

interface LiveChatProps {
    channelId: string;
}

export const LiveChat = ({ channelId }: LiveChatProps) => {
    const { snookerChatMessages, sendSnookerChatMessage } = useAppContext();
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = useMemo(() =>
        snookerChatMessages.filter(m => m.channelId === channelId && !m.deleted),
        [snookerChatMessages, channelId]
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            sendSnookerChatMessage(channelId, message.trim());
            setMessage("");
        }
    };

    return (
        <Card className="casino-card flex flex-col h-[400px] lg:h-full">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg text-white">Chat ao Vivo</CardTitle>
                <div className="flex items-center gap-2 text-sm text-green-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3">
                         <Image src={`https://picsum.photos/seed/${msg.userId}/32/32`} width={32} height={32} alt={msg.userName} className="rounded-full border-2 border-white/20"/>
                        <div>
                           <p className="text-sm font-semibold">
                                {msg.userName}
                                {msg.role === 'admin' && <span className="ml-2 admin-badge">MOD</span>}
                            </p>
                            <p className="text-white/80">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </CardContent>
             <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 mt-auto">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Digite sua mensagem..." 
                        className="casino-input" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button type="submit" className="casino-gold-button">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </Card>
    );
};
