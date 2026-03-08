'use client';

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/context/AppContext';
import { GlobalMiniPlayer } from '@/components/GlobalMiniPlayer';
import { useEffect } from 'react';
import { runMigrations } from '@/utils/migrations/runMigrations';
import { ensureDefaultUsers } from '@/utils/usersStorage';
import { ensureDefaultBichoLoterias } from '@/utils/bichoLoteriasStorage';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    // Executa migrações de dados legados no carregamento inicial (Client-side)
    runMigrations();
    // Garante que usuários padrão existam
    ensureDefaultUsers();
    // Garante que loterias padrão existam
    ensureDefaultBichoLoterias();
  }, []);

  return (
    <html lang="pt-BR">
      <head>
      </head>
      <body>
        <AppProvider>
          <GlobalMiniPlayer />
          <div className="flex-grow">{children}</div>
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
