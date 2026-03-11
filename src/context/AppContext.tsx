/**
 * @fileOverview Contexto global otimizado para produção.
 * Gerencia autenticação, saldo, dados de futebol e estados de múltiplos módulos com proteção de hidratação.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout, getSession } from '@/utils/auth';
import { upsertUser, User } from '@/utils/usersStorage';
import { useRouter, usePathname } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService } from '@/services/livescore-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { BetPermissionService } from '@/services/bet-permission-service';
import { registerDescarga } from '@/utils/descargaStorage';
import { resolveCurrentBanca, getActiveContext } from '@/utils/bancaContext';

// --- BINGO INTERFACES ---

export interface BingoWinner {
  category: 'quadra' | 'kina' | 'keno';
  userId: string;
  userName: string;
  terminalId: string;
  winningNumbers: number[];
  winAmount: number;
  wonAt: string;
  type: 'BOT_WIN' | 'USER_WIN';
}

export interface BingoDraw {
  id: string;
  drawNumber: number;
  status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled';
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  ticketPrice: number;
  housePercent: number;
  prizeRules: {
    quadra: number;
    kina: number;
    keno: number;
  };
  drawnNumbers: number[];
  winnersFound: {
    quadra?: BingoWinner;
    kina?: BingoWinner;
    keno?: BingoWinner;
  };
  totalTickets: number;
  totalRevenue: number;
  payoutTotal: number;
  bancaId: string;
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  ticketNumbers: number[][];
  status: 'active' | 'won' | 'lost' | 'refunded';
  amountPaid: number;
  createdAt: string;
  bancaId: string;
  isBot?: boolean;
}

export interface BingoSettings {
  enabled: boolean;
  ticketPriceDefault: number;
  housePercentDefault: number;
  maxTicketsPerUserDefault: number;
  preDrawHoldSeconds: number;
  prizeDefaults: {
    quadra: number;
    kina: number;
    keno: number;
  };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: {
    everyMinutes: number;
    startHour: number;
    endHour: number;
  };
  rtpEnabled: boolean;
  rtpPercent: number;
}

export interface BingoPayout {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  type: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
}

// --- SNOOKER INTERFACES ---

export interface SnookerChannel {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  embedId: string;
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: 'scheduled' | 'imminent' | 'live' | 'finished' | 'cancelled';
  playerA: { name: string; level: number; avatarUrl?: string };
  playerB: { name: string; level: number; avatarUrl?: string };
  scoreA: number;
  scoreB: number;
  odds: { A: number; B: number; D: number };
  houseMargin: number;
  bestOf: number;
  priority: number;
  enabled: boolean;
  viewerCount?: number;
  bancaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnookerBet {
  id: string;
  userId: string;
  userName: string;
  channelId: string;
  pick: 'A' | 'B' | 'EMPATE';
  amount: number;
  oddsA: number;
  oddsB: number;
  oddsD: number;
  status: 'open' | 'won' | 'lost' | 'refunded' | 'cash_out';
  createdAt: string;
}

export interface SnookerScoreboard {
  channelId: string;
  matchTitle: string;
  playerA: { name: string; avatarUrl?: string };
  playerB: { name: string; avatarUrl?: string };
  scoreA: number;
  scoreB: number;
  statusText: string;
  frame: number;
  round: {
    number: number;
    endsAt?: string;
  };
}

export interface SnookerLiveConfig {
  enabled: boolean;
  defaultChannelId: string;
  showLiveBadge: boolean;
  betsEnabled: boolean;
  minBet: number;
  maxBet: number;
  cashOutMargin: number;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
  profanityFilterEnabled: boolean;
  topHeight: number;
  bubbleSize: number;
}

export interface SnookerFinancialSummary {
  id: string;
  channelId: string;
  channelTitle: string;
  roundNumber: number;
  totalPot: number;
  totalPayout: number;
  houseProfit: number;
  settledAt: string;
}

// --- CORE INTERFACES ---

export interface BetSlipItem {
  id: string; 
  matchId: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  pickLabel: string;
  odd: number;
  isLive: boolean;
  addedAt: number;
}

export interface FootballBet {
  id: string;
  userId: string;
  terminal: string;
  stake: number;
  potentialWin: number;
  totalOdds: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  items: BetSlipItem[];
  bancaId: string;
  isDescarga?: boolean;
}

export interface UserCommission {
  id: string;
  userId: string;
  modulo: string;
  valorAposta: number;
  valorComissao: number;
  porcentagem: number;
  createdAt: string;
  bancaId?: string;
}

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  unifiedMatches: MatchModel[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;
  refreshUser: () => void;
  footballData: FootballSyncData;
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<boolean>;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  banners: any[];
  popups: any[];
  news: any[];
  liveMiniPlayerConfig: any;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  registerCambistaMovement: (m: any) => void;
  cambistaMovements: any[];
  userCommissions: UserCommission[];
  promoterCredits: any[];
  apostas: any[];
  postedResults: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  handleFinalizarAposta: (aposta: any, totalValue: number) => string | null;
  processarResultados: (dados: any) => void;
  activeBancaId: string | null;
  
  // Bingo
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoSettings: BingoSettings | null;
  bingoPayouts: BingoPayout[];
  buyBingoTickets: (drawId: string, count: number) => boolean;
  startBingoDraw: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  cancelBingoDraw: (id: string, reason: string) => void;
  refundBingoTicket: (id: string) => void;
  updateBingoSettings: (s: BingoSettings) => void;
  createBingoDraw: (d: any) => void;
  payBingoPayout: (id: string) => void;

  // Snooker
  snookerChannels: SnookerChannel[];
  snookerBets: SnookerBet[];
  snookerPresence: Record<string, { viewers: string[] }>;
  snookerChatMessages: any[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerFinancialHistory: SnookerFinancialSummary[];
  snookerCashOutLog: any[];
  snookerScoreboards: Record<string, SnookerScoreboard>;
  snookerLiveConfig: SnookerLiveConfig | null;
  joinChannel: (cId: string, uId: string) => void;
  leaveChannel: (cId: string, uId: string) => void;
  sendSnookerChatMessage: (cId: string, text: string) => void;
  deleteSnookerChatMessage: (id: string) => void;
  sendSnookerReaction: (cId: string, reaction: string) => void;
  placeSnookerBet: (bet: any) => boolean;
  cashOutSnookerBet: (id: string) => void;
  settleSnookerRound: (cId: string, winner: 'A' | 'B' | 'EMPATE') => void;
  updateSnookerLiveConfig: (c: any) => void;
  addSnookerChannel: (c: any) => void;
  updateSnookerChannel: (c: any) => void;
  deleteSnookerChannel: (id: string) => void;
  updateSnookerScoreboard: (cId: string, s: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const syncInProgress = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballSyncData>({
    matches: [],
    unifiedMatches: [],
    standings: {},
    leagues: ESPN_LEAGUE_CATALOG,
    lastSync: null,
    syncStatus: 'idle'
  });

  const [banners, setBanners] = useState<any[]>([]);
  const [popups, setPopups] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [cambistaMovements, setCambistaMovements] = useState<any[]>([]);
  const [userCommissions, setUserCommissions] = useState<UserCommission[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);

  // Bingo State
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [bingoPayouts, setBingoPayouts] = useState<BingoPayout[]>([]);

  // Snooker State
  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<Record<string, { viewers: string[] }>>({});
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<SnookerFinancialSummary[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, SnookerScoreboard>>({});
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig | null>(null);

  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    } else {
      setUser(null);
      setBalance(0);
      setBonus(0);
      setTerminal('');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshUser();

    // Carregar dados iniciais do LocalStorage
    const loadStorage = () => {
      try {
        const fbets = localStorage.getItem('app:football_bets:v1');
        if (fbets) setFootballBets(JSON.parse(fbets));

        const savedBanners = localStorage.getItem('app:banners:v1');
        if (savedBanners) setBanners(JSON.parse(savedBanners));

        const savedPopups = localStorage.getItem('app:popups:v1');
        if (savedPopups) setPopups(JSON.parse(savedPopups));

        const savedNews = localStorage.getItem('news_messages');
        if (savedNews) setNews(JSON.parse(savedNews));

        const savedPlayer = localStorage.getItem('app:mini_player:v1');
        if (savedPlayer) setLiveMiniPlayerConfig(JSON.parse(savedPlayer));

        const savedApostas = localStorage.getItem('app:apostas:v1');
        if (savedApostas) setApostas(JSON.parse(savedApostas));

        const savedComms = localStorage.getItem('app:user_commissions:v1');
        if (savedComms) setUserCommissions(JSON.parse(savedComms));
        
        // Carregar Bingo do storage se existir
        const savedBingoDraws = localStorage.getItem('app:bingo_draws:v1');
        if (savedBingoDraws) setBingoDraws(JSON.parse(savedBingoDraws));
      } catch (e) {
        console.error("Erro ao carregar dados do storage:", e);
      }
    };

    loadStorage();
    setIsLoading(false);

    const handleAuthChange = () => refreshUser();
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [refreshUser]);

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allEspnMatches: NormalizedESPNMatch[] = [];

      for (const league of activeLeagues) {
        const scoreboard = await espnService.getScoreboard(league.slug);
        if (scoreboard) {
          allEspnMatches = [...allEspnMatches, ...normalizeESPNScoreboard(scoreboard, league.slug)];
        }
      }

      const live = await liveScoreService.getLiveMatches();
      const history = await liveScoreService.getFixtures();
      const allLiveScore = [...(live || []), ...(history || [])];

      const unified = MatchMapperService.mapEspnWithLiveScore(allEspnMatches, allLiveScore);

      setFootballData(prev => ({
        ...prev,
        matches: allEspnMatches,
        unifiedMatches: unified,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Mercado Sincronizado' });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  const placeFootballBet = async (stake: number): Promise<boolean> => {
    if (!user) { router.push('/login'); return false; }

    const permission = BetPermissionService.validate(user.tipoUsuario, balance, bonus, stake);
    if (!permission.allowed) {
      toast({ variant: 'destructive', title: 'Aposta Recusada', description: permission.reason });
      return false;
    }

    try {
      const totalOdds = betSlip.reduce((acc, item) => acc * item.odd, 1);
      const potentialWin = stake * totalOdds;
      const bancaId = user.bancaId || 'default';

      const newBet: FootballBet = {
        id: `fb-${Date.now()}`,
        userId: user.id,
        terminal: user.terminal,
        stake,
        totalOdds,
        potentialWin,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        items: [...betSlip],
        bancaId
      };

      const updatedBets = [newBet, ...footballBets];
      setFootballBets(updatedBets);
      localStorage.setItem('app:football_bets:v1', JSON.stringify(updatedBets));

      if (user.tipoUsuario !== 'CAMBISTA') {
        const newBalance = balance - stake;
        setBalance(newBalance);
        upsertUser({ terminal: user.terminal, saldo: newBalance });
      }

      setBetSlip([]);
      setCelebrationTrigger(true);
      toast({ title: 'Aposta Confirmada! ⚽' });
      return true;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao processar aposta' });
      return false;
    }
  };

  const logout = () => { authLogout(); setUser(null); setBalance(0); router.push('/'); };
  const toggleFullscreen = () => { 
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  const handleFinalizarAposta = (aposta: any, totalValue: number) => {
    const newAposta = { ...aposta, id: `ap-${Date.now()}`, userId: user?.id, status: 'aguardando', createdAt: new Date().toISOString() };
    const updated = [newAposta, ...apostas];
    setApostas(updated);
    localStorage.setItem('app:apostas:v1', JSON.stringify(updated));
    return newAposta.id;
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance, bonus, terminal, logout, refreshUser,
      footballData, footballBets, betSlip, 
      addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet, syncFootballAll, 
      updateLeagueConfig: (id, cfg) => setFootballData(prev => ({ ...prev, leagues: prev.leagues.map(l => l.id === id ? { ...l, ...cfg } : l) })),
      banners, popups, news, liveMiniPlayerConfig, isFullscreen, toggleFullscreen,
      celebrationTrigger, clearCelebration: () => setCelebrationTrigger(false),
      soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled),
      registerCambistaMovement: (m) => setCambistaMovements(prev => [m, ...prev]),
      cambistaMovements, userCommissions, promoterCredits, apostas, postedResults, 
      jdbLoterias, genericLotteryConfigs, handleFinalizarAposta, 
      processarResultados: () => {},
      activeBancaId: user?.bancaId || null,
      
      // Bingo Default Implementation
      bingoDraws,
      bingoTickets,
      bingoSettings,
      bingoPayouts,
      buyBingoTickets: () => true,
      startBingoDraw: () => {},
      finishBingoDraw: () => {},
      cancelBingoDraw: () => {},
      refundBingoTicket: () => {},
      updateBingoSettings: (s) => setBingoSettings(s),
      createBingoDraw: () => {},
      payBingoPayout: () => {},

      // Snooker Default Implementation
      snookerChannels,
      snookerBets,
      snookerPresence,
      snookerChatMessages,
      snookerBetsFeed,
      snookerActivityFeed,
      snookerFinancialHistory,
      snookerCashOutLog,
      snookerScoreboards,
      snookerLiveConfig,
      joinChannel: () => {},
      leaveChannel: () => {},
      sendSnookerChatMessage: () => {},
      deleteSnookerChatMessage: () => {},
      sendSnookerReaction: () => {},
      placeSnookerBet: () => true,
      cashOutSnookerBet: () => {},
      settleSnookerRound: () => {},
      updateSnookerLiveConfig: (c) => setSnookerLiveConfig(c),
      addSnookerChannel: () => {},
      updateSnookerChannel: () => {},
      deleteSnookerChannel: () => {},
      updateSnookerScoreboard: () => {}
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
