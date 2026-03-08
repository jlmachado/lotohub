'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Cog, Gamepad2, ChevronLeft, List, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


export default function AdminFutebolDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { footballMatches, footballChampionships, footballTeams, footballApiConfig, syncFootballData } = useAppContext();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncFootballData();
    setIsSyncing(false);
    toast({
        title: "Sincronização Concluída",
        description: "Os dados da API foram importados para o sistema."
    });
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Dashboard de Futebol</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Jogos Importados" value={footballMatches.length} icon={Gamepad2} />
          <StatCard title="Campeonatos Ativos" value={footballChampionships.length} icon={List} />
          <StatCard title="Times Cadastrados" value={footballTeams.length} icon={List} />
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status da API</CardTitle>
                   <Cog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-green-500">Conectada</div>
                  <p className="text-xs text-muted-foreground">{footballApiConfig?.provider} ({footballApiConfig?.mode})</p>
              </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Configure a integração com a API e as margens de lucro padrão.</CardDescription>
          </CardHeader>
           <CardFooter>
              <Button variant="outline" onClick={() => router.push('/admin/futebol/configuracoes')}>
                  Acessar Configurações
              </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jogos Importados</CardTitle>
            <CardDescription>Visualize, ative ou desative os jogos que vêm da API.</CardDescription>
          </CardHeader>
           <CardFooter className="flex-col items-start gap-2">
              <Button variant="outline" onClick={() => router.push('/admin/futebol/jogos')}>
                  Gerenciar Jogos
              </Button>
               <Button onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar com API'}
              </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
