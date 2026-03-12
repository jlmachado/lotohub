'use client';

/**
 * @fileOverview AppContext - Orquestrador Central Síncrono (Master).
 * Controla o estado de todos os módulos (Futebol, Loterias, Bingo e Sinuca).
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { getUserByTerminal, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { MatchMapperService } from '@/services/match-mapper-service';

// --- INTERFACES GERAIS ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

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

// --- INTERFACES FUTEBOL ---
export interface Aposta {
  id: string;
  userId: string;
  bancaId: string;
  loteria: string;
  concurso: string;
  data: string;
  valor: string;
  numeros: string;
  status: 'aguardando' | 'premiado' | 'perdeu' | 'won' | 'lost' | 'cash_out';
  detalhes?: any;
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
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  isDescarga?: boolean;
}

export interface FootballData {
  leagues: ESPNLeagueConfig[];
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
  showLiveBadge?: boolean;
}

// --- APP CONTEXT TYPE ---
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
  
  // Bingo State
  const [bingoSettings, setBingoSettings] = useState<BingoSettings>({
    enabled: true, rtpEnabled: false, rtpPercent: 20, ticketPriceDefault: 0.3,
    maxTicketsPerUserDefault: 500, housePercentDefault: 10, preDrawHoldSeconds: 10,
    prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual',
    autoSchedule: { everyMinutes: 3, startHour: 8, endHour: 23 }
  });
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoPayouts, setBingoPayouts] = useState<BingoPayout[]>([]);

  // Sinuca State
  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<Record<string, { viewers: string[] }>>({});
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<SnookerFinancialSummary[]>([]);
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig>({
    defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 5, maxBet: 1000,
    cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true,
    updatedAt: new Date().toISOString()
  });
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerChatMessages, setSnookerChatMessages] = useState<SnookerChatMessage[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, SnookerScoreboard>>({});
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  // Futebol State
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG, matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });

  // UI State
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>({
    enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
    autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
    topHeight: 96, bubbleSize: 62
  });

  const loadLocalData = useCallback(() => {
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
    
    // Bingo
    setBingoSettings(getStorageItem('app:bingo_settings:v1', bingoSettings));
    setBingoDraws(getStorageItem('app:bingo_draws:v1', []));
    setBingoTickets(getStorageItem('app:bingo_tickets:v1', []));
    setBingoPayouts(getStorageItem('app:bingo_payouts:v1', []));

    // Sinuca
    setSnookerChannels(getStorageItem('app:snooker_channels:v1', []));
    setSnookerFinancialHistory(getStorageItem('app:snooker_history:v1', []));
    setSnookerBets(getStorageItem('app:snooker_bets:v1', []));
    setSnookerCashOutLog(getStorageItem('app:snooker_cashout:v1', []));
    setSnookerLiveConfig(getStorageItem('app:snooker_cfg:v1', snookerLiveConfig));
    setSnookerChatMessages(getStorageItem('app:snooker_chat:v1', []));
    setSnookerScoreboards(getStorageItem('app:snooker_scores:v1', {}));

    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', liveMiniPlayerConfig));

    const savedFootball = getStorageItem('app:football:unified:v1', null);
    if (savedFootball && Array.isArray(savedFootball.unifiedMatches)) {
      setFootballData(prev => ({ ...prev, ...savedFootball }));
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

  const notify = () => window.dispatchEvent(new Event('app:data-changed'));

  const logout = () => { authLogout(); setUser(null); notify(); router.push('/login'); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // --- LOTTERY METHODS ---
  const handleFinalizarAposta = (aposta: any, valorTotal: number): string | null => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const result = BetService.processBet(user, {
      userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0,
      descricao: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId
    });

    if (result.success) {
      const newAposta: Aposta = { ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() };
      const items = [newAposta, ...apostas];
      setStorageItem('app:apostas:v1', items);
      notify();
      return pouleId;
    }
    return null;
  };

  const processarResultados = (dados: any) => {
    const items = [dados, ...postedResults];
    setStorageItem('app:posted_results:v1', items);
    notify();
  };

  // --- FOOTBALL METHODS ---
  const syncFootballAll = async (force = false) => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
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

      const data = { matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      toast({ title: 'Sync Concluído' });
    } catch (e) {
      console.error(e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    }
  };

  const updateLeagueConfig = (id: string, config: any) => {
    const leagues = footballData.leagues.map(l => l.id === id ? { ...l, ...config } : l);
    setFootballData(prev => ({ ...prev, leagues }));
    notify();
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
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
      const items = [newBet, ...footballBets];
      setStorageItem('app:football_bets:v1', items);
      setBetSlip([]);
      notify();
      return pouleId;
    }
    return null;
  };

  // --- BINGO METHODS ---
  const updateBingoSettings = (s: BingoSettings) => { setBingoSettings(s); setStorageItem('app:bingo_settings:v1', s); notify(); };
  const createBingoDraw = (d: Partial<BingoDraw>) => { 
    const newDraw: BingoDraw = { 
      id: `draw-${Date.now()}`, drawNumber: (bingoDraws[0]?.drawNumber || 0) + 1, 
      status: 'scheduled', totalRevenue: 0, payoutTotal: 0, drawnNumbers: [], 
      winnersFound: {}, totalTickets: 0, bancaId: user?.bancaId || 'default',
      scheduledAt: d.scheduledAt!, ticketPrice: d.ticketPrice!, housePercent: d.housePercent!,
      prizeRules: d.prizeRules!
    };
    const items = [newDraw, ...bingoDraws]; setStorageItem('app:bingo_draws:v1', items); notify(); 
  };
  const startBingoDraw = (id: string) => {
    const items = bingoDraws.map(d => d.id === id ? { ...d, status: 'live', startedAt: new Date().toISOString() } : d);
    setStorageItem('app:bingo_draws:v1', items); notify();
  };
  const finishBingoDraw = (id: string) => {
    const items = bingoDraws.map(d => d.id === id ? { ...d, status: 'finished', finishedAt: new Date().toISOString() } : d);
    setStorageItem('app:bingo_draws:v1', items); notify();
  };
  const cancelBingoDraw = (id: string, reason: string) => {
    const items = bingoDraws.map(d => d.id === id ? { ...d, status: 'cancelled' } : d);
    setStorageItem('app:bingo_draws:v1', items); notify();
  };
  const buyBingoTickets = (drawId: string, count: number) => {
    if (!user) return false;
    const draw = bingoDraws.find(d => d.id === drawId);
    if (!draw) return false;
    const totalCost = count * draw.ticketPrice;
    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Bingo', valor: totalCost, retornoPotencial: 0,
      descricao: `Bingo: Compras de ${count} cartelas (Sorteio #${draw.drawNumber})`, referenceId: `bin-${drawId}-${Date.now()}`
    });
    if (result.success) {
      const newTicket: BingoTicket = {
        id: `tkt-${Date.now()}`, drawId, userId: user.id, userName: user.nome || 'Usuário',
        terminalId: user.terminal, amountPaid: totalCost, status: 'active',
        ticketNumbers: [], createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
      };
      const items = [newTicket, ...bingoTickets]; setStorageItem('app:bingo_tickets:v1', items); notify();
      return true;
    }
    return false;
  };
  const refundBingoTicket = (id: string) => {
    const items = bingoTickets.map(t => t.id === id ? { ...t, status: 'refunded' as const } : t);
    setStorageItem('app:bingo_tickets:v1', items); notify();
  };
  const payBingoPayout = (id: string) => {
    const items = bingoPayouts.map(p => p.id === id ? { ...p, status: 'paid' as const } : p);
    setStorageItem('app:bingo_payouts:v1', items); notify();
  };

  // --- SNOOKER METHODS ---
  const joinChannel = (channelId: string, userId: string) => {
    setSnookerPresence(prev => {
      const current = prev[channelId]?.viewers || [];
      if (current.includes(userId)) return prev;
      return { ...prev, [channelId]: { viewers: [...current, userId] } };
    });
  };
  const leaveChannel = (channelId: string, userId: string) => {
    setSnookerPresence(prev => {
      const current = prev[channelId]?.viewers || [];
      return { ...prev, [channelId]: { viewers: current.filter(id => id !== userId) } };
    });
  };
  const placeSnookerBet = (bet: any) => {
    if (!user) return false;
    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Sinuca', valor: bet.amount, retornoPotencial: 0,
      descricao: `Sinuca: Aposta em ${bet.pick}`, referenceId: `sno-${bet.channelId}-${Date.now()}`
    });
    if (result.success) {
      const newBet: SnookerBet = {
        ...bet, id: `bet-sno-${Date.now()}`, userId: user.id, userName: user.nome || 'Usuário',
        status: 'open', createdAt: new Date().toISOString()
      };
      const items = [newBet, ...snookerBets]; setStorageItem('app:snooker_bets:v1', items); notify();
      return true;
    }
    return false;
  };
  const cashOutSnookerBet = (betId: string) => {
    const items = snookerBets.map(b => b.id === betId ? { ...b, status: 'cash_out' as const } : b);
    setStorageItem('app:snooker_bets:v1', items); notify();
  };
  const sendSnookerChatMessage = (channelId: string, text: string) => {
    if (!user) return;
    const newMessage: SnookerChatMessage = {
      id: `msg-${Date.now()}`, channelId, userId: user.id, userName: user.nome || 'Usuário',
      text, createdAt: new Date().toISOString(), role: user.tipoUsuario === 'SUPER_ADMIN' ? 'admin' : 'user'
    };
    const items = [newMessage, ...snookerChatMessages]; setStorageItem('app:snooker_chat:v1', items); notify();
  };
  const deleteSnookerChatMessage = (id: string) => {
    const items = snookerChatMessages.map(m => m.id === id ? { ...m, deleted: true } : m);
    setStorageItem('app:snooker_chat:v1', items); notify();
  };
  const sendSnookerReaction = (channelId: string, reaction: string) => {
    const text = `${user?.nome || 'Alguém'} reagiu com ${reaction}`;
    setSnookerActivityFeed(prev => [{ id: Date.now(), channelId, text, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateSnookerLiveConfig = (c: any) => { setSnookerLiveConfig(c); setStorageItem('app:snooker_cfg:v1', c); notify(); };
  const updateSnookerScoreboard = (id: string, s: any) => {
    const items = { ...snookerScoreboards, [id]: s }; setStorageItem('app:snooker_scores:v1', items); notify();
  };
  const addSnookerChannel = (c: any) => {
    const newChannel = { ...c, id: `chan-${Date.now()}`, scoreA: 0, scoreB: 0, status: 'scheduled', odds: { A: 1.95, B: 1.95, D: 3.20 } };
    const items = [...snookerChannels, newChannel]; setStorageItem('app:snooker_channels:v1', items); notify();
  };
  const updateSnookerChannel = (c: any) => {
    const items = snookerChannels.map(i => i.id === c.id ? c : i); setStorageItem('app:snooker_channels:v1', items); notify();
  };
  const deleteSnookerChannel = (id: string) => {
    const items = snookerChannels.filter(i => i.id !== id); setStorageItem('app:snooker_channels:v1', items); notify();
  };
  const settleSnookerRound = (channelId: string, winner: string) => {
    const betsToSettle = snookerBets.filter(b => b.channelId === channelId && b.status === 'open');
    betsToSettle.forEach(bet => {
      const isWinner = bet.pick === winner;
      if (isWinner) {
        const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
        const prize = bet.amount * (oddsMap[bet.pick as keyof typeof oddsMap]);
        // Creditar prêmio
        const u = getUserByTerminal(user.terminal);
        if (u) {
          const newBal = u.saldo + prize;
          upsertUser({ terminal: u.terminal, saldo: newBal });
          LedgerService.addEntry({
            bancaId: u.bancaId || 'default', userId: u.id, terminal: u.terminal,
            tipoUsuario: u.tipoUsuario, modulo: 'Sinuca', type: 'BET_WIN',
            amount: prize, balanceBefore: u.saldo, balanceAfter: newBal,
            referenceId: bet.id, description: `Prêmio Sinuca (Odd ${oddsMap[bet.pick as keyof typeof oddsMap].toFixed(2)})`
          });
        }
      }
    });
    const items = snookerBets.map(b => b.channelId === channelId && b.status === 'open' ? { ...b, status: b.pick === winner ? 'won' as const : 'lost' as const } : b);
    setStorageItem('app:snooker_bets:v1', items); notify();
    if (winner !== 'EMPATE') setCelebrationTrigger(true);
  };
  const clearCelebration = () => setCelebrationTrigger(false);

  // --- ADMIN METHODS ---
  const addBanner = (b: Banner) => { const items = [...banners, b]; setStorageItem('app:banners:v1', items); notify(); };
  const updateBanner = (b: Banner) => { const items = banners.map(i => i.id === b.id ? b : i); setStorageItem('app:banners:v1', items); notify(); };
  const deleteBanner = (id: string) => { const items = banners.filter(i => i.id !== id); setStorageItem('app:banners:v1', items); notify(); };
  const addPopup = (p: Popup) => { const items = [...popups, p]; setStorageItem('app:popups:v1', items); notify(); };
  const updatePopup = (p: Popup) => { const items = popups.map(i => i.id === p.id ? p : i); setStorageItem('app:popups:v1', items); notify(); };
  const deletePopup = (id: string) => { const items = popups.filter(i => i.id !== id); setStorageItem('app:popups:v1', items); notify(); };
  const addNews = (m: NewsMessage) => { const items = [...news, m]; setStorageItem('news_messages', items); notify(); };
  const updateNews = (m: NewsMessage) => { const items = news.map(i => i.id === m.id ? m : i); setStorageItem('news_messages', items); notify(); };
  const deleteNews = (id: string) => { const items = news.filter(i => i.id !== id); setStorageItem('news_messages', items); notify(); };

  return (
    <AppContext.Provider value={{
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
      updateLeagueConfig, addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]),
      placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews
    }}>
      {mounted && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
