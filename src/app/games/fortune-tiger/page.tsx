'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function FortuneTigerGamePage() {
  const router = useRouter();

  return (
    <div className="bg-black min-h-screen p-4 flex flex-col items-center gap-4">
        <div className="w-full max-w-5xl flex justify-start">
            <Button variant="outline" onClick={() => router.push('/cassino')}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>
        </div>
        <div className="w-full max-w-5xl" style={{ height: 'calc(100vh - 100px)' }}>
            <iframe
                src="/games/fortune-tiger/index.html"
                className="w-full h-full"
                style={{
                    border: '0',
                    borderRadius: '16px',
                }}
                allow="autoplay; fullscreen"
                loading="lazy"
                title="Fortune Tiger Game"
            ></iframe>
        </div>
    </div>
  );
}
