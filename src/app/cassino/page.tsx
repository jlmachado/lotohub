'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function CassinoPage() {
    const router = useRouter();
    const { casinoSettings, isLoading } = useAppContext();

    if (isLoading) {
        return (
            <div>
                <Header />
                <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                    <Skeleton className="w-full max-w-4xl h-96 rounded-2xl" />
                </main>
            </div>
        );
    }

    // Só exibe indisponível se casinoStatus for explicitamente false
    if (casinoSettings && casinoSettings.casinoStatus === false) {
        return (
             <div>
                <Header />
                <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                     <Card className="w-full max-w-4xl shadow-2xl bg-slate-900 border-white/10">
                        <CardHeader className="py-20">
                            <CardTitle className="text-center text-3xl font-black uppercase italic tracking-tighter text-white">Cassino Temporariamente Indisponível</CardTitle>
                            <CardDescription className="text-center text-slate-400 mt-4 text-lg">Estamos realizando manutenções preventivas em nosso lobby de jogos. Por favor, volte em breve!</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-12">
                            <Button variant="outline" onClick={() => router.push('/')}>Voltar para o Início</Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div>
            <Header />
            <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                <Card className="w-full max-w-4xl shadow-2xl overflow-hidden bg-slate-950 border-white/5">
                    <div className="relative h-64 w-full">
                        <Image
                            src="https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=1080"
                            alt="Banner do Cassino"
                            layout="fill"
                            objectFit="cover"
                            className="object-center opacity-60"
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                             <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'}}>
                                {casinoSettings?.casinoName || 'LotoHub Casino'}
                             </h1>
                             <p className="mt-2 text-lg text-amber-400 font-bold uppercase tracking-widest drop-shadow-md">
                                {casinoSettings?.bannerMessage || 'Sua sorte está a um clique de distância!'}
                             </p>
                         </div>
                    </div>
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase italic text-white">Bem-vindo ao nosso Lobby Premium!</CardTitle>
                            <CardDescription className="max-w-2xl mx-auto text-slate-400 font-medium">
                                Prepare-se para uma experiência de jogo imersiva e emocionante. O Fortune Tiger e muitos outros jogos esperam por você em nossa plataforma de alta fidelidade.
                            </CardDescription>
                        </div>
                        
                        <div className="pt-4">
                            <Button 
                                size="lg" 
                                className="h-16 px-16 text-xl font-black uppercase italic lux-shine bg-primary text-black rounded-xl shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:scale-105 transition-transform"
                                onClick={() => router.push('/games/fortune-tiger/')}
                            >
                                JOGAR AGORA
                            </Button>
                        </div>

                        <div className="flex justify-center gap-8 pt-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                            <img src="https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=100&h=100&fit=crop" className="h-8 w-auto object-contain" alt="provider" />
                            <img src="https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=100&h=100&fit=crop" className="h-8 w-auto object-contain" alt="provider" />
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}