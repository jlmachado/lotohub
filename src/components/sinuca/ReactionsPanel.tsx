'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { SmilePlus, Lock } from "lucide-react";

interface ReactionsPanelProps {
    channelId: string;
}

export const ReactionsPanel = ({ channelId }: ReactionsPanelProps) => {
    const { snookerLiveConfig, sendSnookerReaction, user } = useAppContext();

    const reactions = ["🔥", "🎱", "👏", "💚", "🎯", "😱", "🤩", "🍀"];

    if (!snookerLiveConfig?.reactionsEnabled) {
        return null;
    }
    
    return (
        <Card className="casino-card">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white font-black italic uppercase tracking-tighter flex items-center gap-2">
                    <SmilePlus className="text-primary h-5 w-5" />
                    Reações Rápidas
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!user ? (
                    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground italic py-2 border-2 border-dashed border-white/5 rounded-xl">
                        <Lock size={12} /> Logue para reagir
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2.5">
                        {reactions.map(reaction => (
                            <Button 
                                key={reaction}
                                variant="outline"
                                className="h-12 border-white/10 text-2xl p-0 hover:bg-white/10 active:scale-90 transition-transform"
                                onClick={() => sendSnookerReaction(channelId, reaction)}
                            >
                                {reaction}
                            </Button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
