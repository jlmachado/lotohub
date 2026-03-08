'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAdminMenuItems } from '@/utils/adminMenu';
import { getActiveContext, getEnabledModules } from '@/utils/bancaContext';
import { getCurrentUser } from '@/utils/auth';
import { Logo } from '../Logo';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { LogOut, ChevronRight } from 'lucide-react';

interface AdminSidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export function AdminSidebar({ className, onItemClick }: AdminSidebarProps) {
  const pathname = usePathname();
  const context = getActiveContext();
  const modules = getEnabledModules();
  const user = getCurrentUser();
  const menuItems = getAdminMenuItems(user, context, modules);

  return (
    <aside className={cn("flex flex-col h-full bg-slate-950 border-r border-white/10 text-white", className)}>
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <Link href="/admin">
          <Logo height={28} />
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={onItemClick}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-primary")} />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/5">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 h-11">
            <LogOut className="h-5 w-5" />
            <span className="text-sm">Sair do Admin</span>
          </Button>
        </Link>
      </div>
    </aside>
  );
}
