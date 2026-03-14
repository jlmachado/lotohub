'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Cog, Gamepad2, ChevronLeft, Ticket, BarChart as BarChartIcon, 
  Tv, MessageSquare, DollarSign, Users, TrendingUp, 
  TrendingDown, Play, HandCoins, Zap 
} from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

export default function AdminSinucaDashboardPage() {
  const router = useRouter();
  const { snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerCashOutLog } = useAppContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    
    const onlineUsers = Object.values(snookerPresence || {}).reduce((sum, presence: any) => sum + (presence?.viewers?.length || 0), 0);
    
    const liveGames = (snookerChannels || []).filter(c => c.status === 'live').length;
    
    const todayBets = (snookerBets || []).filter(b => b.createdAt.startsWith(today));
    const totalBetToday = todayBets.reduce((sum, b) => sum + b.amount, 0);
    
    const todayHistory = (snookerFinancialHistory || []).filter(h => h.settledAt.startsWith(today));
    const profitToday = todayHistory.reduce((sum, h) => sum + h.houseProfit, 0);

    const todayCashOuts = (snookerCashOutLog || []).filter(c => c.createdAt.startsWith(today));
    const profitCashOutToday = todayCashOuts.reduce((sum, c) => sum + c.houseProfit, 0);

    const playerStats: Record<string, { totalBet: number; totalWon: number; bets: number; name: string }> = {};
    (snookerBets || []).filter(b => b.status !== 'open').forEach(bet => {
        if (!playerStats[bet.userId]) {
            playerStats[bet.userId] = { totalBet: 0, totalWon: 0, bets: 0, name: bet.userName };
        }
        playerStats[bet.userId].bets++;
        playerStats[bet.userId].totalBet += bet.amount;
        if (bet.status === 'won') {
             const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
             const odds = oddsMap[bet.pick as keyof typeof oddsMap] || 1;
             playerStats[bet.userId].totalWon += bet.amount * odds;
        }
    });

    const topPlayers = Object.entries(playerStats)
        .map(([userId, stats]) => ({
            userId,
            ...stats,
            profit: stats.totalWon - stats.totalBet,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);


    return {
      onlineUsers,
      liveGames,
      totalBetToday,
      profitToday: profitToday + profitCashOutToday,
      topPlayers,
    }
  }, [snookerPresence, snookerChannels, snookerFinancialHistory, snookerBets, snookerCashOutLog]);

  const chartData = useMemo(() => {
    return (snookerFinancialHistory || [])
        .slice(0, 10)
        .map(h => ({
            name: `Rodada ${h.roundNumber || ''}`,
            Arrecadado: h.totalPot,
            Lucro: h.houseProfit,
        })).reverse();
  }, [snookerFinancialHistory]);


  const quickActions = [
    { title: "Gerenciar Transmissão", icon: Tv, href: "/admin/sinuca/ao-vivo" },
    { title: "Gerenciar Jogos", icon: Gamepad2, href: "/admin/sinuca/canais" },
    { title: "Automação YouTube", icon: Zap, href: "/admin/sinuca/automacao" },
    { title: "Controle de Placar", icon: BarChartIcon, href: "/admin/sinuca/placar" },
    { title: "Monitorar Apostas", icon: Ticket, href: "/admin/sinuca/apostas" },
    { title: "Moderar Chat", icon: MessageSquare, href: "/admin/sinuca/chat" },
    { title: "Relatórios Financeiros", icon: DollarSign, href: "/admin/sinuca/financeiro" },
    { title: "Relatório de Cash Outs", icon: HandCoins, href: "/admin/sinuca/cash-out" },
  ]

  if (!mounted) return null;

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Dashboard de Sinuca</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Usuários Online" value={dashboardStats.onlineUsers.toLocaleString('pt-BR')} icon={Users} description="Espectadores em todos os canais" />
          <StatCard title="Jogos ao Vivo" value={dashboardStats.liveGames.toString()} icon={Play} description="Canais com status 'live'" />
          <StatCard title="Total Apostado (Hoje)" value={`R$ ${dashboardStats.totalBetToday.toFixed(2).replace('.', ',')}`} icon={DollarSign} />
          <StatCard title="Lucro da Casa (Hoje)" value={`R$ ${dashboardStats.profitToday.toFixed(2).replace('.', ',')}`} icon={dashboardStats.profitToday >= 0 ? TrendingUp : TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
              <CardHeader>
                  <CardTitle>Volume de Apostas por Rodada</CardTitle>
                  <CardDescription>Últimas 10 rodadas finalizadas.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ChartContainer config={{}} className="h-[250px] w-full">
                      <BarChart data={chartData} accessibilityLayer>
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                          <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                          <Bar dataKey="Arrecadado" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                  </ChartContainer>
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle>Lucro por Rodada</CardTitle>
                  <CardDescription>Últimas 10 rodadas finalizadas.</CardDescription>
              </CardHeader>
              <CardContent>
                   <ChartContainer config={{}} className="h-[250px] w-full">
                      <LineChart data={chartData} accessibilityLayer>
                           <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                           <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                           <Line type="monotone" dataKey="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                  </ChartContainer>
              </CardContent>
          </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle>Top Jogadores (Lucro)</CardTitle>
                  <CardDescription>Ranking dos jogadores mais lucrativos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Jogador</TableHead>
                              <TableHead>Total Apostado</TableHead>
                              <TableHead>Total Ganhos</TableHead>
                              <TableHead className="text-right">Lucro/Prejuízo</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {dashboardStats.topPlayers.map(player => (
                              <TableRow key={player.userId}>
                                  <TableCell className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={`https://picsum.photos/seed/${player.userId}/32/32`} />
                                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {player.name}
                                  </TableCell>
                                  <TableCell>R$ {player.totalBet.toFixed(2).replace('.', ',')}</TableCell>
                                  <TableCell>R$ {player.totalWon.toFixed(2).replace('.', ',')}</TableCell>
                                  <TableCell className="text-right">
                                       <Badge variant={player.profit >= 0 ? 'default' : 'destructive'}>
                                          R$ {player.profit.toFixed(2).replace('.', ',')}
                                       </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                  {dashboardStats.topPlayers.length === 0 && <p className="text-center py-6 text-muted-foreground">Nenhum dado de jogador para exibir.</p>}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {quickActions.map(action => (
                      <Button key={action.title} variant="outline" className="h-20 flex-col gap-1" onClick={() => router.push(action.href)}>
                          <action.icon className="h-5 w-5" />
                          <span className="text-xs text-center">{action.title}</span>
                      </Button>
                  ))}
              </CardContent>
          </Card>
      </div>
    </main>
  );
}
