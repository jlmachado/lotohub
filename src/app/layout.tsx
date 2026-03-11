'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/context/AppContext';
import { GlobalMiniPlayer } from '@/components/GlobalMiniPlayer';
import { useEffect } from 'react';

/**
 * @fileOverview Root Layout restaurado para funcionamento local.
 * Removidas sementes e migrações do Firebase do fluxo de inicialização.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
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
