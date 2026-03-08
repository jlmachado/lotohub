'use client';

import { useState, useEffect } from 'react';
import { getActiveContext, resolveCurrentBanca } from '@/utils/bancaContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Building2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BancaContext } from '@/utils/bancasStorage';

export function AdminContextBar() {
  const router = useRouter();
  const [context, setContext] = useState<BancaContext | null>(null);
  const [bancaName, setBancaName] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const ctx = getActiveContext();
      setContext(ctx);
      const banca = resolveCurrentBanca();
      setBancaName(banca?.nome || null);
    };

    update();
    window.addEventListener('banca-context-updated', update);
    return () => window.removeEventListener('banca-context-updated', update);
  }, []);

  if (!context) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-slate-900 border-b border-white/10 px-4 py-2 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        {context.mode === 'GLOBAL' ? (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Painel Global</span>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-400/30 text-[9px]">VISÃO MACRO</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Unidade: {bancaName || context.subdomain}</span>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-400/30 text-[9px]">FILTRADO</Badge>
          </div>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push('/admin/select-banca')}
        className="h-7 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 gap-2"
      >
        <RefreshCw className="h-3 w-3" />
        Trocar Contexto
      </Button>
    </div>
  );
}
