/**
 * @fileOverview Cabeçalho global com proteção contra erros de hidratação.
 */

'use client';

import {
  Home,
  Menu,
  Wallet,
  Gift,
  X,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { SinucaSidebar } from './sinuca/SinucaSidebar';
import { AdminSidebar } from './admin/AdminSidebar';
import { Logo } from './Logo';
import { getCurrentUser } from '@/utils/auth';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { balance, bonus, terminal, user, logout } = useAppContext();
  
  const [hydratedUser, setHydratedUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    if (u) setHydratedUser(u);
  }, [user]);

  const isAdminRoute = pathname.startsWith('/admin');
  const activeUser = user || hydratedUser;
  const canSeeAdmin = activeUser?.tipoUsuario === 'ADMIN' || activeUser?.tipoUsuario === 'SUPER_ADMIN';
  
  const displayBalance = user ? balance : (hydratedUser?.saldo || 0);
  const displayBonus = user ? bonus : (hydratedUser?.bonus || 0);
  const displayTerminal = user ? terminal : (hydratedUser?.terminal || '');

  const menuContent = useMemo(() => {
    if (!mounted) return null;
    return isAdminRoute ? (
      <AdminSidebar className="border-r-0" onItemClick={() => setIsSheetOpen(false)} />
    ) : (
      <SinucaSidebar className="flex flex-col h-full border-r-0" setSheetOpen={setIsSheetOpen} />
    );
  }, [isAdminRoute, mounted]);

  if (!mounted) {
    return <header className="h-10 bg-muted w-full" />;
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-muted text-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col px-4">
          <div className="flex h-10 items-center justify-between gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-7 w-7">
                <Home className="h-3.5 w-3.5" />
              </Button>
              {canSeeAdmin && !isAdminRoute && (
                <Button 
                  variant="outline" size="sm" onClick={() => router.push('/admin')}
                  className="hidden sm:flex border-primary/20 text-primary h-6 gap-1 uppercase font-black italic text-[8px] px-1.5"
                >
                  <ShieldAlert size={10} /> Admin
                </Button>
              )}
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              <div onClick={() => router.push(isAdminRoute ? '/admin' : '/')} className="cursor-pointer">
                <Logo height={18} />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeUser ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { logout(); setIsSheetOpen(false); }} className="h-7 w-7 text-destructive">
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="h-6 px-1.5 text-[9px] font-bold uppercase">Entrar</Button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsSheetOpen(true)}>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {activeUser && (
            <div className="grid grid-cols-2 items-center gap-x-2 pb-1 md:grid-cols-3">
              <div className="flex items-center gap-1">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                <p className="font-bold text-[11px] md:text-xs">R$ {displayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex items-center gap-1">
                <Gift className="h-3 w-3 text-muted-foreground" />
                <p className="font-bold text-green-500 text-[11px] md:text-xs">R$ {displayBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 flex justify-center md:col-span-1 md:justify-end">
                  <Badge className="h-5 rounded-md px-2 font-bold bg-amber-400 text-black text-[8px] uppercase italic">
                    Terminal {displayTerminal}
                  </Badge>
              </div>
            </div>
          )}
        </div>
      </header>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-white border-r-0 overflow-hidden">
            <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle></SheetHeader>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between bg-slate-950 text-white shrink-0">
                <Logo height={22} />
                <SheetClose asChild><Button variant="ghost" size="icon" className="text-white/70 h-8 w-8"><X size={18} /></Button></SheetClose>
              </div>
              <div className="flex-1 overflow-hidden">{menuContent}</div>
            </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

const Badge = ({ children, className }: any) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center justify-center whitespace-nowrap", className)}>{children}</span>
);
