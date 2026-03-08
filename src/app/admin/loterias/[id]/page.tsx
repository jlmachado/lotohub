'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { useAppContext, GenericLotteryConfig } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function GerenciarLoteriaPage() {
    const params = useParams();
    const { genericLotteryConfigs, updateGenericLottery } = useAppContext();
    const { toast } = useToast();
    const id = params.id as string;

    const [config, setConfig] = useState<GenericLotteryConfig | null>(null);

    useEffect(() => {
        const found = genericLotteryConfigs.find(c => c.id === id);
        if (found) {
            setConfig(JSON.parse(JSON.stringify(found))); // Deep clone for editing
        }
    }, [id, genericLotteryConfigs]);

    const handleSave = () => {
        if (config) {
            updateGenericLottery(config);
            toast({ title: "Configurações Salvas", description: `A loteria ${config.nome} foi atualizada com sucesso.` });
        }
    };

    const updateMultiplier = (index: number, value: string) => {
        if (!config) return;
        const newMults = [...config.multiplicadores];
        newMults[index].multiplicador = value;
        setConfig({ ...config, multiplicadores: newMults });
    };

    const updateSchedule = (index: number, field: 'dia' | 'horas', value: string) => {
        if (!config) return;
        const newSched = [...config.horarios];
        newSched[index][field] = value;
        setConfig({ ...config, horarios: newSched });
    };

    if (!config) {
        return <main className="p-8 text-center text-muted-foreground">Carregando configurações...</main>;
    }

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/loterias">
                        <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">{config.nome}</h1>
                        <Badge variant="outline" className="mt-1">ID: {config.id}</Badge>
                    </div>
                </div>
                <Button onClick={handleSave} className="lux-shine"><Save className="mr-2 h-4 w-4" /> Salvar Alterações</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Status do Módulo</CardTitle>
                        <CardDescription>Ative ou desative esta loteria para os usuários.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span className="text-sm font-medium">Disponibilidade</span>
                            <select 
                                className="bg-background border rounded px-2 py-1 text-sm"
                                value={config.status}
                                onChange={(e) => setConfig({...config, status: e.target.value as any})}
                            >
                                <option value="Ativa">Ativa</option>
                                <option value="Inativa">Inativa</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Horários de Extração</CardTitle>
                            <CardDescription>Defina quando ocorrem os sorteios desta loteria.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dia / Período</TableHead>
                                        <TableHead>Horário(s)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {config.horarios.map((h, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Input value={h.dia} onChange={(e) => updateSchedule(index, 'dia', e.target.value)} className="h-8 text-xs" /></TableCell>
                                            <TableCell><Input value={h.horas} onChange={(e) => updateSchedule(index, 'horas', e.target.value)} className="h-8 text-xs font-mono" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tabela de Multiplicadores (Odds)</CardTitle>
                            <CardDescription>Cotações para cálculo de premiação por modalidade.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Modalidade</TableHead>
                                        <TableHead className="text-right">Cotação (Ex: 5000x)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {config.multiplicadores.map((m, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium text-xs">{m.modalidade}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    value={m.multiplicador} 
                                                    onChange={(e) => updateMultiplier(index, e.target.value)}
                                                    className="h-8 w-24 ml-auto text-right font-bold text-primary"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}