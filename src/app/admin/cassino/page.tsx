'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Activity, Cog, Gamepad2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminCassinoDashboardPage() {
  const router = useRouter();

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Dashboard do Cassino</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jogos Ativos</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Fortune Tiger</p>
          </CardContent>
           <CardFooter>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/cassino/jogos')}>
                  Gerenciar Jogos
              </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acessos Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from yesterday (placeholder)</p>
          </CardContent>
          <CardFooter>
               <p className="text-xs text-muted-foreground">Dados de exemplo</p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Ajuste as opções gerais do módulo de cassino.</p>
          </CardContent>
           <CardFooter>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/cassino/configuracoes')}>
                  Acessar Configurações
              </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
