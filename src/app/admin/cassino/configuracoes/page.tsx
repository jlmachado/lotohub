'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Save, Layout, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { useEffect, useState } from 'react';

export default function AdminCassinoConfigPage() {
    const { toast } = useToast();
    const { casinoSettings, updateCasinoSettings, isLoading } = useAppContext();

    // Local state for form fields
    const [casinoName, setCasinoName] = useState('');
    const [casinoStatus, setCasinoStatus] = useState(true);
    const [bannerMessage, setBannerMessage] = useState('');

    // Populate form when settings from context are loaded
    useEffect(() => {
        if (casinoSettings) {
            setCasinoName(casinoSettings.casinoName || 'LotoHub Casino');
            setCasinoStatus(casinoSettings.casinoStatus !== undefined ? casinoSettings.casinoStatus : true);
            setBannerMessage(casinoSettings.bannerMessage || 'Sua sorte está a um clique de distância!');
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
            description: "O lobby do cassino foi atualizado com sucesso.",
        });
    }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando painel...</div>;

  return (
    <main className="p-4 md:p-8 space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/cassino"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
            <div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Configurações do Lobby</h1>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Controle visual e status do cassino</p>
            </div>
          </div>
          <Button onClick={handleSave} className="lux-shine font-black uppercase italic"><Save className="mr-2 h-4 w-4" /> Salvar Tudo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-white/10 bg-card/50">
            <form onSubmit={handleSave}>
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                        <Layout size={16} className="text-primary" /> Opções Gerais
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold">Ajuste as informações que os usuários veem no cassino.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid gap-2">
                        <Label htmlFor="casino-name" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome do Cassino</Label>
                        <Input id="casino-name" value={casinoName} onChange={(e) => setCasinoName(e.target.value)} className="bg-black/20 border-white/10 h-12 text-lg font-bold" />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                        <div className="space-y-0.5">
                             <Label htmlFor="casino-status" className="text-sm font-bold text-white uppercase italic">Módulo Ativo</Label>
                             <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                Habilita ou desabilita o acesso total ao cassino no site.
                             </p>
                        </div>
                         <Switch id="casino-status" checked={casinoStatus} onCheckedChange={setCasinoStatus} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="banner-message" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Mensagem de Boas-vindas (Banner)</Label>
                        <Input id="banner-message" value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} className="bg-black/20 border-white/10 h-12" />
                    </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-6 bg-slate-950/50">
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-medium">
                        Dica: O nome do cassino é exibido com destaque no topo do lobby. Use frases curtas e impactantes para o banner.
                    </p>
                </CardFooter>
            </form>
        </Card>

        <Card className="border-primary/20 bg-primary/5 h-fit">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" /> Status do Sistema
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                    <p className="text-[9px] uppercase font-black text-muted-foreground mb-1">Status Atual</p>
                    <span className={cn(
                        "text-xl font-black uppercase italic",
                        casinoStatus ? "text-green-500" : "text-red-500"
                    )}>
                        {casinoStatus ? "Online" : "Offline"}
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-bold text-center">
                    Alterações de status afetam todos os usuários imediatamente.
                </p>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}