'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { useEffect, useState } from 'react';

export default function AdminCassinoConfigPage() {
    const { toast } = useToast();
    const { casinoSettings, updateCasinoSettings } = useAppContext();

    // Local state for form fields
    const [casinoName, setCasinoName] = useState('');
    const [casinoStatus, setCasinoStatus] = useState(true);
    const [bannerMessage, setBannerMessage] = useState('');

    // Populate form when settings from context are loaded
    useEffect(() => {
        if (casinoSettings) {
            setCasinoName(casinoSettings.casinoName);
            setCasinoStatus(casinoSettings.casinoStatus);
            setBannerMessage(casinoSettings.bannerMessage);
        }
    }, [casinoSettings]);

    const handleSave = (event: React.FormEvent) => {
        event.preventDefault();
        updateCasinoSettings({
            casinoName,
            casinoStatus,
            bannerMessage,
        });
        toast({
            title: "Configurações Salvas!",
            description: "Suas alterações foram salvas com sucesso.",
        });
    }

  return (
    <main className="p-4 md:p-8">
       <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/cassino"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Configurações do Cassino</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
          <form onSubmit={handleSave}>
              <CardHeader>
                  <CardTitle>Opções Gerais</CardTitle>
                  <CardDescription>Ajuste as configurações principais do módulo de Cassino.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid gap-2">
                      <Label htmlFor="casino-name">Nome do Cassino</Label>
                      <Input id="casino-name" value={casinoName} onChange={(e) => setCasinoName(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                           <Label htmlFor="casino-status" className="text-base">Status do Cassino</Label>
                           <p className="text-sm text-muted-foreground">
                              Ative ou desative o acesso dos usuários ao cassino.
                           </p>
                      </div>
                       <Switch id="casino-status" checked={casinoStatus} onCheckedChange={setCasinoStatus} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="banner-message">Mensagem do Banner Principal</Label>
                      <Input id="banner-message" value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} />
                  </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit">Salvar Alterações</Button>
              </CardFooter>
          </form>
      </Card>
    </main>
  );
}
