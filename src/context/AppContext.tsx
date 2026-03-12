'use client';

/**
 * @fileOverview AppContext - Orquestrador Central Síncrono (Master).
 * Integração plena dos módulos de Sinuca, Futebol, Bingo e Loterias com persistência local.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { getUserByTerminal, upsertUser, getUsers } from '@/utils/usersStorage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { ESPN_LEAGUE_CATALOG } from '@/utils/espn-league-catalog';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { MatchMapperService } from '@/services/match-mapper-service';
import { filterProfanity } from '@/utils/profanity-filter';
import { formatBRL } from '@/utils/currency';

// --- INTERFACES GERAIS ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface Aposta {
  id: string;
  loteria: string;
  concurso: string;
  data: string;
  valor: string;
  numeros: string;
  status: 'aguardando' | 'premiado' | 'perdeu' | 'won' | 'lost';
  detalhes?: any[];
  userId: string;
  bancaId: string;
  createdAt: string;
}

export interface FootballBet {
  id: string;
  userId: string;
  bancaId: string;
  terminal: string;
  stake: number;
  potentialWin: number;
  items: any[];
  status: 'OPEN' | 'WON' | 'LOST';
  createdAt: string;
  isDescarga?: boolean;
}

export interface FootballData {
  leagues: any[];
  matches: any[];
  unifiedMatches: any[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncAt: string | null;
}

export interface LiveMiniPlayerConfig {
  enabled: boolean;
  youtubeUrl: string;
  youtubeEmbedId: string;
  title: string;
  autoShow: boolean;
  defaultState: 'open' | 'minimized';
  showOnHome: boolean;
  showOnSinuca: boolean;
  topHeight: number;
  bubbleSize: number;
}

// --- INTERFACES BINGO ---
export interface BingoSettings {
  enabled: boolean;
  rtpEnabled: boolean;
  rtpPercent: number;
  ticketPriceDefault: number;
  maxTicketsPerUserDefault: number;
  housePercentDefault: number;
  preDrawHoldSeconds: number;
  prizeDefaults: { quadra: number; kina: number; keno: number; };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: { everyMinutes: number; startHour: number; endHour: number; };
}

export interface BingoWinner {
  category: 'quadra' | 'kina' | 'keno';
  userId: string;
  userName: string;
  terminalId: string;
  winAmount: number;
  winningNumbers: number[];
  wonAt: string;
  type: 'USER_WIN' | 'BOT_WIN';
}

export interface BingoDraw {
  id: string;
  drawNumber: number;
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled';
  ticketPrice: number;
  prizeRules: { quadra: number; kina: number; keno: number; };
  housePercent: number;
  totalRevenue: number;
  payoutTotal: number;
  drawnNumbers: number[];
  winnersFound: { quadra?: BingoWinner; kina?: BingoWinner; keno?: BingoWinner; };
  totalTickets: number;
  bancaId: string;
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  amountPaid: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  ticketNumbers: number[][];
  createdAt: string;
  bancaId: string;
  isBot?: boolean;
}

export interface BingoPayout {
  id: string;
  drawId: string;
  userId: string;
  amount: number;
  type: 'quadra' | 'kina' | 'keno';
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
}

// --- INTERFACES SINUCA ---
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

export interface SnookerFinancialSummary {
  id: string;
  channelId: string;
  channelTitle: string;
  totalPot: number;
  totalPayout: number;
  houseProfit: number;
  settledAt: string;
  roundNumber?: number;
}

export interface SnookerLiveConfig {
  defaultChannelId: string;
  showLiveBadge: boolean;
  betsEnabled: boolean;
  minBet: number;
  maxBet: number;
  cashOutMargin: number;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
  profanityFilterEnabled: boolean;
  updatedAt: string;
}

export interface SnookerChatMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  role: 'user' | 'admin';
  deleted?: boolean;
}

export interface SnookerScoreboard {
  matchTitle: string;
  playerA: { name: string; score: number };
  playerB: { name: string; score: number };
  scoreA: number;
  scoreB: number;
  statusText: string;
  frame: number;
  round: { number: number; endsAt?: string };
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  activeBancaId: string;
  ledger: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  apostas: Aposta[];
  postedResults: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  
  // Bingo
  bingoSettings: BingoSettings;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoPayouts: BingoPayout[];
  
  // Sinuca
  snookerChannels: SnookerChannel[];
  snookerPresence: Record<string, { viewers: string[] }>;
  snookerFinancialHistory: SnookerFinancialSummary[];
  snookerBets: SnookerBet[];
  snookerCashOutLog: any[];
  snookerLiveConfig: SnookerLiveConfig;
  snookerActivityFeed: any[];
  snookerBetsFeed: any[];
  snookerChatMessages: SnookerChatMessage[];
  snookerScoreboards: Record<string, SnookerScoreboard>;
  celebrationTrigger: boolean;

  // Futebol
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: any[];
  
  // UI
  liveMiniPlayerConfig: LiveMiniPlayerConfig;
  isFullscreen: boolean;

  // Métodos
  refreshData: () => void;
  logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null;
  processarResultados: (dados: any) => void;
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: any) => void;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  toggleFullscreen: () => void;

  // Bingo Methods
  updateBingoSettings: (s: BingoSettings) => void;
  createBingoDraw: (d: Partial<BingoDraw>) => void;
  startBingoDraw: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  cancelBingoDraw: (id: string, reason: string) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  refundBingoTicket: (id: string) => void;
  payBingoPayout: (id: string) => void;

  // Sinuca Methods
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
  placeSnookerBet: (bet: any) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  deleteSnookerChatMessage: (id: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  updateSnookerLiveConfig: (c: any) => void;
  updateSnookerScoreboard: (id: string, s: any) => void;
  addSnookerChannel: (c: any) => void;
  updateSnookerChannel: (c: any) => void;
  deleteSnookerChannel: (id: string) => void;
  settleSnookerRound: (channelId: string, winner: string) => void;
  clearCelebration: () => void;

  // Admin Methods
  addBanner: (b: Banner) => void;
  updateBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  addPopup: (p: Popup) => void;
  updatePopup: (p: Popup) => void;
  deletePopup: (id: string) => void;
  addNews: (m: NewsMessage) => void;
  updateNews: (m: NewsMessage) => void;
  deleteNews: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Defaults
const DEFAULT_BINGO_SETTINGS: BingoSettings = {
  enabled: true, rtpEnabled: false, rtpPercent: 20, ticketPriceDefault: 0.3,
  maxTicketsPerUserDefault: 500, housePercentDefault: 10, preDrawHoldSeconds: 10,
  prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual',
  autoSchedule: { everyMinutes: 3, startHour: 8, endHour: 23 }
};

const DEFAULT_PLAYER_CONFIG: LiveMiniPlayerConfig = {
  enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
  autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
  topHeight: 96, bubbleSize: 62
};

const DEFAULT_SNOOKER_CFG: SnookerLiveConfig = {
  defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 5, maxBet: 1000,
  cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true,
  updatedAt: new Date().toISOString()
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  
  const [bingoSettings, setBingoSettings] = useState<BingoSettings>(DEFAULT_BINGO_SETTINGS);
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoPayouts, setBingoPayouts] = useState<BingoPayout[]>([]);

  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<Record<string, { viewers: string[] }>>({});
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<SnookerFinancialSummary[]>([]);
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig>(DEFAULT_SNOOKER_CFG);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerChatMessages, setSnookerChatMessages] = useState<SnookerChatMessage[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, SnookerScoreboard>>({});
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: [], matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });

  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>(DEFAULT_PLAYER_CONFIG);

  const loadLocalData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const session = getSession();
    if (session) {
      const u = getUserByTerminal(session.terminal);
      setUser(u);
      if (u) setLedger(LedgerService.getByUser(u.id));
    } else {
      setUser(null);
      setLedger([]);
    }

    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    setApostas(getStorageItem('app:apostas:v1', []));
    setPostedResults(getStorageItem('app:posted_results:v1', []));
    setFootballBets(getStorageItem('app:football_bets:v1', []));
    setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES));
    
    setBingoSettings(getStorageItem('app:bingo_settings:v1', DEFAULT_BINGO_SETTINGS));
    setBingoDraws(getStorageItem('app:bingo_draws:v1', []));
    setBingoTickets(getStorageItem('app:bingo_tickets:v1', []));
    setBingoPayouts(getStorageItem('app:bingo_payouts:v1', []));

    setSnookerChannels(getStorageItem('app:snooker_channels:v1', []));
    setSnookerFinancialHistory(getStorageItem('app:snooker_history:v1', []));
    setSnookerBets(getStorageItem('app:snooker_bets:v1', []));
    setSnookerCashOutLog(getStorageItem('app:snooker_cashout:v1', []));
    setSnookerLiveConfig(getStorageItem('app:snooker_cfg:v1', DEFAULT_SNOOKER_CFG));
    setSnookerChatMessages(getStorageItem('app:snooker_chat:v1', []));
    setSnookerScoreboards(getStorageItem('app:snooker_scores:v1', {}));
    setSnookerBetsFeed(getStorageItem('app:snooker_bets_feed:v1', []));
    setSnookerActivityFeed(getStorageItem('app:snooker_activity_feed:v1', []));

    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', DEFAULT_PLAYER_CONFIG));

    const savedFootball = getStorageItem('app:football:unified:v1', null);
    if (savedFootball) {
      setFootballData(prev => ({ ...prev, ...savedFootball }));
    } else {
      setFootballData(prev => ({ ...prev, leagues: ESPN_LEAGUE_CATALOG }));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadLocalData();
    setIsLoading(false);

    const handleDataChange = () => loadLocalData();
    window.addEventListener('app:data-changed', handleDataChange);
    window.addEventListener('auth-change', handleDataChange);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChange);
      window.removeEventListener('auth-change', handleDataChange);
    };
  }, [loadLocalData]);

  const notify = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app:data-changed'));
    }
  }, []);

  const logout = useCallback(() => { authLogout(); setUser(null); notify(); router.push('/login'); }, [notify, router]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // --- SINUCA METHODS ---
  const joinChannel = useCallback((channelId: string, userId: string) => {
    setSnookerPresence(prev => {
      const current = prev[channelId]?.viewers || [];
      if (current.includes(userId)) return prev;
      return { ...prev, [channelId]: { viewers: [...current, userId] } };
    });
  }, []);

  const leaveChannel = useCallback((channelId: string, userId: string) => {
    setSnookerPresence(prev => {
      const current = prev[channelId]?.viewers || [];
      return { ...prev, [channelId]: { viewers: current.filter(id => id !== userId) } };
    });
  }, []);

  const placeSnookerBet = useCallback((bet: any) => {
    if (!user) { toast({ variant: 'destructive', title: 'Login necessário', description: 'Você precisa estar logado para apostar.' }); return false; }
    
    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Sinuca', valor: bet.amount, retornoPotencial: 0,
      descricao: `Sinuca: Aposta em ${bet.pick}`, referenceId: `sno-${bet.channelId}-${Date.now()}`
    });

    if (result.success) {
      const newBet: SnookerBet = {
        ...bet, id: `bet-sno-${Date.now()}`, userId: user.id, userName: user.nome || 'Usuário',
        status: 'open', createdAt: new Date().toISOString()
      };
      
      const currentBets = getStorageItem<SnookerBet[]>('app:snooker_bets:v1', []);
      const items = [newBet, ...currentBets];
      setStorageItem('app:snooker_bets:v1', items);
      
      // Update Feed
      const feedItem = {
        id: `feed-${Date.now()}`,
        channelId: bet.channelId,
        userId: user.id,
        userName: user.nome || 'Alguém',
        text: `apostou R$ ${bet.amount.toFixed(2)} em ${bet.pick}`,
        createdAt: new Date().toISOString()
      };
      const currentFeed = getStorageItem<any[]>('app:snooker_bets_feed:v1', []);
      const updatedFeed = [feedItem, ...currentFeed].slice(0, 50);
      setStorageItem('app:snooker_bets_feed:v1', updatedFeed);
      
      notify();
      return true;
    }
    return false;
  }, [user, notify, toast]);

  const cashOutSnookerBet = useCallback((betId: string) => {
    if (!user) return;
    const currentBets = getStorageItem<SnookerBet[]>('app:snooker_bets:v1', []);
    const bet = currentBets.find(b => b.id === betId);
    if (!bet || bet.status !== 'open') return;

    const currentChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const channel = currentChannels.find(c => c.id === bet.channelId);
    if (!channel) return;

    // Cálculo manual
    const oddsMap = { A: channel.odds.A, B: channel.odds.B, EMPATE: channel.odds.D };
    const currentOdd = oddsMap[bet.pick];
    const originalOdd = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD }[bet.pick];
    const potentialPayout = bet.amount * originalOdd;
    const fairValue = potentialPayout / currentOdd;
    const margin = (snookerLiveConfig.cashOutMargin || 8) / 100;
    const cashOutValue = Math.max(0.01, fairValue * (1 - margin));

    // 1. Atualizar Saldo
    const u = getUserByTerminal(user.terminal);
    if (u) {
      const newBal = u.saldo + cashOutValue;
      upsertUser({ terminal: u.terminal, saldo: newBal });
      
      // 2. Registrar Ledger
      LedgerService.addEntry({
        bancaId: u.bancaId || 'default', userId: u.id, terminal: u.terminal,
        tipoUsuario: u.tipoUsuario, modulo: 'Sinuca', type: 'CASH_OUT_RECOLHE',
        amount: cashOutValue, balanceBefore: u.saldo, balanceAfter: newBal,
        referenceId: betId, description: `Cash Out Sinuca: ${bet.pick} (Original R$ ${bet.amount.toFixed(2)})`
      });
    }

    // 3. Registrar Log de Cash Out
    const logEntry = {
      id: `co-${Date.now()}`,
      userId: user.id,
      userName: user.nome || 'Usuário',
      channelId: bet.channelId,
      channelTitle: channel.title,
      originalAmount: bet.amount,
      originalOdd,
      cashOutOdd: currentOdd,
      cashOutAmount: cashOutValue,
      houseProfit: bet.amount - cashOutValue,
      createdAt: new Date().toISOString()
    };
    const currentLogs = getStorageItem<any[]>('app:snooker_cashout:v1', []);
    setStorageItem('app:snooker_cashout:v1', [logEntry, ...currentLogs]);

    // 4. Atualizar Aposta
    const updatedBets = currentBets.map(b => b.id === betId ? { ...b, status: 'cash_out' as const } : b);
    setStorageItem('app:snooker_bets:v1', updatedBets);
    
    toast({ title: 'Cash Out Concluído', description: `R$ ${cashOutValue.toFixed(2)} creditados em seu saldo.` });
    notify();
  }, [user, snookerLiveConfig, notify, toast]);

  const sendSnookerChatMessage = useCallback((channelId: string, text: string) => {
    if (!user) return;
    
    let filteredText = text;
    if (snookerLiveConfig.profanityFilterEnabled) {
      filteredText = filterProfanity(text);
    }

    const newMessage: SnookerChatMessage = {
      id: `msg-${Date.now()}`, channelId, userId: user.id, userName: user.nome || 'Usuário',
      text: filteredText, createdAt: new Date().toISOString(), role: ['ADMIN', 'SUPER_ADMIN'].includes(user.tipoUsuario) ? 'admin' : 'user'
    };
    const currentMsgs = getStorageItem<SnookerChatMessage[]>('app:snooker_chat:v1', []);
    const items = [newMessage, ...currentMsgs].slice(0, 100);
    setStorageItem('app:snooker_chat:v1', items);
    notify();
  }, [user, snookerLiveConfig, notify]);

  const deleteSnookerChatMessage = useCallback((id: string) => {
    const current = getStorageItem<SnookerChatMessage[]>('app:snooker_chat:v1', []);
    const updated = current.map(m => m.id === id ? { ...m, deleted: true } : m);
    setStorageItem('app:snooker_chat:v1', updated);
    notify();
  }, [notify]);

  const sendSnookerReaction = useCallback((channelId: string, reaction: string) => {
    if (!user) return;
    const text = `${user.nome || 'Alguém'} reagiu com ${reaction}`;
    const entry = { id: Date.now(), channelId, text, createdAt: new Date().toISOString() };
    const currentFeed = getStorageItem<any[]>('app:snooker_activity_feed:v1', []);
    const items = [entry, ...currentFeed].slice(0, 50);
    setStorageItem('app:snooker_activity_feed:v1', items);
    notify();
  }, [user, notify]);

  const updateSnookerLiveConfig = useCallback((c: any) => { setStorageItem('app:snooker_cfg:v1', c); notify(); }, [notify]);
  
  const updateSnookerScoreboard = useCallback((id: string, s: any) => {
    const current = getStorageItem<Record<string, SnookerScoreboard>>('app:snooker_scores:v1', {});
    const items = { ...current, [id]: s }; 
    setStorageItem('app:snooker_scores:v1', items); 
    notify();
  }, [notify]);

  const addSnookerChannel = useCallback((c: any) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const newChannel = { ...c, id: `chan-${Date.now()}`, scoreA: 0, scoreB: 0, status: 'scheduled', enabled: true, odds: { A: 1.95, B: 1.95, D: 3.20 } };
    setStorageItem('app:snooker_channels:v1', [...current, newChannel]); 
    notify();
  }, [notify]);

  const updateSnookerChannel = useCallback((c: any) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const items = current.map(i => i.id === c.id ? c : i); 
    setStorageItem('app:snooker_channels:v1', items); 
    notify();
  }, [notify]);

  const deleteSnookerChannel = useCallback((id: string) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const items = current.filter(i => i.id !== id); 
    setStorageItem('app:snooker_channels:v1', items); 
    notify();
  }, [notify]);

  const settleSnookerRound = useCallback((channelId: string, winner: string) => {
    const currentChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const channel = currentChannels.find(c => c.id === channelId);
    
    const currentBets = getStorageItem<SnookerBet[]>('app:snooker_bets:v1', []);
    const betsToSettle = currentBets.filter(b => b.channelId === channelId && b.status === 'open');
    
    let totalPot = 0;
    let totalPayout = 0;

    betsToSettle.forEach(bet => {
      totalPot += bet.amount;
      const isWinner = bet.pick === winner;
      if (isWinner) {
        const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
        const prize = bet.amount * (oddsMap[bet.pick as keyof typeof oddsMap]);
        totalPayout += prize;
        
        const realUser = getUserByTerminal(bet.userName) || getUsers().find(u => u.id === bet.userId);

        if (realUser) {
          const newBal = realUser.saldo + prize;
          upsertUser({ terminal: realUser.terminal, saldo: newBal });
          LedgerService.addEntry({
            bancaId: realUser.bancaId || 'default', userId: realUser.id, terminal: realUser.terminal,
            tipoUsuario: realUser.tipoUsuario, modulo: 'Sinuca', type: 'BET_WIN',
            amount: prize, balanceBefore: realUser.saldo, balanceAfter: newBal,
            referenceId: bet.id, description: `Prêmio Sinuca (Odd ${oddsMap[bet.pick as keyof typeof oddsMap].toFixed(2)})`
          });
        }
      }
    });

    // Registrar no histórico financeiro
    const historyEntry: SnookerFinancialSummary = {
      id: `fin-${Date.now()}`,
      channelId,
      channelTitle: channel?.title || 'Canal',
      totalPot,
      totalPayout,
      houseProfit: totalPot - totalPayout,
      settledAt: new Date().toISOString()
    };
    const currentHistory = getStorageItem<SnookerFinancialSummary[]>('app:snooker_history:v1', []);
    setStorageItem('app:snooker_history:v1', [historyEntry, ...currentHistory]);

    // Atualizar Apostas
    const updatedBets = currentBets.map(b => b.channelId === channelId && b.status === 'open' ? { ...b, status: b.pick === winner ? 'won' as const : 'lost' as const } : b);
    setStorageItem('app:snooker_bets:v1', updatedBets); 
    
    if (winner !== 'EMPATE') setCelebrationTrigger(true);
    notify();
  }, [notify]);

  const clearCelebration = useCallback(() => setCelebrationTrigger(false), []);

  // --- FOOTBALL METHODS ---
  const syncFootballAll = useCallback(async (force = false) => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const currentLeagues = getStorageItem('app:football:unified:v1', { leagues: ESPN_LEAGUE_CATALOG }).leagues;
      const activeLeagues = currentLeagues.filter((l: any) => l.active);
      let allMatches: any[] = [];
      const leagueStandings: Record<string, any[]> = {};

      for (const league of activeLeagues) {
        const [standingsData, scoreboardData] = await Promise.all([
          espnService.getStandings(league.slug),
          espnService.getScoreboard(league.slug)
        ]);
        if (standingsData) leagueStandings[league.slug] = normalizeESPNStandings(standingsData);
        if (scoreboardData) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboardData, league.slug)];
      }

      const unified = allMatches.map(match => {
        const probs = FootballOddsEngine.calculateMatchProbabilities(match.homeTeam.id, match.awayTeam.id, leagueStandings[match.leagueSlug] || []);
        const baseModel = MatchMapperService.transformEspnToBettable(match);
        const markets = FootballMarketsEngine.generateAllMarkets(probs);
        return { 
          ...baseModel, 
          markets, hasOdds: true, isLive: match.status === 'LIVE', 
          marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'OPEN', 
          odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } 
        };
      });

      const data = { leagues: currentLeagues, matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      toast({ title: 'Sync Concluído' });
    } catch (e) {
      console.error(e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, [toast]);

  const updateLeagueConfig = useCallback((id: string, config: any) => {
    setFootballData(prev => {
      const leagues = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l);
      const updated = { ...prev, leagues };
      setStorageItem('app:football:unified:v1', updated);
      return updated;
    });
    notify();
  }, [notify]);

  const placeFootballBet = useCallback(async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId
    });

    if (result.success) {
      const newBet: FootballBet = { id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() };
      const currentBets = getStorageItem<FootballBet[]>('app:football_bets:v1', []);
      setStorageItem('app:football_bets:v1', [newBet, ...currentBets]);
      setBetSlip([]);
      notify();
      return pouleId;
    }
    return null;
  }, [user, betSlip, notify, router]);

  // --- LOTTERY METHODS ---
  const handleFinalizarAposta = useCallback((aposta: any, valorTotal: number): string | null => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const result = BetService.processBet(user, {
      userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0,
      descricao: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId
    });

    if (result.success) {
      const newAposta: Aposta = { ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() };
      const currentApostas = getStorageItem<Aposta[]>('app:apostas:v1', []);
      setStorageItem('app:apostas:v1', [newAposta, ...currentApostas]);
      notify();
      return pouleId;
    }
    return null;
  }, [user, notify, router]);

  const processarResultados = useCallback((dados: any) => {
    const current = getStorageItem<any[]>('app:posted_results:v1', []);
    setStorageItem('app:posted_results:v1', [dados, ...current]);
    notify();
  }, [notify]);

  // --- BINGO METHODS ---
  const updateBingoSettings = useCallback((s: BingoSettings) => { setStorageItem('app:bingo_settings:v1', s); notify(); }, [notify]);
  
  const createBingoDraw = useCallback((d: Partial<BingoDraw>) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const newDraw: BingoDraw = {
      id: `draw-${Date.now()}`,
      drawNumber: current.length + 1,
      scheduledAt: d.scheduledAt || new Date().toISOString(),
      status: 'scheduled',
      ticketPrice: d.ticketPrice || 0.3,
      prizeRules: d.prizeRules || { quadra: 60, kina: 90, keno: 150 },
      housePercent: d.housePercent || 10,
      totalRevenue: 0,
      payoutTotal: 0,
      drawnNumbers: [],
      winnersFound: {},
      totalTickets: 0,
      bancaId: d.bancaId || 'default'
    };
    setStorageItem('app:bingo_draws:v1', [...current, newDraw]);
    notify();
  }, [notify]);

  const startBingoDraw = useCallback((id: string) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const updated = current.map(d => d.id === id ? { ...d, status: 'live' as const, startedAt: new Date().toISOString() } : d);
    setStorageItem('app:bingo_draws:v1', updated);
    notify();
  }, [notify]);

  const finishBingoDraw = useCallback((id: string) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const updated = current.map(d => d.id === id ? { ...d, status: 'finished' as const, finishedAt: new Date().toISOString() } : d);
    setStorageItem('app:bingo_draws:v1', updated);
    notify();
  }, [notify]);

  const cancelBingoDraw = useCallback((id: string, reason: string) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const updated = current.map(d => d.id === id ? { ...d, status: 'cancelled' as const } : d);
    setStorageItem('app:bingo_draws:v1', updated);
    notify();
  }, [notify]);

  const buyBingoTickets = useCallback((drawId: string, count: number) => {
    if (!user) return false;
    const currentDraws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const draw = currentDraws.find(d => d.id === drawId);
    if (!draw) return false;

    const totalCost = count * draw.ticketPrice;
    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Bingo', valor: totalCost, retornoPotencial: 0,
      descricao: `Compra de ${count} cartelas - Sorteio #${draw.drawNumber}`, referenceId: drawId
    });

    if (result.success) {
      const newTickets: BingoTicket[] = Array.from({ length: count }).map((_, i) => ({
        id: `tkt-${Date.now()}-${i}`, drawId, userId: user.id, userName: user.nome || 'Usuário',
        terminalId: user.terminal, amountPaid: draw.ticketPrice, status: 'active',
        ticketNumbers: [Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 1)],
        createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
      }));
      
      const currentTickets = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
      setStorageItem('app:bingo_tickets:v1', [...currentTickets, ...newTickets]);
      
      // Update draw total
      const updatedDraws = currentDraws.map(d => d.id === drawId ? { ...d, totalRevenue: d.totalRevenue + totalCost, totalTickets: d.totalTickets + count } : d);
      setStorageItem('app:bingo_draws:v1', updatedDraws);
      
      notify();
      return true;
    }
    return false;
  }, [user, notify]);

  const refundBingoTicket = useCallback((id: string) => {
    const current = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
    const updated = current.map(t => t.id === id ? { ...t, status: 'refunded' as const } : t);
    setStorageItem('app:bingo_tickets:v1', updated);
    notify();
  }, [notify]);

  const payBingoPayout = useCallback((id: string) => {
    const current = getStorageItem<BingoPayout[]>('app:bingo_payouts:v1', []);
    const updated = current.map(p => p.id === id ? { ...p, status: 'paid' as const } : p);
    setStorageItem('app:bingo_payouts:v1', updated);
    notify();
  }, [notify]);

  // --- ADMIN METHODS ---
  const addBanner = useCallback((b: Banner) => { const current = getStorageItem<Banner[]>('app:banners:v1', []); setStorageItem('app:banners:v1', [...current, b]); notify(); }, [notify]);
  const updateBanner = useCallback((b: Banner) => { const current = getStorageItem<Banner[]>('app:banners:v1', []); setStorageItem('app:banners:v1', current.map(i => i.id === b.id ? b : i)); notify(); }, [notify]);
  const deleteBanner = useCallback((id: string) => { const current = getStorageItem<Banner[]>('app:banners:v1', []); setStorageItem('app:banners:v1', current.filter(i => i.id !== id)); notify(); }, [notify]);
  const addPopup = useCallback((p: Popup) => { const current = getStorageItem<Popup[]>('app:popups:v1', []); setStorageItem('app:popups:v1', [...current, p]); notify(); }, [notify]);
  const updatePopup = useCallback((p: Popup) => { const current = getStorageItem<Popup[]>('app:popups:v1', []); setStorageItem('app:popups:v1', current.map(i => i.id === p.id ? p : i)); notify(); }, [notify]);
  const deletePopup = useCallback((id: string) => { const current = getStorageItem<Popup[]>('app:popups:v1', []); setStorageItem('app:popups:v1', current.filter(i => i.id !== id)); notify(); }, [notify]);
  const addNews = useCallback((m: NewsMessage) => { const current = getStorageItem<NewsMessage[]>('news_messages', []); setStorageItem('news_messages', [...current, m]); notify(); }, [notify]);
  const updateNews = useCallback((m: NewsMessage) => { const current = getStorageItem<NewsMessage[]>('news_messages', []); setStorageItem('news_messages', current.map(i => i.id === m.id ? m : i)); notify(); }, [notify]);
  const deleteNews = useCallback((id: string) => { const current = getStorageItem<NewsMessage[]>('news_messages', []); setStorageItem('news_messages', current.filter(i => i.id !== id)); notify(); }, [notify]);

  const contextValue = useMemo(() => ({
    user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
    activeBancaId: user?.bancaId || 'default', ledger, banners, popups, news, apostas, postedResults, 
    jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig,
    isFullscreen, toggleFullscreen,
    
    // Bingo
    bingoSettings, bingoDraws, bingoTickets, bingoPayouts,
    updateBingoSettings, createBingoDraw, startBingoDraw, finishBingoDraw, cancelBingoDraw, 
    buyBingoTickets, refundBingoTicket, payBingoPayout,

    // Sinuca
    snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerCashOutLog,
    snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, snookerScoreboards,
    celebrationTrigger, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet,
    sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig,
    updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel,
    settleSnookerRound, clearCelebration,

    refreshData: loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, 
    updateLeagueConfig, addBetToSlip: (b: any) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
    removeBetFromSlip: (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]),
    placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews
  }), [
    user, isLoading, ledger, banners, popups, news, apostas, postedResults, jdbLoterias, genericLotteryConfigs, 
    footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, bingoSettings, bingoDraws, 
    bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, 
    snookerCashOutLog, snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, 
    snookerScoreboards, celebrationTrigger, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, 
    sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, 
    updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, 
    settleSnookerRound, clearCelebration, loadLocalData, logout, handleFinalizarAposta, processarResultados, 
    syncFootballAll, updateLeagueConfig, placeFootballBet, addBanner, updateBanner, deleteBanner, 
    addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews, toggleFullscreen
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {mounted && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
