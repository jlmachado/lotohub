
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

export default function PoulePublicPage() {
  const params = useParams();
  const pouleId = params.poule as string;
  const { apostas } = useAppContext(); // No futuro trocar por busca real no Firestore
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    // Simulação de busca no Firestore com onSnapshot
    // Em um app real, usaríamos o SDK do Firebase aqui
    setLoading(true);
    const found = apostas.find(a => a.id === pouleId);
    
    // Simula delay de rede
    const timer = setTimeout(() => {
      setTicket(found || null);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [pouleId, apostas]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'premiado':
      case 'won':
        return { label: 'PREMIADA', color: 'bg-green-600', icon: <CheckCircle2 className="h-5 w-5" /> };
      case 'perdeu':
      case 'lost':
        return { label: 'NÃO PREMIADA', color: 'bg-red-600', icon: <XCircle className="h-5 w-5" /> };
      default:
        return { label: 'AGUARDANDO', color: 'bg-amber-500', icon: <Clock className="h-5 w-5" /> };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="p-8 flex justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-12 w-12 bg-muted rounded-full"></div>
            <p className="text-muted-foreground font-bold">Verificando Poule...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="p-8 flex justify-center">
          <Card className="w-full max-w-md border-destructive/50">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Poule não encontrada</CardTitle>
              <CardDescription>O identificador informado não existe em nossa base de dados.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  const status = getStatusConfig(ticket.status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-2xl shadow-2xl border-primary/20">
          <CardHeader className="text-center bg-muted/30 pb-8">
            <div className="bg-primary/10 p-3 rounded-2xl inline-block mb-2">
              <Ticket className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Consulta de Bilhete</CardTitle>
            <p className="font-mono text-sm text-muted-foreground">{ticket.id}</p>
          </CardHeader>

          <CardContent className="space-y-6 pt-8">
            <div className={cn("flex items-center justify-center gap-3 p-4 rounded-xl text-white font-black italic uppercase tracking-tighter shadow-lg", status.color)}>
              {status.icon}
              {status.label}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Jogo</p>
                <p className="font-bold">{ticket.loteria}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Data</p>
                <p className="font-bold">{ticket.data.split(',')[0]}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Valor Apostado</p>
                <p className="font-bold">{ticket.valor}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Concurso</p>
                <p className="font-bold">{ticket.concurso}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-dashed">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Palpites Confirmados</p>
              <p className="font-mono text-lg font-bold leading-relaxed">{ticket.numeros}</p>
            </div>

            {ticket.status === 'premiado' && (
              <div className="p-6 rounded-xl bg-green-500/10 border-2 border-green-500 text-center">
                <p className="text-sm font-bold text-green-600 uppercase mb-1">Prêmio Total</p>
                <p className="text-4xl font-black text-green-700 italic">R$ {ticket.detalhes?.reduce((acc: number, item: any) => acc + (item.retornoPossivel || 0), 0).toFixed(2).replace('.', ',')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
