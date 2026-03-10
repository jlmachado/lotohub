/**
 * @fileOverview Contexto global com bootstrap automático e sincronização robusta.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { 
  NormalizedMatch, 
  NormalizedStanding, 
  NormalizedLeague,
  syncFootballMatches as syncMatchesAction,
  syncFootballStandings as syncStandingsAction,
  getSPDate
} from '@/services/football-sync-service';
import { CatalogLeague } from '@/services/football/types';
import { BRAZILIAN_LEAGUE_CATALOG } from '@/services/football/catalog';
import { validateLeagueAvailability } from '@/services/football/validation-service';
import { deriveCoverage } from '@/services/football/utils';

export interface FootballSyncData {
  todayMatches: NormalizedMatch[];
  nextMatches: NormalizedMatch[];
  pastMatches: NormalizedMatch[];
  standings: NormalizedStanding[];
  leagues: CatalogLeague[]; // Agora usa o catálogo profissional
  lastSync: string | null;
  lastSuccessfulSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  apostas: any[];
  
  footballData: FootballSyncData;
  updateFootballCatalog: (leagues: CatalogLeague[]) => void;
  validateCatalogLeagues: () => Promise<void>;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  
  news: any[];
  banners: any[];
  popups: any[];
  jdbLoterias: any[];
  postedResults: any[];
  genericLotteryConfigs: any[];
  handleFinalizarAposta: (aposta: any, total: number) => string | null;
  activeBancaId: string;

  casinoSettings: any;
  updateCasinoSettings: (s: any) => void;
  bingoSettings: any;
  updateBingoSettings: (s: any) => void;
  bingoDraws: any[];
  bingoTickets: any[];
  
  snookerChannels: any[];
  snookerBets: any[];
  snookerLiveConfig: any;
  snookerFinancialHistory: any[];
  snookerPresence: any;
  snookerChatMessages: any[];
  snookerScoreboards: any;
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerCashOutLog: any[];

  celebrationTrigger: boolean;
  clearCelebration: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const FOOTBALL_STORAGE_KEY = 'app:football:v11_catalog';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [footballData, setFootballData] = useState<FootballSyncData>({
    todayMatches: [],
    nextMatches: [],
    pastMatches: [],
    standings: [],
    leagues: BRAZILIAN_LEAGUE_CATALOG,
    lastSync: null,
    lastSuccessfulSync: null,
    syncStatus: 'idle'
  });

  const [apostas, setApostas] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [popups, setPopups] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  
  const [casinoSettings, setCasinoSettings] = useState<any>({ casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está aqui!' });
  const [bingoSettings, setBingoSettings] = useState<any>({ enabled: true, rtpEnabled: false, rtpPercent: 10, ticketPriceDefault: 0.3, housePercentDefault: 10, maxTicketsPerUserDefault: 100, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual', autoSchedule: { everyMinutes: 5, startHour: 8, endHour: 23 } });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(FOOTBALL_STORAGE_KEY);
    if (stored) {
      try {
        setFootballData(JSON.parse(stored));
      } catch (e) {
        console.warn("Falha carregar catálogo.");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FOOTBALL_STORAGE_KEY, JSON.stringify(footballData));
  }, [footballData]);

  // --- FUNÇÕES DE CATÁLOGO ---
  const updateFootballCatalog = (leagues: CatalogLeague[]) => {
    setFootballData(prev => ({ ...prev, leagues }));
  };

  const validateCatalogLeagues = async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    const updatedCatalog = [...footballData.leagues];
    toast({ title: 'Validando Catálogo', description: 'Testando disponibilidade das ligas na API...' });

    for (let i = 0; i < updatedCatalog.length; i++) {
      const result = await validateLeagueAvailability(updatedCatalog[i]);
      updatedCatalog[i] = {
        ...updatedCatalog[i],
        statusValidacao: result.status,
        statusCobertura: deriveCoverage(result.status),
        totalJogos: result.totalGames,
        totalTimes: result.totalTeams,
        temTabela: result.hasTable,
        badge: result.badge || updatedCatalog[i].badge,
        ultimaValidacao: new Date().toISOString(),
        erroValidacao: result.error
      };
      // Atualização parcial para feedback visual
      setFootballData(prev => ({ ...prev, leagues: [...updatedCatalog] }));
    }

    setFootballData(prev => ({ ...prev, syncStatus: 'idle' }));
    syncInProgress.current = false;
    toast({ title: 'Validação Concluída' });
  };

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const activeIds = footballData.leagues
        .filter(l => l.ativa && l.idLeague)
        .map(l => l.idLeague!);

      if (activeIds.length === 0) {
        setFootballData(prev => ({ ...prev, syncStatus: 'idle' }));
        syncInProgress.current = false;
        if (manual) toast({ variant: 'destructive', title: 'Nenhuma liga ativa' });
        return;
      }

      const [matches, standings] = await Promise.all([
        syncMatchesAction(activeIds),
        syncStandingsAction(activeIds)
      ]);

      const hasNewData = matches.today.length > 0 || matches.next.length > 0 || matches.past.length > 0 || standings.length > 0;

      setFootballData(prev => ({
        ...prev,
        todayMatches: matches.today.length > 0 ? matches.today : prev.todayMatches,
        nextMatches: matches.next.length > 0 ? matches.next : prev.nextMatches,
        pastMatches: matches.past.length > 0 ? matches.past : prev.pastMatches,
        standings: standings.length > 0 ? standings : prev.standings,
        lastSync: new Date().toISOString(),
        lastSuccessfulSync: hasNewData ? new Date().toISOString() : prev.lastSuccessfulSync,
        syncStatus: hasNewData ? 'idle' : 'partial'
      }));

      if (manual) toast({ title: hasNewData ? 'Sincronizado!' : 'Sem atualizações' });
    } catch (e: any) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      if (manual) toast({ variant: 'destructive', title: 'Erro Sync', description: e.message });
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  // --- BOOTSTRAP E AUTO SYNC ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    const runAutoSync = () => {
      if (syncInProgress.current || !window.navigator.onLine) return;
      const spHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()), 10);
      const interval = (spHour >= 8 && spHour <= 23) ? 15 : 60;
      const last = footballData.lastSync ? new Date(footballData.lastSync) : new Date(0);
      const diff = (Date.now() - last.getTime()) / (60000);
      if (diff >= interval) syncFootballAll();
    };

    const timer = setTimeout(runAutoSync, 5000);
    const interval = setInterval(runAutoSync, 300000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [syncFootballAll, footballData.lastSync]);

  const value: AppContextType = {
    user, balance, bonus, terminal, logout: () => { logout(); setUser(null); router.push('/'); },
    apostas,
    footballData, 
    updateFootballCatalog,
    validateCatalogLeagues,
    syncFootballAll,
    news, banners, popups, jdbLoterias, postedResults, genericLotteryConfigs,
    handleFinalizarAposta: (aposta) => { const id = `p-${Date.now()}`; setApostas([aposta, ...apostas]); return id; },
    activeBancaId: 'default',
    casinoSettings, updateCasinoSettings: setCasinoSettings,
    bingoSettings, updateBingoSettings: setBingoSettings,
    bingoDraws: [], bingoTickets: [],
    snookerChannels: [], snookerBets: [], snookerLiveConfig: {}, snookerFinancialHistory: [], snookerPresence: {}, snookerChatMessages: [], snookerScoreboards: {}, snookerBetsFeed: [], snookerActivityFeed: [], snookerCashOutLog: [],
    celebrationTrigger, clearCelebration: () => setCelebrationTrigger(false), isFullscreen, toggleFullscreen: () => setIsFullscreen(!isFullscreen),
    soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled)
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
