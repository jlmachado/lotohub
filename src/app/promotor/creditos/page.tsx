'use client';

import { useMemo } from 'react';
import { Header } from '@/components/header';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/utils/currency';
import { History, Banknote, Calendar, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PromoterCreditsPage() {
  const { user, promoterCredits } = useAppContext();

  const userCredits = useMemo(() => {
    if (!user) return [];
    return promoterCredits
      .filter(c => c.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [user, promoterCredits]);

  const stats = useMemo(() => {
    const total = userCredits.reduce((acc, curr) => acc + curr.valor, 0);
    const last = userCredits[0]?.valor || 0;
    return { total, last };
  }, [userCredits]);

  if (!user || (user.tipoUsuario !== 'PROMOTOR' && user.tipoUsuario !== 'CAMBISTA')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-6">Esta área é exclusiva para Promotores e Cambistas.</p>
          <Link href="/"><Button className="w-full">Voltar para Home</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon"><ChevronLeft size={18} /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Créditos Administrativos</h1>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Histórico de injeção de saldo operacional</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                <Banknote size={12} /> Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-black text-primary italic">{formatBRL(stats.total)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                <History size={12} /> Último Crédito
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-black text-white italic">{formatBRL(stats.last)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/5 overflow-hidden shadow-2xl">
          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            <h3 className="text-xs font-black uppercase italic tracking-widest text-white">Registros de Crédito</h3>
          </div>
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-white/5">
                <TableHead className="text-[10px] font-black uppercase">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Motivo</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userCredits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">
                    Nenhum crédito administrativo recebido ainda.
                  </TableCell>
                </TableRow>
              ) : (
                userCredits.map((c) => (
                  <TableRow key={c.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(c.createdAt).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-slate-300 uppercase italic">{c.motivo}</p>
                    </TableCell>
                    <TableCell className="text-right font-black text-green-500">
                      +{formatBRL(c.valor)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
