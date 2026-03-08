
'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Search, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function PremiadosPage() {
  const [pule, setPule] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleConsultar = () => {
    if (pule.trim().length < 5) {
      setError(true);
      return;
    }
    router.push(`/poule/${pule.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center">
        <Card className="w-full max-w-md shadow-2xl border-white/10 bg-card/50 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Consultar Bilhete</CardTitle>
            <CardDescription className="font-medium">
              Verifique a validade e o status do seu bilhete informando a POULE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pule" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">Código da Poule</Label>
                <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="pule" 
                        placeholder="Ex: PL202403..." 
                        value={pule} 
                        onChange={(e) => { setPule(e.target.value.toUpperCase()); setError(false); }}
                        className="h-14 pl-10 text-lg font-mono font-bold bg-black/20 border-white/10 focus:border-primary/50 transition-all uppercase"
                        onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
                    />
                </div>
                {error && (
                    <div className="flex items-center gap-2 text-destructive font-bold text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        Informe um código válido.
                    </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
                className="w-full h-14 text-lg font-black uppercase italic lux-shine rounded-xl" 
                onClick={handleConsultar} 
                disabled={!pule || pule.length < 5}
            >
              Verificar Bilhete
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-md">
            <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-[10px] font-black uppercase text-center text-muted-foreground">Aguardando</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-[10px] font-black uppercase text-center text-muted-foreground">Premiada</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-[10px] font-black uppercase text-center text-muted-foreground">Não Ganhou</span>
            </div>
        </div>
      </main>
    </div>
  );
}
