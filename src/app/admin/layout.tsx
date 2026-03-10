/**
 * @fileOverview Layout administrativo com proteção de rota robusta para produção.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminContextBar } from '@/components/admin/AdminContextBar';
import { Header } from '@/components/header';
import { usePathname, useRouter } from 'next/navigation';
import { getActiveContext } from '@/utils/bancaContext';
import { getCurrentUser, canAccessAdmin } from '@/utils/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    
    if (!user || !canAccessAdmin(user)) {
      router.push('/login');
      return;
    }

    setAuthorized(true);

    const ctx = getActiveContext();
    if (!ctx && user.tipoUsuario === 'SUPER_ADMIN' && pathname !== '/admin/select-banca') {
      router.push('/admin/select-banca');
    }
  }, [router, pathname]);

  if (!mounted || !authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // A tela de seleção de banca não usa o layout padrão com sidebar
  if (pathname === '/admin/select-banca') {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar className="hidden lg:flex w-64 sticky top-0 h-screen shrink-0" />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminContextBar />
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
