'use client';

import {
  Home,
  Menu,
  Wallet,
  Gift,
  X,
  LogOut,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';

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

const AnimatedNumber = ({ value, isCurrency = true, className }: { value: number; isCurrency?: boolean, className?: string }) => {
  const elRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const end = value;
    let startValue = 0;
    try {
        if (elRef.current?.textContent) {
            const currentText = elRef.current.textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            const parsed = parseFloat(currentText);
            if (!isNaN(parsed)) {
                startValue = parsed;
            }
        }
    } catch(e) {
        startValue = 0;
    }
    
    const duration = 1200;
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentVal = startValue + (end - startValue) * progress;
      
      if (elRef.current) {
        const formattedValue = isCurrency 
          ? `R$ ${currentVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          : Math.round(currentVal).toString();
        elRef.current.textContent = formattedValue;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value, isCurrency]);

  const initialText = isCurrency ? 'R$ 0,00' : '0';

  return <p ref={elRef} className={cn("font-bold", className)}>{initialText}</p>;
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { balance, bonus, terminal, user, logout } = useAppContext();
  
  // Local user state to prevent "Login" button flicker if context is still hydrating
  const [hydratedUser, setHydratedUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (!user) {
      const u = getCurrentUser();
      if (u) setHydratedUser(u);
    }
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

  if (!mounted) return null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-muted text-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col px-4">
          <div className="flex h-9 md:h-10 items-center justify-between gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página inicial"
                onClick={() => router.push('/')}
                className="h-7 w-7"
              >
                <Home className="h-3.5 w-3.5" />
              </Button>
              {canSeeAdmin && !isAdminRoute && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/admin')}
                  className="hidden sm:flex border-primary/20 text-primary hover:bg-primary/10 h-6 gap-1 uppercase font-black italic text-[8px] px-1.5"
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
                  <div className="hidden lg:flex flex-col items-end mr-1">
                    <span className="text-[8px] font-bold uppercase text-muted-foreground leading-none">{activeUser.nome}</span>
                    <span className="text-[7px] font-mono text-primary leading-none mt-0.5">{activeUser.terminal}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="h-6 px-1.5 text-[9px] font-bold uppercase">Entrar</Button>
                  <Button size="sm" onClick={() => router.push('/cadastro')} className="h-6 px-1.5 text-[9px] font-bold uppercase lux-shine hidden xs:flex">Cadastrar</Button>
                </div>
              )}
              <Button variant="ghost" size="icon" aria-label="Menu" className="h-7 w-7" onClick={() => setIsSheetOpen(true)}>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {activeUser && (
            <div className="grid grid-cols-2 items-center gap-x-2 pb-1 md:grid-cols-3 md:pb-0.5">
              <div className="flex items-center justify-start gap-1">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-[8px] uppercase text-muted-foreground font-bold leading-tight">Saldo</p>
                  <AnimatedNumber value={displayBalance} className="leading-tight text-[11px] md:text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-start gap-1">
                <Gift className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-[8px] uppercase text-muted-foreground font-bold leading-tight">Bônus</p>
                  <AnimatedNumber value={displayBonus} className="text-green-500 leading-tight text-[11px] md:text-xs" />
                </div>
              </div>
              <div className="col-span-2 flex justify-center pt-1 md:col-span-1 md:justify-end md:pt-0">
                  <Button variant="secondary" className="h-6 rounded-md px-2 font-bold bg-amber-400 text-black hover:bg-amber-500 text-[9px] uppercase italic">
                    Terminal {displayTerminal}
                  </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="p-0 w-1/2 sm:w-[280px] bg-white text-gray-800 border-r-0 overflow-hidden">
            <SheetHeader className="sr-only">
                <SheetTitle>Menu Principal</SheetTitle>
                <SheetDescription>Navegue pelas diferentes seções do site.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between bg-slate-950 text-white lg:hidden shrink-0">
                <Logo height={22} />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 h-8 w-8">
                    <X size={18} />
                  </Button>
                </SheetClose>
              </div>
              <div className="flex-1 overflow-hidden relative">
                {menuContent}
              </div>
            </div>
        </SheetContent>
      </Sheet>
    </>
  );

  function handleLogout() {
    logout();
    setIsSheetOpen(false);
  }
}