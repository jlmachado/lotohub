'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, LiveMiniPlayerConfig } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

const getYoutubeEmbedId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export default function AdminMiniPlayerPage() {
  const { liveMiniPlayerConfig, updateLiveMiniPlayerConfig } = useAppContext();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<LiveMiniPlayerConfig | null>(null);

  useEffect(() => {
    if (liveMiniPlayerConfig) {
      setConfig(liveMiniPlayerConfig);
    }
  }, [liveMiniPlayerConfig]);

  const handleInputChange = useCallback((field: keyof LiveMiniPlayerConfig, value: any) => {
    setConfig(prev => {
      if (!prev) return null;
      const newConfig = { ...prev, [field]: value };
      if (field === 'youtubeUrl') {
        newConfig.youtubeEmbedId = getYoutubeEmbedId(value) || '';
      }
      return newConfig;
    });
  }, []);

  const handleSave = () => {
    if (config) {
      updateLiveMiniPlayerConfig(config);
      toast({
        title: 'Configurações Salvas',
        description: 'As configurações do Mini Player Global foram atualizadas.',
      });
    }
  };

  if (!config) {
    return <div>Carregando...</div>;
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/imagens"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Configurar Mini Player Global</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Opções do Player</CardTitle>
          <CardDescription>Ajuste o comportamento e a aparência do player de vídeo flutuante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base">Player Ativado</Label>
              <p className="text-sm text-muted-foreground">Habilita ou desabilita o mini player em todo o site.</p>
            </div>
            <Switch id="enabled" checked={config.enabled} onCheckedChange={(v) => handleInputChange('enabled', v)} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="youtubeUrl">URL do Vídeo do YouTube</Label>
              <Input id="youtubeUrl" value={config.youtubeUrl} onChange={(e) => handleInputChange('youtubeUrl', e.target.value)} />
              {config.youtubeEmbedId && <p className='text-xs text-muted-foreground'>ID do Vídeo: {config.youtubeEmbedId}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Título do Vídeo</Label>
              <Input id="title" value={config.title} onChange={(e) => handleInputChange('title', e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Comportamento</h3>
            <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch id="autoShow" checked={config.autoShow} onCheckedChange={(v) => handleInputChange('autoShow', v)} />
                <Label htmlFor="autoShow">Mostrar Automaticamente</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultState">Estado Inicial</Label>
                <Select value={config.defaultState} onValueChange={(v) => handleInputChange('defaultState', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto (Topo)</SelectItem>
                    <SelectItem value="minimized">Minimizado (Bolha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Visibilidade</h3>
            <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch id="showOnHome" checked={config.showOnHome} onCheckedChange={(v) => handleInputChange('showOnHome', v)} />
                <Label htmlFor="showOnHome">Mostrar na Página Inicial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="showOnSinuca" checked={config.showOnSinuca} onCheckedChange={(v) => handleInputChange('showOnSinuca', v)} />
                <Label htmlFor="showOnSinuca">Mostrar na Sinuca ao Vivo</Label>
              </div>
            </div>
          </div>
           <div>
            <h3 className="text-lg font-medium mb-4">Tamanho (em pixels)</h3>
            <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg">
              <div className="grid gap-2">
                  <Label htmlFor="topHeight">Altura do Player no Topo</Label>
                  <Input id="topHeight" type="number" value={config.topHeight} onChange={(e) => handleInputChange('topHeight', parseInt(e.target.value) || 96)} />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="bubbleSize">Tamanho da Bolha</Label>
                  <Input id="bubbleSize" type="number" value={config.bubbleSize} onChange={(e) => handleInputChange('bubbleSize', parseInt(e.target.value) || 62)} />
              </div>
            </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
