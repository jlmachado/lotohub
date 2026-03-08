'use client';

import { Header } from '@/components/header';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, Ticket, Clover, Gem } from 'lucide-react';
import Link from 'next/link';
import { isModuleEnabled } from '@/utils/bancaContext';
import { useMemo } from 'react';

export default function LoteriasPage() {
  const loterias = useMemo(() => [
    { nome: 'Jogo Do Bicho', icon: <PawPrint className="h-8 w-8 text-primary" />, href: '/loterias/jogo-do-bicho', module: 'jogoDoBicho' },
    { nome: 'Loteria Uruguai (Quiniela)', icon: <Ticket className="h-8 w-8 text-primary" />, href: '/loterias/loteria-uruguai', module: 'loteriaUruguai' },
    { nome: 'Seninha', icon: <Clover className="h-8 w-8 text-primary" />, href: '/loterias/seninha', module: 'seninha' },
    { nome: 'Quininha', icon: <Gem className="h-8 w-8 text-primary" />, href: '/loterias/quininha', module: 'quininha' },
    { nome: 'Lotinha', icon: <Ticket className="h-8 w-8 text-primary" />, href: '/loterias/lotinha', module: 'lotinha' },
  ].filter(l => isModuleEnabled(l.module as any)), []);

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Loterias</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loterias.map((loteria) => (
            <Link href={loteria.href} key={loteria.nome}>
              <Card className="premium-card cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex flex-col items-center justify-center text-center gap-4">
                    {loteria.icon}
                    <span>{loteria.nome}</span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
        {loterias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">Nenhuma loteria habilitada para esta banca.</p>
          </div>
        )}
      </main>
    </div>
  );
}