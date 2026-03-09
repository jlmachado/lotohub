/**
 * @fileOverview Contexto global padronizado para uso EXCLUSIVO da TheSportsDB no futebol.
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
  fetchBrazilianLeagues,
  syncFootballMatches as syncMatchesAction,
  syncFootballStandings as syncStandingsAction,
  getSPDate
} from '@/services/football-sync-service';

export interface FootballSyncData {
  todayMatches: NormalizedMatch[];
  nextMatches: NormalizedMatch[];
  pastMatches: NormalizedMatch[];
  standings: NormalizedStanding[];
  leagues: NormalizedLeague[];
  lastSync: string | null;
  lastSuccessfulSync: string | null;
  nextScheduledSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

export interface NewsMessage { id: string; text: string; active: boolean; order: number; }
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  apostas: any[];
  depositos: any[];
  saques: any[];
  
  footballData: FootballSyncData;
  updateFootballLeagues: (leagues: NormalizedLeague[]) => void;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  syncFootballMatches: () => Promise<void>;
  syncFootballStandings: () => Promise<void>;
  
  cambistaMovements: any[];
  registerCambistaMovement: (movement: any) => void;
  userCommissions: any[];
  promoterCredits: any[];
  
  news: NewsMessage[];
  addNews: (n: any) => void;
  updateNews: (n: any) => void;
  deleteNews: (id: string) => void;
  banners: Banner[];
  addBanner: (b: any) => void;
  updateBanner: (b: any) => void;
  deleteBanner: (id: string) => void;
  popups: Popup[];
  addPopup: (p: any) => void;
  updatePopup: (p: any) => void;
  deletePopup: (id: string) => void;
  jdbLoterias: any[];
  addJDBLoteria: (l: any) => void;
  updateJDBLoteria: (l: any) => void;
  deleteJDBLoteria: (id: string) => void;
  postedResults: any[];
  processarResultados: (res: any) => void;
  genericLotteryConfigs: any[];
  updateGenericLottery: (c: any) => void;
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
    leagues: [],
    lastSync: null,
    lastSuccessfulSync: null,
    nextScheduledSync: null,
    syncStatus: 'idle'
  });

  const [apostas, setApostas] = useState<any[]>([]);
  const [cambistaMovements, setCambistaMovements] = useState<any[]>([]);
  const [userCommissions, setUserCommissions] = useState<any[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  
  const [casinoSettings, setCasinoSettings] = useState<any>({ casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está aqui!' });
  const [bingoSettings, setBingoSettings] = useState<any>({ enabled: true, rtpEnabled: false, rtpPercent: 10, ticketPriceDefault: 0.3, housePercentDefault: 10, maxTicketsPerUserDefault: 100, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual', autoSchedule: { everyMinutes: 5, startHour: 8, endHour: 23 } });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedFootball = localStorage.getItem('app:football:v6');
    if (storedFootball) setFootballData(JSON.parse(storedFootball));

    const refreshSession = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setBalance(currentUser.saldo || 0);
        setBonus(currentUser.bonus || 0);
        setTerminal(currentUser.terminal || '');
      }
    };
    refreshSession();
    window.addEventListener('auth-change', refreshSession);
    return () => window.removeEventListener('auth-change', refreshSession);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('app:football:v6', JSON.stringify(footballData));
  }, [footballData]);

  const updateFootballLeagues = (leagues: NormalizedLeague[]) => {
    setFootballData(prev => ({ ...prev, leagues }));
  };

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;

    setFootballData(prev => ({ ...prev, syncStatus: 'syncing', lastSync: new Date().toISOString() }));
    
    try {
      let currentLeagues = footballData.leagues;
      if (currentLeagues.length === 0) {
        currentLeagues = await fetchBrazilianLeagues();
      }

      const activeLeagueIds = currentLeagues.filter(l => l.importar).map(l => l.id);
      
      if (activeLeagueIds.length === 0) {
        setFootballData(prev => ({ ...prev, leagues: currentLeagues, syncStatus: 'idle' }));
        syncInProgress.current = false;
        return;
      }

      const [matches, standings] = await Promise.all([
        syncMatchesAction(activeLeagueIds),
        syncStandingsAction(activeLeagueIds)
      ]);

      setFootballData(prev => ({
        leagues: currentLeagues,
        todayMatches: matches.today.length > 0 ? matches.today : prev.todayMatches,
        nextMatches: matches.next.length > 0 ? matches.next : prev.nextMatches,
        pastMatches: matches.past.length > 0 ? matches.past : prev.pastMatches,
        standings: standings.length > 0 ? standings : prev.standings,
        lastSync: new Date().toISOString(),
        lastSuccessfulSync: new Date().toISOString(),
        nextScheduledSync: null,
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Sincronização Concluída', description: 'Dados da TheSportsDB atualizados.' });
    } catch (e) {
      console.error("[Football] Erro de sincronização:", e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  useEffect(() => {
    const runAutoSync = () => {
      const now = new Date();
      const hour = now.getHours();
      const intervalMinutes = (hour >= 8) ? 15 : 60;
      const last = footballData.lastSuccessfulSync ? new Date(footballData.lastSuccessfulSync) : new Date(0);
      const diffMin = (now.getTime() - last.getTime()) / (1000 * 60);

      if (diffMin >= intervalMinutes || footballData.leagues.length === 0) {
        syncFootballAll();
      }
    };

    const bootTimer = setTimeout(runAutoSync, 2000);
    const interval = setInterval(runAutoSync, 60000 * 5);
    return () => { clearTimeout(bootTimer); clearInterval(interval); };
  }, [syncFootballAll, footballData.lastSuccessfulSync, footballData.leagues.length]);

  const value: AppContextType = {
    user, balance, bonus, terminal, logout: () => { logout(); setUser(null); router.push('/'); },
    apostas, depositos: [], saques: [],
    footballData, updateFootballLeagues, syncFootballAll,
    syncFootballMatches: () => syncFootballAll(true),
    syncFootballStandings: () => syncFootballAll(true),
    cambistaMovements, registerCambistaMovement: () => {},
    userCommissions, promoterCredits,
    news, addNews: (n) => setNews([...news, n]), updateNews: (n) => setNews(news.map(x => x.id === n.id ? n : x)), deleteNews: (id) => setNews(news.filter(x => x.id !== id)),
    banners, addBanner: (b) => setBanners([...banners, b]), updateBanner: (b) => setBanners(banners.map(x => x.id === b.id ? b : x)), deleteBanner: (id) => setBanners(banners.filter(x => x.id !== id)),
    popups, addPopup: (p) => setPopups([...popups, p]), updatePopup: (p) => setPopups(popups.map(x => x.id === p.id ? p : x)), deletePopup: (id) => setPopups(popups.filter(x => x.id !== id)),
    jdbLoterias, addJDBLoteria: (l) => setJdbLoterias([...jdbLoterias, l]), updateJDBLoteria: (l) => setJdbLoterias(jdbLoterias.map(x => x.id === l.id ? l : x)), deleteJDBLoteria: (id) => setJdbLoterias(jdbLoterias.filter(x => x.id !== id)),
    postedResults, processarResultados: (res) => setPostedResults([res, ...postedResults]),
    genericLotteryConfigs, updateGenericLottery: (c) => setGenericLotteryConfigs(genericLotteryConfigs.map(x => x.id === c.id ? c : x)),
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
