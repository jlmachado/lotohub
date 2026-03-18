'use client';

/**
 * @fileOverview AppContext Professional - Motor de Tempo Real Multi-Tenant.
 * Sincroniza dinamicamente baseado no subdomínio e banca selecionada.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { resolveCurrentBanca, getSubdomain } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';

export interface Banner { id: string; title: string; imageUrl: string; active: boolean; position: number; bancaId: string; }
export interface Popup { id: string; title: string; imageUrl: string; active: boolean; priority: number; bancaId: string; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number;
  currentBanca: any; subdomain: string | null;
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[];
  apostas: any[]; footballBets: any[]; snookerChannels: any[];
  jdbResults: JDBNormalizedResult[];
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
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [currentBanca, setCurrentBanca] = useState<any>(null);

  // States Dinâmicos
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);

  // 1. Inicializa Contexto de Tenant
  useEffect(() => {
    const banca = resolveCurrentBanca();
    const sub = getSubdomain();
    setCurrentBanca(banca);
    setSubdomain(sub);
    
    const session = getSession();
    if (session) {
      // Inicia listener de usuário logado
      const userRef = doc(firestore, 'bancas', banca?.id || 'default', 'usuarios', session.userId);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() });
        }
        setIsLoading(false);
      });
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore]);

  // 2. Listeners de Tempo Real Isoldados por Tenant
  useEffect(() => {
    if (!currentBanca) return;

    const bancaId = currentBanca.id;
    const bancaPath = `bancas/${bancaId}`;
    
    console.log(`[SaaS] Iniciando sincronização em tempo real para: ${currentBanca.nome}`);

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

      onSnapshot(query(collection(firestore, 'jdbResults'), orderBy('date', 'desc'), limit(50)), (s) => 
        setJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult)))),

      onSnapshot(collection(firestore, bancaPath, 'snooker_channels'), (s) => 
        setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, currentBanca]);

  const handleFinalizarAposta = async (aposta: any, valorTotal: number) => {
    if (!user) { router.push('/login'); return null; }

    const pouleId = generatePoule();
    
    // Processamento Transacional Enterprise
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
      const apostaRef = doc(firestore, 'bancas', currentBanca.id, 'apostas', pouleId);
      await setDoc(apostaRef, {
        ...aposta,
        id: pouleId,
        userId: user.id,
        status: 'aguardando',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Aposta Confirmada!", description: `Poule: ${pouleId}` });
      return pouleId;
    } else {
      toast({ variant: 'destructive', title: "Erro na Aposta", description: result.message });
      return null;
    }
  };

  const value = {
    user, isLoading, currentBanca, subdomain,
    balance: user?.saldo || 0,
    bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, jdbResults, snookerChannels,
    refreshData: () => {}, // Automático via onSnapshot
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

// Mock para evitar quebra em arquivos que esperam setDoc (será migrado gradualmente)
const setDoc = async (ref: any, data: any) => {
  const { setDoc: fbSetDoc } = await import('firebase/firestore');
  return fbSetDoc(ref, data, { merge: true });
};
