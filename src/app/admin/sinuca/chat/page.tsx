'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerChatMessage } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminSinucaChatPage() {
    const { snookerChannels, snookerChatMessages, deleteSnookerChatMessage } = useAppContext();
    const { toast } = useToast();
    
    const [channelFilter, setChannelFilter] = useState<string>('');

    const filteredMessages = useMemo(() => {
        if (!channelFilter) return [];
        return snookerChatMessages
            .filter(msg => msg.channelId === channelFilter)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [snookerChatMessages, channelFilter]);

    const handleDelete = (messageId: string) => {
        deleteSnookerChatMessage(messageId);
        toast({
            title: 'Mensagem Removida',
            description: 'A mensagem foi marcada como excluída e não será mais visível para os usuários.',
        });
    };
    
    return (
        <main className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-3xl font-bold">Moderação de Chat</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mensagens em Tempo Real</CardTitle>
                    <CardDescription>Filtre por canal para ver e moderar as mensagens do chat.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-full md:w-[240px]">
                                <SelectValue placeholder="Filtrar por canal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {snookerChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Mensagem</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMessages.map(msg => (
                                <TableRow key={msg.id} className={msg.deleted ? 'opacity-50' : ''}>
                                    <TableCell>{msg.userName}</TableCell>
                                    <TableCell className="text-muted-foreground">{msg.text}</TableCell>
                                    <TableCell>{new Date(msg.createdAt).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(msg.id)} disabled={msg.deleted}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        <Button variant="ghost" size="icon" disabled><Ban className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {filteredMessages.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            {channelFilter ? 'Nenhuma mensagem neste canal.' : 'Selecione um canal para ver as mensagens.'}
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
