'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Ticket, DollarSign, Percent, Play, Settings, BarChart, PlusCircle, Bot, Lock, Unlock } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo, useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function AdminBingoDashboardPage() {
  const router = useRouter();
  const { bingoSettings, bingoDraws, bingoTickets } = useAppContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const nextDraw = useMemo(() => {
    const draws = bingoDraws || [];
    return [...draws]
      .filter(d => d.status === 'scheduled' || d.status === 'waiting' || d.status === 'live')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  }, [bingoDraws]);
  
  const rtpStatus = useMemo(() => {
    if (!nextDraw || !bingoSettings) return null;
    const totalPrizes = (nextDraw.prizeRules.quadra || 0) + (nextDraw.prizeRules.kina || 0) + (nextDraw.prizeRules.keno || 0);
    const minRevenue = totalPrizes / (1 - ((bingoSettings.rtpPercent || 20) / 100));
    const currentRevenue = nextDraw.totalRevenue || 0;
    const isReleased = currentRevenue >= minRevenue;
    const progress = Math.min(100, (currentRevenue / (minRevenue || 1)) * 100);
    return { isReleased, minRevenue, currentRevenue, progress, totalPrizes };
  }, [nextDraw, bingoSettings]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const tickets = bingoTickets || [];
    const draws = bingoDraws || [];
    const todayTickets = tickets.filter(t => t.createdAt?.startsWith(today));
    const todayDraws = draws.filter(d => d.finishedAt?.startsWith(today));
    const totalRevenue = todayTickets.reduce((acc, t) => acc + (t.amountPaid || 0), 0);
    const totalPayout = todayDraws.reduce((acc, d) => acc + (d.payoutTotal || 0), 0);
    const houseShare = todayDraws.reduce((acc, d) => acc + ((d.totalRevenue || 0) * ((d.housePercent || 10) / 100)), 0);
    return { tickets: todayTickets.length, revenue: totalRevenue, payout: totalPayout, profit: houseShare };
  }, [bingoTickets, bingoDraws]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Dashboard do Bingo</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Receita (Hoje)" value={`R$ ${todayStats.revenue.toFixed(2).replace('.', ',')}`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} description={`${todayStats.tickets} cartelas vendidas`} />
          <StatCard title="Prêmios Pagos (Hoje)" value={`R$ ${todayStats.payout.toFixed(2).replace('.', ',')}`} icon={<Ticket className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Comissão da Banca (Hoje)" value={`R$ ${todayStats.profit.toFixed(2).replace('.', ',')}`} icon={<Percent className="h-4 w-4 text-muted-foreground" />} />
           <Card>
              <CardHeader>
                  <CardTitle className="text-sm font-medium">Status do Bingo</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className={`text-2xl font-bold ${bingoSettings?.enabled ? 'text-green-500' : 'text-red-500'}`}>
                      {bingoSettings?.enabled ? 'Ativado' : 'Desativado'}
                  </div>
              </CardContent>
           </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Sorteio Atual / Próximo</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {nextDraw ? (
                          <div className="space-y-4">
                              <div>
                                  <p><strong>Sorteio N°:</strong> {nextDraw.drawNumber}</p>
                                  <p><strong>Agendado para:</strong> {new Date(nextDraw.scheduledAt).toLocaleString('pt-BR')}</p>
                                  <p><strong>Status:</strong> <Badge variant={nextDraw.status === 'live' ? 'destructive' : 'secondary'}>{nextDraw.status.toUpperCase()}</Badge></p>
                              </div>
                              
                              {bingoSettings?.rtpEnabled && rtpStatus && (
                                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                                      <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                              <Bot className="h-5 w-5 text-primary" />
                                              <span className="font-bold">Controle de RTP (Bot Ativo)</span>
                                          </div>
                                          {rtpStatus.isReleased ? (
                                              <Badge className="bg-green-600"><Unlock className="h-3 w-3 mr-1" /> LIBERADO</Badge>
                                          ) : (
                                              <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" /> BLOQUEADO (BOT)</Badge>
                                          )}
                                      </div>
                                      <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                              <span>Arrecadado: R$ {rtpStatus.currentRevenue.toFixed(2)}</span>
                                              <span>Meta: R$ {rtpStatus.minRevenue.toFixed(2)}</span>
                                          </div>
                                          <Progress value={rtpStatus.progress} className="h-2" />
                                      </div>
                                  </div>
                              )}
                          </div>
                      ): (
                          <p className="text-muted-foreground italic">Nenhum sorteio ativo ou agendado no momento.</p>
                      )}
                  </CardContent>
                  <CardFooter className="gap-2">
                      <Button onClick={() => router.push('/admin/bingo/sorteios/novo')}>
                          <PlusCircle className="mr-2 h-4 w-4"/>
                          Criar Novo Sorteio
                      </Button>
                      {nextDraw && (
                          <Button variant="outline" onClick={() => router.push(`/admin/bingo/sorteios/${nextDraw.id}`)}>
                              Gerenciar Sorteio
                          </Button>
                      )}
                  </CardFooter>
              </Card>
          </div>

           <Card>
              <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>Gerenciamento do módulo.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20" onClick={() => router.push('/bingo')}><Play className="mr-2"/>Abrir Jogo</Button>
                  <Button variant="outline" className="h-20" onClick={() => router.push('/admin/bingo/sorteios')}><Ticket className="mr-2"/>Sorteios</Button>
                  <Button variant="outline" className="h-20" onClick={() => router.push('/admin/bingo/configuracoes')}><Settings className="mr-2"/>Configurações</Button>
                  <Button variant="outline" className="h-20" onClick={() => router.push('/admin/bingo/relatorios')}><BarChart className="mr-2"/>Relatórios</Button>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
