'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/context/AppContext';
import { GlobalMiniPlayer } from '@/components/GlobalMiniPlayer';
import { useEffect } from 'react';
import { runMigrations } from '@/utils/migrations/runMigrations';
import { DatabaseSeedService } from '@/services/database-seed-service';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Garante que os dados básicos existam no Firestore (Superadmin e Banca Default)
      await DatabaseSeedService.ensureInitialData();
      
      // 2. Executa migrações de dados locais legados para Firestore
      await runMigrations();
    };

    initializeApp();
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
