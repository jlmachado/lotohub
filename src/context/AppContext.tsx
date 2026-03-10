/**
 * @fileOverview Contexto global gerenciando dados de futebol ESPN.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { 
  ESPN_LEAGUE_CATALOG, 
  ESPNLeagueConfig 
} from '@/utils/espn-league-catalog';
import { 
  normalizeESPNScoreboard, 
  normalizeESPNStandings, 
  NormalizedESPNMatch, 
  NormalizedESPNStanding 
} from '@/utils/espn-normalizer';

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
  lastSync: string | null;
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
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  
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

const FOOTBALL_STORAGE_KEY = 'app:football:v15_espn';

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
    matches: [],
    standings: {},
    leagues: ESPN_LEAGUE_CATALOG,
    lastSync: null,
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
        const parsed = JSON.parse(stored);
        setFootballData(prev => ({
          ...parsed,
          leagues: parsed.leagues?.length ? parsed.leagues : ESPN_LEAGUE_CATALOG
        }));
      } catch (e) {
        console.warn("Falha carregar cache futebol.");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FOOTBALL_STORAGE_KEY, JSON.stringify(footballData));
  }, [footballData]);

  // --- SINCRONIZAÇÃO ESPN ---
  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => ({
      ...prev,
      leagues: prev.leagues.map(l => l.id === id ? { ...l, ...config } : l)
    }));
  };

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    const activeLeagues = footballData.leagues.filter(l => l.active);
    
    if (activeLeagues.length === 0) {
      setFootballData(prev => ({ ...prev, syncStatus: 'idle' }));
      syncInProgress.current = false;
      return;
    }

    try {
      let allMatches: NormalizedESPNMatch[] = [];
      const allStandings: Record<string, NormalizedESPNStanding[]> = { ...footballData.standings };

      for (const league of activeLeagues) {
        const scoreboardData = await espnService.getScoreboard(league.slug);
        if (scoreboardData) {
          const normalized = normalizeESPNScoreboard(scoreboardData, league.slug);
          allMatches = [...allMatches, ...normalized];
        }

        if (league.useStandings) {
          const standingsData = await espnService.getStandings(league.slug);
          if (standingsData) {
            allStandings[league.slug] = normalizeESPNStandings(standingsData);
          }
        }
        
        await new Promise(r => setTimeout(r, 300));
      }

      setFootballData(prev => ({
        ...prev,
        matches: allMatches.length ? allMatches : prev.matches,
        standings: allStandings,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Futebol ESPN Atualizado!' });
    } catch (e: any) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      if (manual) toast({ variant: 'destructive', title: 'Erro na Sincronização ESPN', description: e.message });
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, footballData.standings, toast]);

  // --- BOOTSTRAP ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    const bootTimer = setTimeout(() => {
      if (navigator.onLine) {
        syncFootballAll();
      }
    }, 2000);

    return () => clearTimeout(bootTimer);
  }, [syncFootballAll]);

  const value: AppContextType = {
    user, balance, bonus, terminal, logout: () => { authLogout(); setUser(null); router.push('/'); },
    apostas,
    footballData, 
    syncFootballAll, 
    updateLeagueConfig,
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
