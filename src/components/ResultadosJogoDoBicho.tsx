'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

// Interfaces matching the API response structure
interface ResultadoItem {
    pos: number;
    numero: string;
    grupo: string;
    bicho: string;
}

interface Extracao {
    titulo: string;
    itens: ResultadoItem[];
}

interface ApiResponse {
    data: string;
    fonte: string;
    extracoes: Extracao[];
}

const LoadingSkeleton = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
             <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-6 w-1/2 mb-4" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        ))}
    </div>
);


export default function ResultadosJogoDoBicho() {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchResultados() {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/resultados/jogodobicho');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao buscar os resultados.');
                }
                const resultData: ApiResponse = await response.json();
                setData(resultData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchResultados();
    }, []);

    return (
        <Card className="w-full max-w-lg mb-6">
            <CardHeader>
                <CardTitle>Resultados Jogo do Bicho (Hoje)</CardTitle>
                {data && <CardDescription>Fonte: {data.fonte} - Atualizado em: {data.data}</CardDescription>}
            </CardHeader>
            <CardContent>
                {loading && <LoadingSkeleton />}
                {error && (
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Erro ao Carregar</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {data && !loading && !error && (
                    <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
                        {data.extracoes.map((extracao, index) => (
                             <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>{extracao.titulo}</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Prêmio</TableHead>
                                                <TableHead>Milhar</TableHead>
                                                <TableHead>Grupo</TableHead>
                                                <TableHead className="text-right">Bicho</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {extracao.itens.map((item) => (
                                                <TableRow key={item.pos}>
                                                    <TableCell className="font-medium">{item.pos}º</TableCell>
                                                    <TableCell className="font-mono">{item.numero}</TableCell>
                                                    <TableCell className="font-mono">{item.grupo}</TableCell>
                                                    <TableCell className="text-right">{item.bicho}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
