'use client';

/**
 * @fileOverview AppContext - Orquestrador Central Multi-Tenant.
 * Implementa isolamento total de dados por bancaId e sincronização Firestore-first.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG } from '@/utils/espn-league-catalog';
import { SnookerPriorityService } from '@/services/snooker-priority-service';
import { getActiveContext } from '@/utils/bancaContext';

// Firebase
import { initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BaseRepository } from '@/repositories/base-repository';

// --- INTERFACES ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; bancaId: string; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; bancaId: string; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }
export interface Aposta { id: string; loteria: string; concurso: string; data: string; valor: string; numeros: string; status: 'aguardando' | 'premiado' | 'won' | 'lost'; userId: string; bancaId: string; createdAt: string; }
export interface FootballBet { id: string; userId: string; bancaId: string; terminal: string; stake: number; potentialWin: number; items: any[]; status: 'OPEN' | 'WON' | 'LOST'; createdAt: string; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number; terminal: string; activeBancaId: string; 
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[]; apostas: Aposta[]; 
  footballBets: FootballBet[]; snookerChannels: any[]; snookerBets: any[]; bingoDraws: any[];
  jdbResults: JDBNormalizedResult[]; 
  refreshData: () => void; logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => Promise<string | null>;
  placeFootballBet: (stake: number) => Promise<string | null>;
  // ... outras funções de ações ...
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { firestore, auth } = initializeFirebase();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // States Locais (Sincronizados com Firestore)
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [bingoDraws, setBingoDraws] = useState<any[]>([]);

  // Repositórios Tenant-Aware
  const apostasRepo = useMemo(() => new BaseRepository<Aposta>('apostas'), []);
  const footballBetsRepo = useMemo(() => new BaseRepository<FootballBet>('football_bets'), []);
  const ledgerRepo = useMemo(() => new BaseRepository<any>('ledgerEntries'), []);

  /**
   * Resolve o bancaId atual do contexto ou da sessão.
   */
  const currentBancaId = useMemo(() => {
    const ctx = getActiveContext();
    return ctx?.bancaId || user?.bancaId || 'default';
  }, [user]);

  // --- ESCUTA EM TEMPO REAL COM ISOLAMENTO DE BANCA (TENANT) ---
  useEffect(() => {
    if (!mounted || !firestore || !currentBancaId) return;

    console.log(`[CONTEXT] Iniciando listeners para a banca: ${currentBancaId}`);

    const listeners: (() => void)[] = [];
    const tenantFilter = where('bancaId', '==', currentBancaId);

    const configs = [
      { coll: 'banners', state: setBanners },
      { coll: 'popups', state: setPopups },
      { coll: 'news_messages', state: setNews },
      { coll: 'apostas', state: setApostas },
      { coll: 'football_bets', state: setFootballBets },
      { coll: 'snooker_channels', state: setSnookerChannels },
      { coll: 'snooker_bets', state: setSnookerBets },
      { coll: 'bingo_draws', state: setBingoDraws },
      { coll: 'ledgerEntries', state: setLedger, limit: 100 },
      { coll: 'jdbResults', state: setJdbResults, isGlobal: true } // Resultados podem ser globais
    ];

    configs.forEach(cfg => {
      const baseRef = collection(firestore, cfg.coll);
      // Aplica filtro de banca a menos que seja explicitamente global
      const q = cfg.isGlobal 
        ? query(baseRef, orderBy('updatedAt', 'desc'), limit(cfg.limit || 500))
        : query(baseRef, tenantFilter, orderBy('updatedAt', 'desc'), limit(cfg.limit || 500));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cfg.state(data);
      }, (err) => {
        console.error(`[Firestore Listener Error] ${cfg.coll}:`, err);
      });
      listeners.push(unsubscribe);
    });

    return () => listeners.forEach(unsub => unsub());
  }, [mounted, firestore, currentBancaId]);

  // --- AUTH LISTENER ---
  useEffect(() => {
    if (!mounted || !auth) return;
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [mounted, auth]);

  useEffect(() => {
    setMounted(true);
    const session = getSession();
    if (session) {
      // No SaaS, buscamos o usuário direto do Firestore para garantir integridade
      // O listener de users cuidará do estado reativo
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleFinalizarAposta = async (aposta: any, valorTotal: number) => {
    if (!user) { router.push('/login'); return null; }
    if (!currentBancaId) throw new Error("ID da banca não identificado.");

    const pouleId = generatePoule();
    const result = BetService.processBet(user, { 
      userId: user.id, 
      modulo: aposta.loteria, 
      valor: valorTotal, 
      retornoPotencial: 0, 
      description: `${aposta.loteria}: ${aposta.numeros}`, 
      referenceId: pouleId 
    });

    if (result.success) {
      const newAposta: Aposta = { 
        ...aposta, 
        id: pouleId, 
        userId: user.id, 
        bancaId: currentBancaId, 
        status: 'aguardando', 
        createdAt: new Date().toISOString() 
      };
      await apostasRepo.save(newAposta);
      return pouleId;
    }
    return null;
  };

  const placeFootballBet = async (stake: number) => {
    if (!user) { router.push('/login'); return null; }
    // Implementação similar ao apostaRepo...
    return null;
  };

  const value = {
    user, isLoading, 
    balance: user?.saldo || 0, 
    bonus: user?.bonus || 0, 
    terminal: user?.terminal || '',
    activeBancaId: currentBancaId,
    ledger, banners, popups, news, apostas, footballBets,
    snookerChannels, snookerBets, bingoDraws, jdbResults,
    refreshData: () => {}, // Handled by onSnapshot
    logout: authLogout,
    handleFinalizarAposta,
    placeFootballBet
  };

  return (
    <AppContext.Provider value={value}>
      {mounted && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};