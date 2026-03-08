'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';

export default function CassinoPage() {
    const router = useRouter();
    const { casinoSettings } = useAppContext();

    if (!casinoSettings?.casinoStatus) {
        return (
             <div>
                <Header />
                <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                     <Card className="w-full max-w-4xl shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-center">Cassino Indisponível</CardTitle>
                            <CardDescription className="text-center">O cassino está temporariamente desativado. Tente novamente mais tarde.</CardDescription>
                        </CardHeader>
                    </Card>
                </main>
            </div>
        )
    }


    return (
        <div>
            <Header />
            <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                <Card className="w-full max-w-4xl shadow-2xl overflow-hidden">
                    <div className="relative h-64 w-full">
                        <Image
                            src="/img/cassino.png"
                            alt="Banner do Cassino"
                            layout="fill"
                            objectFit="cover"
                            className="object-center"
                        />
                         <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center">
                             <h1 className="text-5xl font-extrabold text-white" style={{textShadow: '0 0 15px rgba(255, 215, 0, 0.7)'}}>{casinoSettings?.casinoName || 'CASSINO'}</h1>
                             <p className="mt-2 text-lg text-amber-200">{casinoSettings?.bannerMessage || 'Sua sorte está a um clique de distância!'}</p>
                         </div>
                    </div>
                    <CardContent className="p-6 text-center">
                        <CardTitle className="text-2xl mb-2">Bem-vindo ao nosso Cassino!</CardTitle>
                        <CardDescription className="mb-6 max-w-2xl mx-auto">
                            Prepare-se para uma experiência de jogo imersiva e emocionante. O Fortune Tiger e muitos outros jogos esperam por você. Clique abaixo para começar a jogar e testar sua sorte!
                        </CardDescription>
                        <Button 
                            size="lg" 
                            className="lux-gold lux-shine h-14 px-12 text-xl font-bold"
                            onClick={() => router.push('/games/fortune-tiger/')}
                        >
                            JOGAR FORTUNE TIGER
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
