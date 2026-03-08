'use client';

import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useEffect, useState, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';

export default function ApostasPage() {
  const { apostas, snookerBets } = useAppContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const allBets = useMemo(() => {
    const combined = [
      ...apostas.map(a => ({
        ...a,
        source: 'lottery' as const,
        displayData: a.data,
        displayValor: a.valor,
        displayNumeros: a.numeros,
        displayStatus: a.status
      })),
      ...snookerBets.map(b => ({
        id: b.id,
        createdAt: b.createdAt,
        loteria: 'Sinuca ao Vivo',
        displayData: '', // Será formatado no cliente
        displayValor: `R$ ${b.amount.toFixed(2).replace('.', ',')}`,
        displayNumeros: `Aposta em ${b.pick}`,
        displayStatus: b.status,
        source: 'snooker' as const,
        detalhes: [{ ...b, modalidadeLabel: `Aposta no Vencedor: ${b.pick}`, numeros: [b.pick], valor: b.amount, retornoPossivel: b.amount * ({ A: b.oddsA, B: b.oddsB, EMPATE: b.oddsD }[b.pick]) }]
      }))
    ];

    return combined.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [apostas, snookerBets]);

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Minhas Apostas</h1>
        <div className="grid gap-6">
          {!isClient ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allBets.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Você ainda não fez nenhuma aposta.</p>
          ) : (
            allBets.map((aposta) => (
              <Card key={aposta.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-6 w-6 text-primary" />
                        {aposta.loteria}
                      </CardTitle>
                      <CardDescription>
                        Pule: {aposta.id.substring(0, 8)}... - Data: {new Date(aposta.createdAt).toLocaleString('pt-BR')}
                      </CardDescription>
                    </div>
                    <Badge variant={aposta.displayStatus === 'premiado' || aposta.displayStatus === 'won' ? 'default' : aposta.displayStatus === 'perdeu' || aposta.displayStatus === 'lost' ? 'destructive' : aposta.displayStatus === 'cash_out' ? 'outline' : 'secondary'}>
                      {aposta.displayStatus.charAt(0).toUpperCase() + aposta.displayStatus.slice(1).replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {aposta.loteria === 'Futebol' && aposta.detalhes?.selections ? (
                    <div className="space-y-3 mt-2">
                      {aposta.detalhes.selections.map((item: any, index: number) => (
                        <div key={index} className="text-sm p-3 border rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">{item.match.homeTeamName} vs {item.match.awayTeamName}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p>Sua aposta: <span className="font-semibold">{item.pickLabel}</span></p>
                            <p className="font-mono text-primary">@{item.odd.toFixed(2)}</p>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p>Valor: <span className="font-semibold">R$ {item.value.toFixed(2).replace('.', ',')}</span></p>
                            <p className="font-semibold text-green-600">Retorno: R$ {(item.value * item.odd).toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(aposta.detalhes) && aposta.detalhes.length > 0 ? (
                    <div className="space-y-3 mt-2">
                      {aposta.detalhes.map((item: any, index: number) => {
                        const displayNumbers = Array.isArray(item.numeros) ? item.numeros.join(', ') : (item.numeros || item.numero);
                        const valorAposta = typeof item.valor === 'string' ? parseFloat(item.valor.replace(',', '.')) : item.valor;
                        const retornoPossivel = item.retornoPossivel || 0;

                        return (
                          <div key={item.id || index} className="p-3 border rounded-lg bg-muted/50 text-sm space-y-1">
                            <p className="font-bold">
                              {item.modalidadeLabel}
                              {item.colocacaoLabel ? ` - ${item.colocacaoLabel}` : item.premio ? ` - Até ${item.premio}º Prêmio` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.loteriaLabel ? `Loteria: ${item.loteriaLabel} - ` : ''}
                              {item.horario ? `${item.horario} ` : ''}
                              {item.dataAposta ? `(Aposta para ${item.dataAposta})` : ''}
                            </p>
                            <p>
                              Sua Aposta:{' '}
                              <span className="font-mono">{displayNumbers}</span>
                            </p>
                            <p>
                              Valor: R$ {(valorAposta || 0).toFixed(2).replace('.', ',')}
                            </p>
                            {aposta.displayStatus === 'cash_out' && item.cashOutAmount && (
                              <p className="font-semibold text-blue-500">
                                Valor de Cash Out: R$ {item.cashOutAmount.toFixed(2).replace('.', ',')}
                              </p>
                            )}
                            {(aposta.displayStatus === 'open' || aposta.displayStatus === 'aguardando') && retornoPossivel > 0 &&
                              <p className="font-semibold text-green-600">
                                Retorno Possível: R$ {retornoPossivel.toFixed(2).replace('.', ',')}
                              </p>
                            }
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Resumo da aposta:</p>
                      <p className="text-lg font-mono tracking-widest">{aposta.displayNumeros}</p>
                    </>
                  )}
                  <Separator className="my-4" />
                  <p className="text-right font-bold mt-4">Valor Total: {aposta.displayValor}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
