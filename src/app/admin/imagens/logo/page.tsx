'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Upload, Trash2, Save, Image as ImageIcon, X } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getBranding, saveBranding } from '@/utils/branding';

export default function AdminLogoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const branding = getBranding();
    if (branding.logoDataUrl) {
      setPreviewUrl(branding.logoDataUrl);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 1024 * 1024) { // Limite de 1MB
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 1MB para armazenamento otimizado.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      setIsSaving(true);
      try {
        saveBranding({ logoDataUrl: previewUrl });
        toast({
          title: 'Logo salva com sucesso!',
          description: 'A identidade visual foi atualizada em todo o sistema.',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: 'A imagem pode ser muito complexa para o armazenamento local.',
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRemove = () => {
    saveBranding({ logoDataUrl: null });
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast({
      title: 'Logo personalizada removida',
      description: 'O sistema voltou a exibir a logo padrão.',
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/imagens"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl md:text-3xl font-bold">Identidade Visual</h1>
        </div>

        <Card className="max-w-xl mx-auto shadow-xl">
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-xl">Logo Principal</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Selecione a imagem que será exibida no topo de todas as páginas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 md:p-8 bg-muted/10 transition-colors hover:bg-muted/20 min-h-[180px]">
              {previewUrl ? (
                <div className="relative group mb-4 flex items-center justify-center w-full">
                  <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border">
                    <img 
                      src={previewUrl} 
                      alt="Preview Logo" 
                      className="max-h-[100px] md:max-h-[120px] w-auto object-contain block mx-auto"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold shadow-md">
                    PREVIEW
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <ImageIcon size={24} />
                  </div>
                  <p className="text-xs">Nenhuma logo personalizada</p>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleFileChange}
              />
              
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {previewUrl ? 'Alterar Imagem' : 'Selecionar Imagem'}
              </Button>
              
              <p className="text-[9px] md:text-[10px] text-muted-foreground mt-4 uppercase tracking-widest font-medium text-center">Recomendado: PNG Transparente (Alt. 60px)</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3 justify-center border-t p-4 md:p-6 bg-muted/5">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/admin/imagens')}
              className="h-[44px] px-5 rounded-[10px] text-xs md:text-sm"
            >
              Cancelar
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleRemove} 
              disabled={!previewUrl} 
              className="h-[44px] px-5 rounded-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive text-xs md:text-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={!previewUrl || isSaving} 
              className="h-[44px] px-8 rounded-[10px] font-bold text-xs md:text-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}