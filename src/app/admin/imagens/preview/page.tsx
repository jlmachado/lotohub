'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Smartphone, RefreshCw } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { PopupDialog } from '@/components/popup-dialog';
import { useAppContext } from '@/context/AppContext';

const MobileFrame = ({ children }: { children: React.ReactNode }) => (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
        <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-background">
            {children}
        </div>
    </div>
);

const BannerPreview = () => {
    const { banners } = useAppContext();
    const validBanners = banners
        .filter(b => b.active)
        .sort((a, b) => a.position - b.position);

    return (
        <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
                {validBanners.map(banner => (
                    <CarouselItem key={banner.id}>
                        <Card className="overflow-hidden m-2">
                             <CardContent className="relative flex aspect-[3/1] items-center justify-center p-0">
                                <Image
                                src={banner.imageUrl}
                                alt={banner.title}
                                fill
                                sizes="100vw"
                                className="object-cover"
                                />
                            </CardContent>
                        </Card>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}

const PopupPreview = () => {
    const { popups } = useAppContext();
    const [popupKey, setPopupKey] = useState(Date.now()); // Used to force re-render

    const validPopups = popups
        .filter(p => p.active)
        .sort((a, b) => b.priority - a.priority);
    
    const activePopup = validPopups.length > 0 ? validPopups[0] : null;

    return (
        <div className="p-4">
            <p className='text-center text-sm text-muted-foreground mb-4'>Simulando a exibição do Pop-up de maior prioridade.</p>
             <Button className="w-full" onClick={() => setPopupKey(Date.now())}>Forçar Reabertura do Pop-up</Button>
            <PopupDialog
                key={popupKey}
                isOpen={!!activePopup}
                onOpenChange={() => {}}
                popup={activePopup}
            />
        </div>
    )
}


export default function AdminPreviewPage() {
    const [previewMode, setPreviewMode] = useState<'banners' | 'popups' | 'both'>('both');
    const [previewKey, setPreviewKey] = useState(Date.now());

    return (
    <div>
      <Header />
      <main className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/imagens"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Preview Mobile</h1>
        </div>

        <Card>
            <CardHeader className="flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Simulador de Celular</CardTitle>
                    <CardDescription>Veja como os banners e pop-ups aparecem na tela inicial.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                     <Select value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder="Selecione o modo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">Banners e Pop-up</SelectItem>
                            <SelectItem value="banners">Apenas Banners</SelectItem>
                            <SelectItem value="popups">Apenas Pop-up</SelectItem>
                        </SelectContent>
                    </Select>
                     <Button variant="outline" onClick={() => setPreviewKey(Date.now())}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Atualizar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-8 bg-muted/20">
                <MobileFrame>
                    <div key={previewKey} className="relative h-full w-full overflow-y-auto">
                        <div className="absolute top-0 left-0 p-4 w-full z-10">
                            {(previewMode === 'both' || previewMode === 'banners') && <BannerPreview />}
                        </div>
                        {(previewMode === 'both' || previewMode === 'popups') && <PopupPreview />}
                    </div>
                </MobileFrame>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
