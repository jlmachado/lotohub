'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PawPrint, Ticket, Clover, Gem, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Aposta, useAppContext, PostedResult } from '@/context/AppContext';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { checkApostaWinner, ResultadoBicho } from '@/lib/draw-engine';
import { isModuleEnabled } from '@/utils/bancaContext';

const loteriasBaseConfig: Record<string, { icon: any; numResultados: number; valorLength: number; module: string }> = {
    'jogo-do-bicho': { icon: PawPrint, numResultados: 7, valorLength: 4, module: 'jogoDoBicho' },
    'loteria-uruguai': { icon: Ticket, numResultados: 20, valorLength: 3, module: 'loteriaUruguai' },
    'seninha': { icon: Clover, numResultados: 6, valorLength: 2, module: 'seninha' },
    'quininha': { icon: Gem, numResultados: 5, valorLength: 2, module: 'quininha' },
    'lotinha': { icon: Ticket, numResultados: 15, valorLength: 2, module: 'lotinha' },
};

const getGrupoInfo = (milhar: string): { grupo: string; animal: string } | null => {
    if (milhar.length < 2) return null;
    const dezenaStr = milhar.slice(-2);
    const grupoNum = dezenaStr === '00' ? 25 : Math.ceil(parseInt(dezenaStr, 10) / 4);
    const animais = ["Avestruz", "Águia", "Burro", "Borboleta", "Cachorro", "Cabra", "Carneiro", "Camelo", "Cobra", "Coelho", "Cavalo", "Elefante", "Galo", "Gato", "Jacaré", "Leão", "Macaco", "Porco", "Pavão", "Peru", "Touro", "Tigre", "Urso", "Veado", "Vaca"];
    return { grupo: grupoNum.toString().padStart(2, '0'), animal: animais[grupoNum - 1] || 'Vaca' };
};

export default function AdminLoteriasPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { apostas, processarResultados, postedResults, jdbLoterias, genericLotteryConfigs } = useAppContext();
    
    const [loteria, setLoteria] = useState<string>('');
    const [jogoDoBichoLoteria, setJogoDoBichoLoteria] = useState<string>('');
    const [horario, setHorario] = useState<string>('');
    const [data, setData] = useState<string>(new Date().toISOString().split('T')[0]);
    const [resultados, setResultados] = useState<any[]>([]);
    const [isConferenciaOpen, setIsConferenciaOpen] = useState(false);
    const [conferenciaResultados, setConferenciaResultados] = useState<any>(null);

    const availableLoterias = useMemo(() => {
        const configs = [...genericLotteryConfigs.map(c => ({ id: c.id, nome: c.nome })), { id: 'jogo-do-bicho', nome: 'Jogo do Bicho' }];
        return configs.filter(c => isModuleEnabled(loteriasBaseConfig[c.id]?.module as any));
    }, [genericLotteryConfigs]);

    const config = loteriasBaseConfig[loteria];

    useEffect(() => {
        if (config) setResultados(Array.from({ length: config.numResultados }, (_, i) => ({ premio: `${i + 1}º`, valor: '' })));
        else setResultados([]);
    }, [config]);

    const handlePostarResultados = () => {
        if (!loteria || !horario || !data) return toast({ variant: 'destructive', title: "Incompleto" });
        let drawResults = loteria === 'jogo-do-bicho' 
            ? resultados.map(r => ({ ...r, ...getGrupoInfo(r.valor) }))
            : resultados.map(r => r.valor);

        processarResultados({ loteria, jogoDoBichoLoteria, horario, data, resultados: drawResults });
        toast({ title: "Resultados Lançados!" });
    };

    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft /></Button></Link>
                <h1 className="text-3xl font-bold uppercase italic tracking-tighter">Gerenciar Loterias</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {availableLoterias.map(l => (
                    <Card key={l.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push(l.id === 'jogo-do-bicho' ? '/admin/loterias/jogo-do-bicho' : `/admin/loterias/${l.id}`)}>
                        <CardHeader className="p-4 text-center">
                            <CardTitle className="text-xs font-black uppercase">{l.nome}</CardTitle>
                            <Badge variant="secondary" className="mt-2 text-[8px]">CONFIGURAR</Badge>
                        </CardHeader>
                    </Card>
                ))}
            </div>
            
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader><CardTitle className="text-lg font-black uppercase italic">Lançar Resultados Oficiais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold">Loteria</Label>
                            <Select value={loteria} onValueChange={setLoteria}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>{availableLoterias.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold">Data</Label>
                            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold">Horário</Label>
                            <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
                        </div>
                    </div>

                    {loteria && (
                        <div className="pt-4 border-t border-primary/10">
                            <Table>
                                <TableBody>
                                    {resultados.map((res, i) => (
                                        <TableRow key={i} className="border-0">
                                            <TableCell className="w-20 font-bold">{res.premio}</TableCell>
                                            <TableCell><Input value={res.valor} onChange={e => {
                                                const nr = [...resultados]; 
                                                nr[i].valor = e.target.value.replace(/\D/g, '').substring(0, config.valorLength);
                                                setResultados(nr);
                                            }} className="font-mono text-center h-8" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Button onClick={handlePostarResultados} className="w-full mt-6 h-12 text-lg font-black uppercase italic lux-shine">Publicar Resultados</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}