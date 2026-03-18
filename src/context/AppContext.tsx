
'use client';

/**
 * @fileOverview AppContext Professional - Motor de Tempo Real Multi-Tenant.
 * Versão V4: Sincronização de perfil baseada em sessão corrigida.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { resolveCurrentBanca, getSubdomain } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { CommissionService } from '@/services/advanced/CommissionService';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';

export interface Banner { id: string; title: string; imageUrl: string; active: boolean; position: number; bancaId: string; }
export interface Popup { id: string; title: string; imageUrl: string; active: boolean; priority: number; bancaId: string; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number;
  currentBanca: any; subdomain: string | null;
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[];
  apostas: any[]; snookerChannels: any[];
  jdbResults: JDBNormalizedResult[];
  allUsers: any[];
  refreshData: () => void; logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => Promise<string | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { firestore } = initializeFirebase();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [currentBanca, setCurrentBanca] = useState<any>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);

  useEffect(() => {
    const banca = resolveCurrentBanca();
    const sub = getSubdomain();
    setCurrentBanca(banca);
    setSubdomain(sub);
    
    const session = getSession();
    if (session && session.userId) {
      console.log("[SYNC] Iniciando sincronização para UID:", session.userId);
      
      // Busca dados completos do usuário em tempo real usando o bancaId da sessão
      const activeBancaId = session.bancaId || 'default';
      const userRef = doc(firestore, 'bancas', activeBancaId, 'usuarios', session.userId);
      
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUser({ id: snap.id, ...data });
          console.log("[SYNC] Perfil atualizado:", data);
        } else if (activeBancaId !== 'default') {
          // Fallback para SuperAdmin que pode estar na banca default
          const masterRef = doc(firestore, 'bancas', 'default', 'usuarios', session.userId);
          onSnapshot(masterRef, (mSnap) => {
            if (mSnap.exists()) setUser({ id: mSnap.id, ...mSnap.data() });
          });
        }
        setIsLoading(false);
      });
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    const unsubResults = onSnapshot(query(collection(firestore, 'jdbResults'), orderBy('date', 'desc'), limit(50)), (s) => 
      setJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))));

    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    if (bancaId === 'default' && (!user || user.tipoUsuario !== 'SUPER_ADMIN')) {
      return;
    }

    const bancaPath = `bancas/${bancaId}`;
    
    const unsubscribers = [
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), (s) => 
        setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner)))),
      
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), (s) => 
        setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup)))),
      
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), (s) => 
        setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage)))),

      onSnapshot(query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50)), (s) => 
        setApostas(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)), (s) => 
        setLedger(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(firestore, bancaPath, 'snooker_channels'), (s) => 
        setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(firestore, bancaPath, 'usuarios'), (s) => {
        setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      })
    ];

    return () => {
      unsubResults();
      unsubscribers.forEach(unsub => unsub());
    };
  }, [firestore, currentBanca, user]);

  const handleFinalizarAposta = async (aposta: any, valorTotal: number) => {
    if (!user) { router.push('/login'); return null; }
    const bancaId = user.bancaId || 'default';

    const pouleId = generatePoule();
    
    const result = await LedgerService.registerMovement({
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: aposta.loteria,
      type: 'BET_PLACED',
      amount: -valorTotal,
      referenceId: pouleId,
      description: `${aposta.loteria}: ${aposta.numeros}`
    });

    if (result.success) {
      try {
        const apostaRef = doc(firestore, 'bancas', bancaId, 'apostas', pouleId);
        await setDoc(apostaRef, {
          ...aposta,
          id: pouleId,
          userId: user.id,
          bancaId: bancaId,
          status: 'aguardando',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await CommissionService.processarComissao(bancaId, user.id, user.tipoUsuario, valorTotal, pouleId);

        toast({ title: "Aposta Confirmada!", description: `Poule: ${pouleId}` });
        return pouleId;
      } catch (e: any) {
        toast({ variant: 'destructive', title: "Erro ao Salvar", description: "Aposta paga mas não registrada." });
        return null;
      }
    } else {
      toast({ variant: 'destructive', title: "Erro Financeiro", description: result.message });
      return null;
    }
  };

  const value = {
    user, allUsers, isLoading, currentBanca, subdomain,
    balance: user?.saldo || 0,
    bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, jdbResults, snookerChannels,
    refreshData: () => {}, 
    logout: authLogout,
    handleFinalizarAposta
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
