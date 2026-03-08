'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";

interface ReactionsPanelProps {
    channelId: string;
}

export const ReactionsPanel = ({ channelId }: ReactionsPanelProps) => {
    const { snookerLiveConfig, sendSnookerReaction } = useAppContext();

    const reactions = ["🔥", "🎱", "👏", "💚"];

    if (!snookerLiveConfig?.reactionsEnabled) {
        return null;
    }
    
    return (
        <Card className="casino-card">
            <CardHeader>
                <CardTitle className="text-lg text-white">Reações ao Vivo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2">
                 {reactions.map(reaction => (
                    <Button 
                        key={reaction}
                        variant="outline"
                        className="flex-col h-16 border-white/20 text-3xl"
                        onClick={() => sendSnookerReaction(channelId, reaction)}
                    >
                        {reaction}
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
};
