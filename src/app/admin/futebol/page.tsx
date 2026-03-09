'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  RefreshCw, 
  ChevronLeft, 
  Trophy, 
  Activity, 
  Users, 
  TrendingUp,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

export default function AdminFutebolDashboardPage() {
  const router = useRouter();
  const { 
    footballApiConfig, 
    footballChampionships, 
    footballTeams, 
    footballMatches 
  } = useAppContext();

  const stats = [
    { title: 'Ligas Ativas', value: footballChampionships.filter(c => c.importar).length, icon: Trophy, color: 'text-primary' },
    { title: 'Times Totais', value: footballTeams.length, icon: Users, color: 'text-blue-400' },
    { title: 'Jogos do Dia', value: footballMatches.length, icon: Activity, color: 'text-green-400' },
    { title: 'Odds Sync', value: '85%', icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft /></Button></Link>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Dashboard Futebol</h1>
        </div>
        <Button onClick={() => router.push('/admin/futebol/configuracoes')} className="lux-shine">
          <Settings className="mr-2 h-4 w-4" /> Configurações API
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-slate-900/50 border-white/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Status da Integração */}
        <Card className="lg:col-span-4 border-white/5 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic">Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span className="font-bold">API-FOOTBALL</span>
                </div>
                {footballApiConfig.status === 'connected' ? (
                  <Badge className="bg-green-600">ATIVO</Badge>
                ) : (
                  <Badge variant="destructive">ERRO</Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Última Sincronização</p>
                <p className="text-sm font-bold">{footballApiConfig.lastSync ? new Date(footballApiConfig.lastSync).toLocaleString('pt-BR') : 'Pendente'}</p>
              </div>

              {footballApiConfig.lastError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-[10px] text-red-400 font-bold">{footballApiConfig.lastError}</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full h-11 border-white/10 font-bold" onClick={() => router.push('/admin/futebol/configuracoes')}>
              Ver Logs Detalhados
            </Button>
          </CardContent>
        </Card>

        {/* Resumo de Cobertura */}
        <Card className="lg:col-span-8 border-white/5 bg-card/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black uppercase italic">Ligas Ativas</CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary">Ver Todas</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {footballChampionships.filter(c => c.importar).slice(0, 5).map(champ => (
                <div key={champ.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Image src={champ.logo} alt="" width={32} height={32} />
                    <div>
                      <p className="font-bold text-white">{champ.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{champ.country}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {champ.coverage?.standings && <Badge variant="outline" className="text-[8px] border-green-500/20 text-green-500">TABELA</Badge>}
                    {champ.coverage?.odds && <Badge variant="outline" className="text-[8px] border-blue-500/20 text-blue-500">ODDS</Badge>}
                  </div>
                </div>
              ))}
              {footballChampionships.filter(c => c.importar).length === 0 && (
                <div className="p-12 text-center text-muted-foreground italic">Nenhuma liga importada para esta banca.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const Badge = ({ children, variant, className }: any) => (
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center justify-center whitespace-nowrap ${variant === 'outline' ? 'border-white/20 text-white/50' : 'bg-primary text-primary-foreground'} ${className}`}>
    {children}
  </span>
);
