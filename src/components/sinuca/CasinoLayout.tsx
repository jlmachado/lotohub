'use client';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppContext } from "@/context/AppContext";
import { Menu, Wallet, Gift } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SinucaSidebar } from "./SinucaSidebar";
import { Logo } from "../Logo";


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

  return <p ref={elRef} className={cn("text-base font-semibold", className)} style={isCurrency ? {textShadow: "0 0 14px rgba(245,158,11,0.35)"} : {}}>{initialText}</p>;
};

export const CasinoLayout = ({ children }: { children: React.ReactNode }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { balance, bonus } = useAppContext();

    return (
        <div className="casino-background min-h-screen">
            <div className="flex">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block w-64">
                    <SinucaSidebar className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-black/30 border-r dark:border-white/10 text-gray-800 dark:text-white" />
                </div>
                
                <main className="flex-1">
                    <div className="lg:hidden p-4 h-[72px] flex justify-between items-center bg-black/30 border-b border-white/10 sticky top-0 z-40">
                         <Link href="/">
                           <Logo width={120} height={30} />
                         </Link>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-3">
                               <div className="text-right">
                                  <p className="text-xs text-white/60 flex items-center gap-1 justify-end"><Wallet className="h-3 w-3 text-amber-400" /> Saldo</p>
                                  <AnimatedNumber value={balance} />
                               </div>
                                <div className="text-right">
                                  <p className="text-xs text-white/60 flex items-center gap-1 justify-end"><Gift className="h-3 w-3 text-green-500" /> Bônus</p>
                                  <AnimatedNumber value={bonus} className="text-green-500" />
                               </div>
                           </div>

                           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(true)}>
                                        <Menu className="h-6 w-6 text-white" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-1/2 bg-white text-gray-800 border-r-0">
                                    <SheetHeader className="sr-only">
                                        <SheetTitle>Menu Principal</SheetTitle>
                                        <SheetDescription>Navegue pelas diferentes seções do site, como cassino, bingo e loterias.</SheetDescription>
                                    </SheetHeader>
                                    <SinucaSidebar className="flex flex-col h-full" setSheetOpen={setIsSheetOpen} />
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                    <div className="p-4 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
