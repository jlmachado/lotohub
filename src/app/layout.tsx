'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/context/AppContext';
import { GlobalMiniPlayer } from '@/components/GlobalMiniPlayer';
import { FirebaseClientProvider } from '@/firebase';

/**
 * @fileOverview Root Layout configurado com provedores de contexto.
 * Adicionado FirebaseClientProvider para suportar sincronização cloud.
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
        <FirebaseClientProvider>
          <AppProvider>
            <GlobalMiniPlayer />
            <div className="flex-grow">{children}</div>
            <Toaster />
          </AppProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
