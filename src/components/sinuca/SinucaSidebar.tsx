'use client';
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { useAppContext } from "@/context/AppContext";
import { 
  Home, Gem, PawPrint, LifeBuoy, Video, Star, Award, 
  Volume2, VolumeX, Gift, Search, X, Spade, Goal, 
  Ticket, Landmark, QrCode, Banknote, Shield, 
  LogOut, Coins, Lock, History, ArrowRightLeft
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "../Logo";
import { getEnabledModules } from "@/utils/bancaContext";
import React, { useMemo } from 'react';

export const SinucaSidebar = React.memo(({ className, setSheetOpen }: { className?: string; setSheetOpen?: (open: boolean) => void }) => {
    const { soundEnabled, toggleSound, user, logout } = useAppContext();
    const pathname = usePathname();
    const modules = getEnabledModules();

    const hasAnyLottery = modules.jogoDoBicho || modules.seninha || modules.quininha || modules.lotinha || modules.loteriaUruguai;

    const menuItems = useMemo(() => [
        { href: "/", label: "Início", icon: Home, enabled: true },
        { href: "/cassino", label: "Cassino", icon: Gem, enabled: modules.cassino },
        { href: "/bingo", label: "Bingo", icon: Star, enabled: modules.bingo },
        { href: "/loterias", label: "Loterias", icon: PawPrint, enabled: hasAnyLottery },
        { href: "/sinuca/ao-vivo", label: "Sinuca ao Vivo", icon: Video, enabled: modules.sinucaAoVivo },
        { href: "/futebol", label: "Futebol", icon: Goal, enabled: modules.futebol },
        { href: "/surebet", label: "SUREBET", icon: ArrowRightLeft, enabled: modules.futebol },
        { href: "/resultados", label: "Resultados", icon: Search, enabled: true },
        { href: "/premiados", label: "Premiados", icon: Award, enabled: true },
        { href: "/apostas", label: "Apostas", icon: Ticket, enabled: !!user },
        { href: "/financeiro", label: "Extrato", icon: Landmark, enabled: !!user },
        { href: "/recarga-pix", label: "Recarga Pix", icon: QrCode, enabled: true },
        { href: "/sacar", label: "Sacar", icon: Banknote, enabled: !!user },
        
        { 
          href: "/promotor/comissao", 
          label: "Minhas Comissões", 
          icon: Coins, 
          enabled: user?.tipoUsuario === 'PROMOTOR' || user?.tipoUsuario === 'CAMBISTA' 
        },
        { 
          href: "/promotor/creditos", 
          label: "Créditos Recebidos", 
          icon: History, 
          enabled: user?.tipoUsuario === 'PROMOTOR' || user?.tipoUsuario === 'CAMBISTA' 
        },
        { 
          href: "/cambista/caixa", 
          label: "Gestão de Caixa", 
          icon: Lock, 
          enabled: user?.tipoUsuario === 'CAMBISTA' 
        },
        
        { 
          href: "/admin", 
          label: "Admin", 
          icon: Shield, 
          enabled: user?.tipoUsuario === 'ADMIN' || user?.tipoUsuario === 'SUPER_ADMIN' 
        },
    ].filter(item => item.enabled), [modules, hasAnyLottery, user]);
    
    const accordionItems = useMemo(() => [
         {
            id: "ofertas",
            label: "Ofertas",
            icon: Gift,
            content: "Nenhuma oferta no momento."
        },
        {
            id: "apoio",
            label: "Centro de Apoio",
            icon: LifeBuoy,
            content: "Entre em contato pelo WhatsApp."
        },
    ], []);

    return (
        <aside className={cn("flex flex-col h-full bg-white text-gray-800 dark:bg-black/80 dark:text-white", className)}>
            <div className="flex items-center justify-between p-3.5 border-b border-gray-200 dark:border-white/10">
                <Link href="/" onClick={() => setSheetOpen?.(false)}>
                    <Logo height={24} />
                </Link>
                {setSheetOpen && (
                    <SheetClose asChild className="lg:hidden">
                        <Button variant="ghost" size="icon" className="text-gray-400 dark:text-white/50 h-8 w-8 hover:bg-transparent"><X size={18} /></Button>
                    </SheetClose>
                )}
            </div>
             <div className="p-3.5 space-y-3 border-b border-gray-200 dark:border-white/10">
                <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl">
                    <History size={18} className="text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/70 leading-none tracking-wider mb-1">Terminal Ativo</span>
                    <span className="text-[12px] font-black font-mono text-gray-800 dark:text-white truncate">{user?.terminal || '---'}</span>
                  </div>
                  {user && (
                    <Badge variant="outline" className="ml-auto text-[7px] uppercase font-black bg-primary/10 dark:bg-white/5 border-primary/20 dark:border-white/10 px-1.5 h-4.5 text-primary dark:text-white/70">
                      {user.tipoUsuario}
                    </Badge>
                  )}
                </div>
            </div>

            <Tabs defaultValue="cassino" className="w-full flex flex-col flex-grow min-h-0">
                <TabsList className="grid w-full grid-cols-2 p-1.5 h-auto rounded-none bg-slate-50/50 dark:bg-black/20 shrink-0 border-b border-gray-100 dark:border-white/5">
                    <TabsTrigger value="cassino" className="data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg py-2 gap-2 text-[11px] font-black uppercase tracking-tight text-gray-500 dark:text-white/50">
                        <Spade size={14} /> Painel
                    </TabsTrigger>
                    <TabsTrigger value="esporte" className="data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg py-2 gap-2 text-[11px] font-black uppercase tracking-tight text-gray-500 dark:text-white/50">
                        <Goal size={14} /> Esportes
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="cassino" className="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {menuItems.filter(i => !['Sinuca ao Vivo', 'Futebol', 'SUREBET'].includes(i.label)).map(item => {
                        const active = pathname === item.href;
                        return (
                            <Link href={item.href} key={item.label} onClick={() => setSheetOpen?.(false)}>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start gap-3 text-sm h-10.5 rounded-xl transition-all font-medium",
                                        active 
                                            ? "bg-green-50 dark:bg-green-600/10 text-green-600 dark:text-green-400 font-bold" 
                                            : "text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("h-4.5 w-4.5", active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-white/40")} />
                                    <span>{item.label}</span>
                                </Button>
                            </Link>
                        );
                    })}
                    
                    <Accordion type="single" collapsible className="w-full">
                        {accordionItems.map(item => (
                            <AccordionItem value={item.id} key={item.id} className="border-b-0">
                            <AccordionTrigger className="w-full justify-between gap-3 text-sm h-10.5 text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl p-3 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" />
                                        <span>{item.label}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pt-1.5 text-xs text-muted-foreground/80 leading-relaxed">
                                {item.content}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    <Button
                        variant="ghost"
                        onClick={() => toggleSound()}
                        className="w-full justify-start gap-3 text-sm h-10.5 text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl"
                    >
                        {soundEnabled ? <Volume2 className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" /> : <VolumeX className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" />}
                        <span>Som</span>
                    </Button>
                    
                    {user && (
                      <Button
                          variant="ghost"
                          onClick={() => { logout(); setSheetOpen?.(false); }}
                          className="w-full justify-start gap-3 text-sm h-10.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                      >
                          <LogOut className="h-4.5 w-4.5" />
                          <span>Sair</span>
                      </Button>
                    )}
                </TabsContent>
                <TabsContent value="esporte" className="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {modules.sinucaAoVivo && (
                        <Link href="/sinuca/ao-vivo" onClick={() => setSheetOpen?.(false)}>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start gap-3 text-sm h-10.5 rounded-xl transition-all",
                                    pathname.startsWith('/sinuca/ao-vivo') 
                                        ? "bg-green-50 dark:bg-green-600/10 text-green-600 dark:text-green-400 font-bold" 
                                        : "text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
                                )}
                            >
                                <Video className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" />
                                Sinuca ao Vivo
                            </Button>
                        </Link>
                    )}
                    {modules.futebol && (
                        <>
                          <Link href="/futebol" onClick={() => setSheetOpen?.(false)}>
                              <Button
                                  variant="ghost"
                                  className={cn(
                                      "w-full justify-start gap-3 text-sm h-10.5 rounded-xl transition-all",
                                      pathname.startsWith('/futebol') 
                                          ? "bg-green-50 dark:bg-green-600/10 text-green-600 dark:text-green-400 font-bold" 
                                          : "text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
                                  )}
                              >
                                  <Goal className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" />
                                  Futebol
                              </Button>
                          </Link>
                          <Link href="/surebet" onClick={() => setSheetOpen?.(false)}>
                              <Button
                                  variant="ghost"
                                  className={cn(
                                      "w-full justify-start gap-3 text-sm h-10.5 rounded-xl transition-all",
                                      pathname.startsWith('/surebet') 
                                          ? "bg-green-50 dark:bg-green-600/10 text-green-600 dark:text-green-400 font-bold" 
                                          : "text-gray-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
                                  )}
                              >
                                  <ArrowRightLeft className="h-4.5 w-4.5 text-gray-400 dark:text-white/40" />
                                  SUREBET
                              </Button>
                          </Link>
                        </>
                    )}
                </TabsContent>
            </Tabs>
            
            <div className="p-3.5 mt-auto border-t border-gray-100 dark:border-white/5">
                 <div className="relative group overflow-hidden rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <Image src="https://picsum.photos/seed/ad-banner/300/120" width={300} height={120} alt="Banner" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-[10px] font-black text-white/90 uppercase tracking-widest italic">Confira as Loterias</span>
                 </div>
            </div>
        </aside>
    );
});

SinucaSidebar.displayName = 'SinucaSidebar';

const Badge = ({ children, variant, className }: any) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center justify-center whitespace-nowrap",
    variant === 'outline' ? "border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/50" : "bg-primary text-primary-foreground border-transparent",
    className
  )}>
    {children}
  </span>
);
