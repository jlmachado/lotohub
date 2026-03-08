'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, MessageSquare, ChevronLeft, Smartphone, PlaySquare, Paintbrush } from 'lucide-react';
import Link from 'next/link';

export default function AdminImagensDashboardPage() {
  const router = useRouter();

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Gerenciamento de Imagens</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Banners do Carrossel</CardTitle>
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Gerencie as imagens que aparecem no carrossel rotativo da página inicial.</p>
          </CardContent>
           <CardFooter>
              <Button onClick={() => router.push('/admin/imagens/banners')}>
                  Gerenciar Banners
              </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Pop-ups Promocionais</CardTitle>
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Crie e gerencie os pop-ups (modais) que são exibidos aos usuários na home.</p>
          </CardContent>
          <CardFooter>
               <Button onClick={() => router.push('/admin/imagens/popups')}>
                  Gerenciar Pop-ups
               </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Mini Player Global</CardTitle>
            <PlaySquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure o mini player de vídeo que aparece em todo o site.</p>
          </CardContent>
          <CardFooter>
               <Button onClick={() => router.push('/admin/imagens/mini-player')}>
                  Configurar Player
               </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Logo do Sistema</CardTitle>
            <Paintbrush className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Altere a imagem da logo exibida no cabeçalho e em todo o sistema.</p>
          </CardContent>
          <CardFooter>
               <Button onClick={() => router.push('/admin/imagens/logo')}>
                  Gerenciar Logo
               </Button>
          </CardFooter>
        </Card>
        
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Preview Mobile</CardTitle>
            <Smartphone className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Visualize como os banners e pop-ups aparecerão em um dispositivo móvel.</p>
          </CardContent>
          <CardFooter>
               <Button onClick={() => router.push('/admin/imagens/preview')}>
                  Ver Preview
               </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
