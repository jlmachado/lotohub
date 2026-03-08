'use client';

import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Aposta, useAppContext } from '@/context/AppContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

export default function FinanceiroPage() {
    const { apostas, depositos, saques } = useAppContext();

    const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'Concluído':
                return 'default';
            case 'Pendente':
                return 'secondary';
            case 'Recusado':
                return 'destructive';
            default:
                return 'outline';
        }
    }

    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [resumo, setResumo] = useState<{
        totalApostado: number;
        premiosPagos: number;
        comissao: number;
        fechamento: number;
    } | null>(null);

    const [isCaixaDialogOpen, setIsCaixaDialogOpen] = useState(false);
    const [caixaStep, setCaixaStep] = useState<'password' | 'action'>('password');
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [caixaAction, setCaixaAction] = useState<'pagar' | 'retirar'>('pagar');
    const { toast } = useToast();

    const COMISSION_PERCENTAGE = 0.10; // 10%

    const parseDate = (dateString: string): Date => {
        // Handles formats like "26/07/2024, 10:30:00" or "26/07/2024 10:30:00"
        const cleanedDateString = dateString.replace(',', '');
        const [datePart, timePart] = cleanedDateString.split(' ');
        if (!datePart) return new Date('invalid');
        const [day, month, year] = datePart.split('/');
        if (!year || !month || !day) return new Date('invalid');
        return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
    };

    const parseValor = (valorString: string): number => {
        if (!valorString) return 0;
        return parseFloat(valorString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    };
    
    const calcularPremio = (bilhete: Aposta) => {
        if (bilhete.status !== 'premiado') {
            return 0;
        }

        if (Array.isArray(bilhete.detalhes) && bilhete.detalhes.length > 0) {
           return bilhete.detalhes.reduce((acc: number, item: any) => acc + (item.retornoPossivel || 0), 0);
        }
        
        const valorAposta = parseValor(bilhete.valor);
        return valorAposta * 10;
    };


    const handleCalcularResumo = () => {
        const startDate = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const endDate = dataFim ? new Date(dataFim + 'T23:59:59') : null;

        const apostasFiltradas = apostas.filter(aposta => {
            const apostaDate = parseDate(aposta.data);
            if (apostaDate.toString() === 'Invalid Date') return false;
            if (startDate && apostaDate < startDate) return false;
            if (endDate && apostaDate > endDate) return false;
            return true;
        });

        const totalApostado = apostasFiltradas.reduce((acc, aposta) => acc + parseValor(aposta.valor), 0);
        const premiosPagos = apostasFiltradas.reduce((acc, aposta) => acc + calcularPremio(aposta), 0);
        const comissao = totalApostado * COMISSION_PERCENTAGE;
        const fechamento = totalApostado - premiosPagos - comissao;
        
        setResumo({
            totalApostado,
            premiosPagos,
            comissao,
            fechamento,
        });
    };

    const handleVerifyPassword = () => {
        if (passwordInput === '1234') {
            setCaixaStep('action');
            setPasswordError(false);
            setPasswordInput('');
        } else {
            setPasswordError(true);
        }
    };

    const handleConfirmCaixa = () => {
        if(!resumo) return;
        toast({
            title: "Ação de Caixa Confirmada",
            description: `Ação "${caixaAction === 'pagar' ? 'Pagar' : 'Retirar'}" para o valor de R$ ${resumo.fechamento.toFixed(2)} foi registrada.`,
        });
        resetCaixaDialog();
    };

    const resetCaixaDialog = () => {
        setIsCaixaDialogOpen(false);
        // A small delay to allow the dialog to close before resetting its internal state
        setTimeout(() => {
            setCaixaStep('password');
            setPasswordInput('');
            setPasswordError(false);
        }, 300);
    };


    return (
        <div>
            <Header />
            <main className="p-4 md:p-8">
                <h1 className="text-3xl font-bold mb-6">Histórico Financeiro</h1>
                <Tabs defaultValue="depositos" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="depositos">Depósitos</TabsTrigger>
                        <TabsTrigger value="saques">Saques</TabsTrigger>
                    </TabsList>
                    <TabsContent value="depositos">
                        <Card>
                            <CardHeader>
                                <CardTitle>Depósitos Realizados</CardTitle>
                                <CardDescription>Seu histórico de recargas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data e Hora</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {depositos.length > 0 ? (
                                            depositos.map((deposito, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{deposito.data}</TableCell>
                                                    <TableCell className="font-medium">{deposito.valor}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={getStatusBadgeVariant(deposito.status)}>{deposito.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum depósito realizado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="saques">
                        <Card>
                             <CardHeader>
                                <CardTitle>Saques Solicitados</CardTitle>
                                <CardDescription>Seu histórico de solicitações de saque.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data e Hora</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {saques.length > 0 ? (
                                            saques.map((saque, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{saque.data}</TableCell>
                                                    <TableCell className="font-medium">{saque.valor}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={getStatusBadgeVariant(saque.status)}>{saque.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                             <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum saque solicitado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Resumo Financeiro por Período</CardTitle>
                        <CardDescription>Filtre por data para calcular o fechamento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4 items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="data-inicio">Data de Início</Label>
                                <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="data-fim">Data de Fim</Label>
                                <Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                            </div>
                            <Button onClick={handleCalcularResumo}>Buscar</Button>
                        </div>
                        {resumo !== null && (
                            <>
                                <Separator className="my-6" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                                        <p className="text-sm text-muted-foreground">Total Apostado</p>
                                        <p className="text-2xl font-bold">R$ {resumo.totalApostado.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50">
                                        <p className="text-sm text-red-600 dark:text-red-400">Prêmios Pagos</p>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">R$ {resumo.premiosPagos.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                        <p className="text-sm text-blue-600 dark:text-blue-400">Minha Comissão (10%)</p>
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">R$ {resumo.comissao.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/50">
                                        <p className="text-sm text-green-600 dark:text-green-400">Fechamento</p>
                                        <p className={`text-2xl font-bold ${resumo.fechamento >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>R$ {resumo.fechamento.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                                <div className="mt-6 text-right">
                                    <Dialog open={isCaixaDialogOpen} onOpenChange={(open) => {
                                        setIsCaixaDialogOpen(open);
                                        if (!open) {
                                            resetCaixaDialog();
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button>Fechar Caixa</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            {caixaStep === 'password' ? (
                                                <>
                                                    <DialogHeader>
                                                        <DialogTitle>Senha de Segurança</DialogTitle>
                                                        <DialogDescription>
                                                            Digite a senha para continuar com o fechamento do caixa.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="password" className="text-right">
                                                                Senha
                                                            </Label>
                                                            <Input
                                                                id="password"
                                                                type="password"
                                                                value={passwordInput}
                                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                                className="col-span-3"
                                                            />
                                                        </div>
                                                        {passwordError && (
                                                            <p className="col-span-4 text-center text-sm text-destructive">Senha incorreta. Tente novamente.</p>
                                                        )}
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleVerifyPassword}>Verificar</Button>
                                                    </DialogFooter>
                                                </>
                                            ) : (
                                                <>
                                                    <DialogHeader>
                                                        <DialogTitle>Ação de Caixa</DialogTitle>
                                                        <DialogDescription>
                                                            O fechamento é de <span className={`font-bold ${resumo.fechamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {resumo.fechamento.toFixed(2).replace('.', ',')}</span>. Escolha a ação a ser realizada.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <RadioGroup value={caixaAction} onValueChange={(value: 'pagar' | 'retirar') => setCaixaAction(value)} className="m-auto grid grid-cols-2 gap-4">
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="pagar" id="pagar" />
                                                                <Label htmlFor="pagar">Pagar</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="retirar" id="retirar" />
                                                                <Label htmlFor="retirar">Retirar</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleConfirmCaixa}>Confirmar Ação</Button>
                                                    </DialogFooter>
                                                </>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
    
