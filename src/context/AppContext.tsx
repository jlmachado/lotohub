/**
 * @fileOverview Contexto global gerenciando a arquitetura híbrida de Futebol e Apostas,
 * além de todos os módulos de jogos, administrativo e caixa.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { upsertUser } from '@/utils/usersStorage';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService, LiveScoreMatch } from '@/services/livescore-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { generatePoule } from '@/utils/generatePoule';

// --- TYPES ---

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
  liveMatches: LiveScoreMatch[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

export interface FootballBet {
  id: string;
  userId: string;
  terminal: string;
  items: BetSlipItem[];
  stake: number;
  totalOdds: number;
  potentialWin: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  bancaId: string;
}

export interface Banner { id: string; title: string; content?: string; imageUrl: string; linkUrl?: string; position: number; active: boolean; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description?: string; imageUrl?: string; linkUrl?: string; buttonText?: string; active: boolean; priority: number; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface BingoSettings {
  enabled: boolean;
  rtpEnabled: boolean;
  rtpPercent: number;
  ticketPriceDefault: number;
  housePercentDefault: number;
  maxTicketsPerUserDefault: number;
  preDrawHoldSeconds: number;
  prizeDefaults: { quadra: number; kina: number; keno: number };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: { everyMinutes: number; startHour: number; endHour: number };
}

export interface CambistaMovement {
  id: string;
  userId: string;
  terminal: string;
  tipo: 'APOSTA' | 'PREMIO_PAGO' | 'ENTRADA_MANUAL' | 'RECOLHE' | 'FECHAMENTO_CAIXA';
  valor: number;
  modulo?: string;
  observacao: string;
  createdAt: string;
}

export interface UserCommission {
  id: string;
  userId: string;
  modulo: string;
  valorAposta: number;
  valorComissao: number;
  porcentagem: number;
  createdAt: string;
}

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  // UI/General
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  liveMiniPlayerConfig: any;
  updateLiveMiniPlayerConfig: (config: any) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Football & Betting
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => boolean;
  footballData: FootballSyncData;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  
  // Bingo
  bingoSettings: BingoSettings | null;
  updateBingoSettings: (s: BingoSettings) => void;
  bingoDraws: any[];
  bingoTickets: any[];
  buyBingoTickets: (drawId: string, count: number) => boolean;
  startBingoDraw: (id: string) => void;

  // Sinuca
  snookerChannels: any[];
  snookerBets: any[];
  snookerPresence: any;
  snookerScoreboards: any;
  snookerChatMessages: any[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerFinancialHistory: any[];
  snookerCashOutLog: any[];
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  placeSnookerBet: (bet: any) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  joinChannel: (id: string, uid: string) => void;
  leaveChannel: (id: string, uid: string) => void;
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;

  // Loterias
  apostas: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  handleFinalizarAposta: (a: any, v: number) => string | null;
  depositos: any[];
  saques: any[];

  // Cambista & Promotor
  cambistaMovements: CambistaMovement[];
  registerCambistaMovement: (m: Omit<CambistaMovement, 'id' | 'createdAt'>) => void;
  userCommissions: UserCommission[];
  promoterCredits: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  // Core User State
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Football State
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballSyncData>({
    matches: [],
    standings: {},
    leagues: ESPN_LEAGUE_CATALOG,
    liveMatches: [],
    lastSync: null,
    syncStatus: 'idle'
  });

  // UI States
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);

  // Modules States
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [bingoDraws, setBingoDraws] = useState<any[]>([]);
  const [bingoTickets, setBingoTickets] = useState<any[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [snookerScoreboards, setSnookerScoreboards] = useState<any>({});
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<any[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [saques, setSaques] = useState<any[]>([]);

  // Cambista & Promotor States
  const [cambistaMovements, setCambistaMovements] = useState<CambistaMovement[]>([]);
  const [userCommissions, setUserCommissions] = useState<UserCommission[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    // Load common UI data
    const savedBanners = localStorage.getItem('app:banners:v1');
    if (savedBanners) setBanners(JSON.parse(savedBanners));

    const savedPopups = localStorage.getItem('app:popups:v1');
    if (savedPopups) setPopups(JSON.parse(savedPopups));

    const savedNews = localStorage.getItem('news_messages');
    if (savedNews) setNews(JSON.parse(savedNews));

    const savedPlayer = localStorage.getItem('app:mini_player:v1');
    if (savedPlayer) setLiveMiniPlayerConfig(JSON.parse(savedPlayer));

    // Load Football data
    const savedFootballBets = localStorage.getItem('app:football_bets:v1');
    if (savedFootballBets) setFootballBets(JSON.parse(savedFootballBets));

    const savedLeagues = localStorage.getItem('app:football_leagues:v1');
    if (savedLeagues) {
      try {
        const parsed = JSON.parse(savedLeagues);
        setFootballData(prev => ({ ...prev, leagues: parsed }));
      } catch (e) {
        console.error("Erro ao carregar ligas salvas", e);
      }
    }

    // Load Lottery & Financial data
    const savedApostas = localStorage.getItem('apostas');
    if (savedApostas) setApostas(JSON.parse(savedApostas));

    const savedDepositos = localStorage.getItem('depositos');
    if (savedDepositos) setDepositos(JSON.parse(savedDepositos));

    const savedSaques = localStorage.getItem('saques');
    if (savedSaques) setSaques(JSON.parse(savedSaques));

    // Load Cambista & Promotor data
    const savedMovements = localStorage.getItem('app:cambista_movements:v1');
    if (savedMovements) setCambistaMovements(JSON.parse(savedMovements));

    const savedCommissions = localStorage.getItem('app:user_commissions:v1');
    if (savedCommissions) setUserCommissions(JSON.parse(savedCommissions));

    const savedCredits = localStorage.getItem('app:promoter_creditos:v1');
    if (savedCredits) setPromoterCredits(JSON.parse(savedCredits));

    // Iniciar sync de futebol
    syncFootballAll();
  }, []);

  // --- SYNC ENGINE ---
  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allMatches: NormalizedESPNMatch[] = [];
      const allStandings: Record<string, NormalizedESPNStanding[]> = {};

      for (const league of activeLeagues) {
        const scoreboard = await espnService.getScoreboard(league.slug);
        if (scoreboard) {
          const normalized = normalizeESPNScoreboard(scoreboard, league.slug);
          allMatches = [...allMatches, ...normalized];
        }
        
        if (league.useStandings) {
          const table = await espnService.getStandings(league.slug);
          if (table) {
            allStandings[league.slug] = normalizeESPNStandings(table);
          }
        }
      }

      const live = await liveScoreService.getLiveMatches();

      setFootballData(prev => ({
        ...prev,
        matches: allMatches,
        standings: allStandings,
        liveMatches: live,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Futebol Atualizado!', description: 'Dados sincronizados com sucesso.' });
    } catch (e: any) {
      console.error("[Football Sync Error]", e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      if (manual) toast({ variant: 'destructive', title: 'Erro na Sincronização' });
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => {
      const updatedLeagues = prev.leagues.map(l => 
        l.id === id ? { ...l, ...config } : l
      );
      localStorage.setItem('app:football_leagues:v1', JSON.stringify(updatedLeagues));
      return { ...prev, leagues: updatedLeagues };
    });
  };

  // --- UI ACTIONS ---
  const updateLiveMiniPlayerConfig = (config: any) => {
    setLiveMiniPlayerConfig(config);
    localStorage.setItem('app:mini_player:v1', JSON.stringify(config));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // --- BETTING ACTIONS ---
  const addBetToSlip = (bet: BetSlipItem) => {
    if (betSlip.some(item => item.matchId === bet.matchId)) {
      setBetSlip(prev => prev.map(item => item.matchId === bet.matchId ? bet : item));
    } else {
      setBetSlip(prev => [...prev, bet]);
    }
    toast({ title: 'Adicionado ao bilhete', description: `${bet.matchName}: ${bet.selection}` });
  };

  const removeBetFromSlip = (id: string) => {
    setBetSlip(prev => prev.filter(item => item.id !== id));
  };

  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = (stake: number): boolean => {
    if (!user) {
      router.push('/login');
      return false;
    }

    if (balance < stake) {
      toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'Você não possui saldo para esta aposta.' });
      return false;
    }

    const totalOdds = calculateTotalOdds(betSlip);
    const potentialWin = stake * totalOdds;

    const newBet: FootballBet = {
      id: `bet-fb-${Date.now()}`,
      userId: user.id,
      terminal: user.terminal,
      items: [...betSlip],
      stake,
      totalOdds,
      potentialWin,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      bancaId: user.bancaId || 'default'
    };

    const updatedBets = [newBet, ...footballBets];
    setFootballBets(updatedBets);
    localStorage.setItem('app:football_bets:v1', JSON.stringify(updatedBets));

    const newBalance = balance - stake;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });

    clearBetSlip();
    toast({ title: 'Aposta Realizada!', description: `Bilhete ${newBet.id.substring(0, 8)} confirmado.` });
    return true;
  };

  // --- CAMBISTA ACTIONS ---
  const registerCambistaMovement = (movement: Omit<CambistaMovement, 'id' | 'createdAt'>) => {
    const newMovement: CambistaMovement = {
      ...movement,
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newMovement, ...cambistaMovements];
    setCambistaMovements(updated);
    localStorage.setItem('app:cambista_movements:v1', JSON.stringify(updated));
  };

  // --- LOTTERY ACTIONS ---
  const handleFinalizarAposta = (a: any, v: number) => {
    if (!user) return null;
    const poule = generatePoule();
    const newAposta = { 
      ...a, 
      id: poule, 
      userId: user.id, 
      status: 'aguardando', 
      createdAt: new Date().toISOString(), 
      bancaId: user.bancaId || 'default' 
    };
    const newList = [newAposta, ...apostas];
    setApostas(newList);
    localStorage.setItem('apostas', JSON.stringify(newList));
    
    const newBalance = balance - v;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    
    return poule;
  };

  // --- LOGOUT ---
  const logout = () => {
    authLogout();
    setUser(null);
    setBalance(0);
    setTerminal('');
    router.push('/');
  };

  // --- STUBS FOR OTHER MODULES ---
  const clearCelebration = () => setCelebrationTrigger(false);
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const buyBingoTickets = () => true;
  const startBingoDraw = () => {};
  const updateBingoSettings = () => {};
  const sendSnookerChatMessage = () => {};
  const sendSnookerReaction = () => {};
  const placeSnookerBet = () => true;
  const cashOutSnookerBet = () => {};
  const joinChannel = () => {};
  const leaveChannel = () => {};

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout,
      banners, popups, news, liveMiniPlayerConfig, updateLiveMiniPlayerConfig,
      isFullscreen, toggleFullscreen,
      footballBets, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      footballData, syncFootballAll, updateLeagueConfig,
      bingoSettings, updateBingoSettings, bingoDraws, bingoTickets, buyBingoTickets, startBingoDraw,
      snookerChannels, snookerBets, snookerPresence, snookerScoreboards, snookerChatMessages,
      snookerBetsFeed, snookerActivityFeed, snookerFinancialHistory, snookerCashOutLog,
      sendSnookerChatMessage, sendSnookerReaction, placeSnookerBet, cashOutSnookerBet,
      joinChannel, leaveChannel, celebrationTrigger, clearCelebration, soundEnabled, toggleSound,
      apostas, jdbLoterias, genericLotteryConfigs, handleFinalizarAposta,
      depositos, saques,
      cambistaMovements, registerCambistaMovement, userCommissions, promoterCredits
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
