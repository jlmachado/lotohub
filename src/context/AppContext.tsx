'use client';

/**
 * @fileOverview AppContext - Orquestrador Central Síncrono (Master).
 * Integração plena dos módulos com suporte a Multi-Tenant e Autenticação.
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
import { FootballSettlementService } from '@/services/football-settlement-service';
import { FootballLiveEngine } from '@/services/football-live-engine';
import { checkApostaWinner } from '@/lib/draw-engine';
import { JDBNormalizedResult, SyncLogEntry } from '@/types/result-types';

// --- INTERFACES GERAIS ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface CasinoSettings {
  casinoName: string;
  casinoStatus: boolean;
  bannerMessage: string;
}

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
  status: 'OPEN' | 'WON' | 'LOST' | 'VOID';
  createdAt: string;
  settledAt?: string;
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
  ticketNumbers: number[];
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
  allUsers: any[];
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  activeBancaId: string;
  userLedger: any[];
  fullLedger: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  apostas: Aposta[];
  postedResults: any[];
  jdbResults: JDBNormalizedResult[];
  jdbSyncLogs: SyncLogEntry[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  casinoSettings: CasinoSettings;
  
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
  updateCasinoSettings: (s: CasinoSettings) => void;

  // JDB Professional Results
  publishJDBResult: (id: string) => void;
  deleteJDBResult: (id: string) => void;

  // Bingo Methods
  updateBingoSettings: (s: BingoSettings) => void;
  createBingoDraw: (d: Partial<BingoDraw>) => void;
  startBingoDraw: (id: string) => void;
  drawBingoBall: (id: string) => void;
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

const DEFAULT_CASINO_SETTINGS: CasinoSettings = {
  casinoName: 'LotoHub Casino',
  casinoStatus: true,
  bannerMessage: 'Sua sorte está a um clique de distância!'
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [fullLedger, setFullLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [jdbSyncLogs, setJdbSyncLogs] = useState<SyncLogEntry[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings>(DEFAULT_CASINO_SETTINGS);
  
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
    let currentUser = null;
    if (session) {
      currentUser = getUserByTerminal(session.terminal);
      setUser(currentUser);
      if (currentUser) setUserLedger(LedgerService.getByUser(currentUser.id));
    } else {
      setUser(null);
      setUserLedger([]);
    }

    setAllUsers(getUsers());
    setFullLedger(LedgerService.getEntries());
    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    setApostas(getStorageItem('app:apostas:v1', []));
    setPostedResults(getStorageItem('app:posted_results:v1', []));
    setJdbResults(getStorageItem('app:jdb_results:v1', []));
    setJdbSyncLogs(getStorageItem('app:jdb_sync_logs:v1', []));
    setFootballBets(getStorageItem('app:football_bets:v1', []));
    setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES));
    setCasinoSettings(getStorageItem('app:casino_settings:v1', DEFAULT_CASINO_SETTINGS));
    
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

  // --- CASINO METHODS ---
  const updateCasinoSettings = useCallback((s: CasinoSettings) => {
    setStorageItem('app:casino_settings:v1', s);
    notify();
  }, [notify]);

  // --- JDB PROFESSIONAL RESULTS SETTLEMENT ---
  const publishJDBResult = useCallback((id: string) => {
    const currentResults = getStorageItem<JDBNormalizedResult[]>('app:jdb_results:v1', []);
    const result = currentResults.find(r => r.id === id);
    if (!result) return;

    // 1. Marcar como PUBLICADO
    const updatedResults = currentResults.map(r => r.id === id ? { 
      ...r, 
      status: 'PUBLICADO' as const,
      publishedAt: new Date().toISOString()
    } : r);
    setStorageItem('app:jdb_results:v1', updatedResults);

    // 2. Apuração Automática de Apostas baseada no formato normalizado profissional
    const currentApostas = getStorageItem<Aposta[]>('app:apostas:v1', []);
    
    // Converter resultados detalhados para o formato que a engine de sorteio espera
    const simpleResults = result.prizes.map(p => ({
      premio: `${p.position}º`,
      milhar: p.milhar,
      grupo: p.grupo,
      animal: p.animal
    }));

    const updatedApostas = currentApostas.map(aposta => {
      const apostaData = aposta.data.split(',')[0].trim();
      const apostaHorario = aposta.detalhes?.[0]?.horario;
      
      if (aposta.status === 'aguardando' && 
          aposta.loteria === 'Jogo do Bicho' && 
          apostaData === result.date && 
          apostaHorario === result.time) {
        
        const { isWinner, prize } = checkApostaWinner(aposta, simpleResults, jdbLoterias);
        
        if (isWinner) {
          const realUser = getUserByTerminal(aposta.userId) || getUsers().find(u => u.id === aposta.userId);
          if (realUser) {
            const newBal = realUser.saldo + prize;
            upsertUser({ terminal: realUser.terminal, saldo: newBal });
            LedgerService.addEntry({
              bancaId: aposta.bancaId, userId: realUser.id, terminal: realUser.terminal,
              tipoUsuario: realUser.tipoUsuario, modulo: 'Jogo do Bicho', type: 'BET_WIN',
              amount: prize, balanceBefore: realUser.saldo, balanceAfter: newBal,
              referenceId: aposta.id, description: `Prêmio Bicho: ${result.lotteryName} (${result.time})`
            });
          }
          return { ...aposta, status: 'premiado' as const };
        } else {
          return { ...aposta, status: 'perdeu' as const };
        }
      }
      return aposta;
    });

    setStorageItem('app:apostas:v1', updatedApostas);
    toast({ title: "Extração Publicada!", description: "Resultados disponibilizados e apostas apuradas automaticamente." });
    notify();
  }, [notify, jdbLoterias, toast]);

  const deleteJDBResult = useCallback((id: string) => {
    const current = getStorageItem<JDBNormalizedResult[]>('app:jdb_results:v1', []);
    setStorageItem('app:jdb_results:v1', current.filter(r => r.id !== id));
    notify();
  }, [notify]);

  // --- BINGO METHODS ---
  const updateBingoSettings = useCallback((s: BingoSettings) => { setStorageItem('app:bingo_settings:v1', s); notify(); }, [notify]);
  
  const createBingoDraw = useCallback((d: Partial<BingoDraw>) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const nextNum = current.length > 0 ? Math.max(...current.map(x => x.drawNumber)) + 1 : 1001;
    const newDraw: BingoDraw = {
      id: `draw-${Date.now()}`, drawNumber: nextNum, status: 'scheduled', drawnNumbers: [], winnersFound: {},
      totalTickets: 0, totalRevenue: 0, payoutTotal: 0, bancaId: user?.bancaId || 'default',
      scheduledAt: new Date().toISOString(), ticketPrice: 0.3, prizeRules: { quadra: 60, kina: 90, keno: 150 }, housePercent: 10,
      ...d
    };
    setStorageItem('app:bingo_draws:v1', [newDraw, ...current]);
    notify();
  }, [user, notify]);

  const startBingoDraw = useCallback((id: string) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    setStorageItem('app:bingo_draws:v1', current.map(d => d.id === id ? { ...d, status: 'live' as const, startedAt: new Date().toISOString() } : d));
    notify();
  }, [notify]);

  const drawBingoBall = useCallback((id: string) => {
    const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const idx = draws.findIndex(d => d.id === id);
    if (idx === -1) return;
    const draw = draws[idx];
    const available = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !draw.drawnNumbers.includes(n));
    if (available.length === 0) return;
    const ball = available[Math.floor(Math.random() * available.length)];
    const newDrawn = [...draw.drawnNumbers, ball];
    
    // Winner Check
    const tickets = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
    const drawTickets = tickets.filter(t => t.drawId === id && t.status === 'active');
    const winners = { ...draw.winnersFound };
    
    drawTickets.forEach(t => {
      const hits = t.ticketNumbers.filter(n => newDrawn.includes(n)).length;
      if (!winners.quadra && hits >= 4) {
        winners.quadra = { category: 'quadra', userId: t.userId, userName: t.userName, terminalId: t.terminalId, winAmount: draw.prizeRules.quadra, winningNumbers: t.ticketNumbers, wonAt: new Date().toISOString(), type: t.isBot ? 'BOT_WIN' : 'USER_WIN' };
        if (!t.isBot) {
          const u = getUserByTerminal(t.terminalId);
          if (u) {
            const nb = u.saldo + draw.prizeRules.quadra;
            upsertUser({ terminal: u.terminal, saldo: nb });
            LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'BET_WIN', amount: draw.prizeRules.quadra, balanceBefore: u.saldo, balanceAfter: nb, referenceId: t.id, description: 'Prêmio Bingo Quadra' });
          }
        }
      }
      if (!winners.kina && hits >= 5) {
        winners.kina = { category: 'kina', userId: t.userId, userName: t.userName, terminalId: t.terminalId, winAmount: draw.prizeRules.kina, winningNumbers: t.ticketNumbers, wonAt: new Date().toISOString(), type: t.isBot ? 'BOT_WIN' : 'USER_WIN' };
        if (!t.isBot) {
          const u = getUserByTerminal(t.terminalId);
          if (u) {
            const nb = u.saldo + draw.prizeRules.kina;
            upsertUser({ terminal: u.terminal, saldo: nb });
            LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'BET_WIN', amount: draw.prizeRules.kina, balanceBefore: u.saldo, balanceAfter: nb, referenceId: t.id, description: 'Prêmio Bingo Kina' });
          }
        }
      }
      if (!winners.keno && hits >= 15) {
        winners.keno = { category: 'keno', userId: t.userId, userName: t.userName, terminalId: t.terminalId, winAmount: draw.prizeRules.keno, winningNumbers: t.ticketNumbers, wonAt: new Date().toISOString(), type: t.isBot ? 'BOT_WIN' : 'USER_WIN' };
        if (!t.isBot) {
          const u = getUserByTerminal(t.terminalId);
          if (u) {
            const nb = u.saldo + draw.prizeRules.keno;
            upsertUser({ terminal: u.terminal, saldo: nb });
            LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'BET_WIN', amount: draw.prizeRules.keno, balanceBefore: u.saldo, balanceAfter: nb, referenceId: t.id, description: 'Prêmio Bingo Keno' });
          }
        }
      }
    });

    draws[idx] = { ...draw, drawnNumbers: newDrawn, winnersFound: winners };
    setStorageItem('app:bingo_draws:v1', draws);
    notify();
  }, [notify]);

  const finishBingoDraw = useCallback((id: string) => {
    const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    setStorageItem('app:bingo_draws:v1', current.map(d => d.id === id ? { ...d, status: 'finished' as const, finishedAt: new Date().toISOString() } : d));
    notify();
  }, [notify]);

  const cancelBingoDraw = useCallback((id: string, reason: string) => {
    const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const draw = draws.find(d => d.id === id);
    if (!draw) return;
    const tickets = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
    const drawTickets = tickets.filter(t => t.drawId === id && t.status === 'active');
    drawTickets.forEach(t => {
      const u = getUserByTerminal(t.terminalId);
      if (u) {
        upsertUser({ terminal: u.terminal, saldo: u.saldo + t.amountPaid });
        LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'WITHDRAW', amount: t.amountPaid, balanceBefore: u.saldo, balanceAfter: u.saldo + t.amountPaid, referenceId: t.id, description: `Estorno Bingo: ${reason}` });
      }
    });
    setStorageItem('app:bingo_tickets:v1', tickets.map(t => t.drawId === id ? { ...t, status: 'refunded' as const } : t));
    setStorageItem('app:bingo_draws:v1', draws.map(d => d.id === id ? { ...d, status: 'cancelled' as const } : d));
    notify();
  }, [notify]);

  const buyBingoTickets = useCallback((drawId: string, count: number) => {
    if (!user || count <= 0) return false;
    const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []);
    const draw = draws.find(d => d.id === drawId);
    if (!draw || (draw.status !== 'scheduled' && draw.status !== 'waiting')) return false;
    const total = count * draw.ticketPrice;
    const result = BetService.processBet(user, { userId: user.id, modulo: 'Bingo', valor: total, retornoPotencial: 0, descricao: `Compra ${count} cartelas Bingo`, referenceId: `bin-${drawId}-${Date.now()}` });
    if (result.success) {
      const tickets: BingoTicket[] = Array.from({ length: count }, () => ({
        id: `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, drawId, userId: user.id, userName: user.nome || user.terminal, terminalId: user.terminal, amountPaid: draw.ticketPrice, status: 'active', ticketNumbers: Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 1), createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
      }));
      const currentTkts = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
      setStorageItem('app:bingo_tickets:v1', [...tickets, ...currentTkts]);
      setStorageItem('app:bingo_draws:v1', draws.map(d => d.id === drawId ? { ...d, totalTickets: d.totalTickets + count, totalRevenue: d.totalRevenue + total } : d));
      notify();
      return true;
    }
    return false;
  }, [user, notify]);

  const refundBingoTicket = useCallback((id: string) => {
    const current = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []);
    setStorageItem('app:bingo_tickets:v1', current.map(t => t.id === id ? { ...t, status: 'refunded' as const } : t));
    notify();
  }, [notify]);

  const payBingoPayout = useCallback((id: string) => {
    const current = getStorageItem<BingoPayout[]>('app:bingo_payouts:v1', []);
    setStorageItem('app:bingo_payouts:v1', current.map(p => p.id === id ? { ...p, status: 'paid' as const } : p));
    notify();
  }, [notify]);

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
        ...bet, id: `bet-sno-${Date.now()}`, userId: user.id, userName: user.nome || user.terminal,
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
        userName: user.nome || user.terminal,
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

    const oddsMap = { A: channel.odds.A, B: channel.odds.B, EMPATE: channel.odds.D };
    const currentOdd = oddsMap[bet.pick];
    const originalOdd = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD }[bet.pick];
    const potentialPayout = bet.amount * originalOdd;
    const fairValue = potentialPayout / currentOdd;
    const margin = (snookerLiveConfig.cashOutMargin || 8) / 100;
    const cashOutValue = Math.max(0.01, fairValue * (1 - margin));

    const u = getUserByTerminal(user.terminal);
    if (u) {
      const newBal = u.saldo + cashOutValue;
      upsertUser({ terminal: u.terminal, saldo: newBal });
      
      LedgerService.addEntry({
        bancaId: u.bancaId || 'default', userId: u.id, terminal: u.terminal,
        tipoUsuario: u.tipoUsuario, modulo: 'Sinuca', type: 'CASH_OUT_RECOLHE',
        amount: cashOutValue, balanceBefore: u.saldo, balanceAfter: newBal,
        referenceId: betId, description: `Cash Out Sinuca: ${bet.pick} (Original R$ ${bet.amount.toFixed(2)})`
      });
    }

    const logEntry = {
      id: `co-${Date.now()}`, userId: user.id, userName: user.nome || user.terminal,
      channelId: bet.channelId, channelTitle: channel.title, originalAmount: bet.amount,
      originalOdd, cashOutOdd: currentOdd, cashOutAmount: cashOutValue,
      houseProfit: bet.amount - cashOutValue, createdAt: new Date().toISOString()
    };
    const currentLogs = getStorageItem<any[]>('app:snooker_cashout:v1', []);
    setStorageItem('app:snooker_cashout:v1', [logEntry, ...currentLogs]);

    const updatedBets = currentBets.map(b => b.id === betId ? { ...b, status: 'cash_out' as const } : b);
    setStorageItem('app:snooker_bets:v1', updatedBets);
    
    toast({ title: 'Cash Out Concluído', description: `R$ ${cashOutValue.toFixed(2)} creditados em seu saldo.` });
    notify();
  }, [user, snookerLiveConfig, notify, toast]);

  const sendSnookerChatMessage = useCallback((channelId: string, text: string) => {
    if (!user) return;
    let filteredText = snookerLiveConfig.profanityFilterEnabled ? filterProfanity(text) : text;
    const newMessage: SnookerChatMessage = {
      id: `msg-${Date.now()}`, channelId, userId: user.id, userName: user.nome || user.terminal,
      text: filteredText, createdAt: new Date().toISOString(), role: ['ADMIN', 'SUPER_ADMIN'].includes(user.tipoUsuario) ? 'admin' : 'user'
    };
    const currentMsgs = getStorageItem<SnookerChatMessage[]>('app:snooker_chat:v1', []);
    setStorageItem('app:snooker_chat:v1', [newMessage, ...currentMsgs].slice(0, 100));
    notify();
  }, [user, snookerLiveConfig, notify]);

  const deleteSnookerChatMessage = useCallback((id: string) => {
    const current = getStorageItem<SnookerChatMessage[]>('app:snooker_chat:v1', []);
    setStorageItem('app:snooker_chat:v1', current.map(m => m.id === id ? { ...m, deleted: true } : m));
    notify();
  }, [notify]);

  const sendSnookerReaction = useCallback((channelId: string, reaction: string) => {
    if (!user) return;
    const entry = { id: Date.now(), channelId, text: `${user.nome || user.terminal} reagiu com ${reaction}`, createdAt: new Date().toISOString() };
    const currentFeed = getStorageItem<any[]>('app:snooker_activity_feed:v1', []);
    setStorageItem('app:snooker_activity_feed:v1', [entry, ...currentFeed].slice(0, 50));
    notify();
  }, [user, notify]);

  const updateSnookerLiveConfig = useCallback((c: any) => { setStorageItem('app:snooker_cfg:v1', c); notify(); }, [notify]);
  const updateSnookerScoreboard = useCallback((id: string, s: any) => {
    const current = getStorageItem<Record<string, SnookerScoreboard>>('app:snooker_scores:v1', {});
    setStorageItem('app:snooker_scores:v1', { ...current, [id]: s }); notify();
  }, [notify]);

  const addSnookerChannel = useCallback((c: any) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    setStorageItem('app:snooker_channels:v1', [...current, { ...c, id: `chan-${Date.now()}`, scoreA: 0, scoreB: 0, status: 'scheduled', enabled: true, odds: { A: 1.95, B: 1.95, D: 3.20 } }]);
    notify();
  }, [notify]);

  const updateSnookerChannel = useCallback((c: any) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    setStorageItem('app:snooker_channels:v1', current.map(i => i.id === c.id ? c : i)); notify();
  }, [notify]);

  const deleteSnookerChannel = useCallback((id: string) => {
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    setStorageItem('app:snooker_channels:v1', current.filter(i => i.id !== id)); notify();
  }, [notify]);

  const settleSnookerRound = useCallback((channelId: string, winner: string) => {
    const currentChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const channel = currentChannels.find(c => c.id === channelId);
    const currentBets = getStorageItem<SnookerBet[]>('app:snooker_bets:v1', []);
    const betsToSettle = currentBets.filter(b => b.channelId === channelId && b.status === 'open');
    let totalPot = 0, totalPayout = 0;

    betsToSettle.forEach(bet => {
      totalPot += bet.amount;
      if (bet.pick === winner) {
        const oddsMap = { A: bet.oddsA, B: bet.oddsB, EMPATE: bet.oddsD };
        const prize = bet.amount * (oddsMap[bet.pick as keyof typeof oddsMap]);
        totalPayout += prize;
        const realUser = getUserByTerminal(bet.userName) || getUsers().find(u => u.id === bet.userId);
        if (realUser) {
          upsertUser({ terminal: realUser.terminal, saldo: realUser.saldo + prize });
          LedgerService.addEntry({
            bancaId: realUser.bancaId || 'default', userId: realUser.id, terminal: realUser.terminal,
            tipoUsuario: realUser.tipoUsuario, modulo: 'Sinuca', type: 'BET_WIN',
            amount: prize, balanceBefore: realUser.saldo, balanceAfter: realUser.saldo + prize,
            referenceId: bet.id, description: `Prêmio Sinuca (Odd ${oddsMap[bet.pick as keyof typeof oddsMap].toFixed(2)})`
          });
        }
      }
    });

    const historyEntry = { id: `fin-${Date.now()}`, channelId, channelTitle: channel?.title || 'Canal', totalPot, totalPayout, houseProfit: totalPot - totalPayout, settledAt: new Date().toISOString() };
    const currentHistory = getStorageItem<any[]>('app:snooker_history:v1', []);
    setStorageItem('app:snooker_history:v1', [historyEntry, ...currentHistory]);
    setStorageItem('app:snooker_bets:v1', currentBets.map(b => b.channelId === channelId && b.status === 'open' ? { ...b, status: b.pick === winner ? 'won' as const : 'lost' as const } : b));
    if (winner !== 'EMPATE') setCelebrationTrigger(true);
    notify();
  }, [notify]);

  const clearCelebration = useCallback(() => setCelebrationTrigger(false), []);

  // --- FOOTBALL METHODS ---
  const syncFootballAll = useCallback(async (force = false) => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const activeLeagues = getStorageItem('app:football:unified:v1', { leagues: ESPN_LEAGUE_CATALOG }).leagues.filter((l: any) => l.active);
      let allMatches: any[] = [];
      const leagueStandings: Record<string, any[]> = {};
      for (const league of activeLeagues) {
        const [standingsData, scoreboardData] = await Promise.all([espnService.getStandings(league.slug), espnService.getScoreboard(league.slug)]);
        if (standingsData) leagueStandings[league.slug] = normalizeESPNStandings(standingsData);
        if (scoreboardData) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboardData, league.slug)];
      }
      const unified = allMatches.map(match => {
        const probs = FootballOddsEngine.calculateMatchProbabilities(match.homeTeam.id, match.awayTeam.id, leagueStandings[match.leagueSlug] || [], match.id);
        const baseModel = MatchMapperService.transformEspnToBettable(match);
        const markets = FootballMarketsEngine.generateAllMarkets(probs);
        const processed = FootballLiveEngine.processLiveState(baseModel, match);
        return { ...processed, markets, hasOdds: true, odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } };
      });
      const currentBets = getStorageItem<FootballBet[]>('app:football_bets:v1', []);
      setStorageItem('app:football_bets:v1', FootballSettlementService.settleBets(currentBets, unified));
      const data = { leagues: ESPN_LEAGUE_CATALOG, matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      if (force) toast({ title: 'Sync Concluído', description: `${unified.length} partidas atualizadas.` });
    } catch (e) {
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
    const result = BetService.processBet(user, { userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: totalOdds > 0 ? potentialWin : 0, descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId });
    if (result.success) {
      const currentBets = getStorageItem<FootballBet[]>('app:football_bets:v1', []);
      setStorageItem('app:football_bets:v1', [{ id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() }, ...currentBets]);
      setBetSlip([]); notify(); return pouleId;
    }
    return null;
  }, [user, betSlip, notify, router]);

  // --- LOTTERY METHODS ---
  const handleFinalizarAposta = useCallback((aposta: any, valorTotal: number): string | null => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const result = BetService.processBet(user, { userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0, descricao: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId });
    if (result.success) {
      const currentApostas = getStorageItem<Aposta[]>('app:apostas:v1', []);
      setStorageItem('app:apostas:v1', [{ ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() }, ...currentApostas]);
      notify(); return pouleId;
    }
    return null;
  }, [user, notify, router]);

  const processarResultados = useCallback((dados: any) => {
    const current = getStorageItem<any[]>('app:posted_results:v1', []);
    setStorageItem('app:posted_results:v1', [dados, ...current]); notify();
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
    user, allUsers, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
    activeBancaId: user?.bancaId || 'default', userLedger, fullLedger, banners, popups, news, apostas, postedResults, 
    jdbResults, jdbSyncLogs, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig,
    isFullscreen, toggleFullscreen, casinoSettings, updateCasinoSettings,
    bingoSettings, bingoDraws, bingoTickets, bingoPayouts,
    publishJDBResult, deleteJDBResult,
    updateBingoSettings, createBingoDraw, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw, 
    buyBingoTickets, refundBingoTicket, payBingoPayout,
    snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerCashOutLog,
    snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, snookerScoreboards,
    celebrationTrigger, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet,
    sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig,
    updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel,
    settleSnookerRound, clearCelebration,
    refreshData: loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, 
    updateLeagueConfig, addBetToSlip: (b: any) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId || i.id !== b.id), b]),
    removeBetFromSlip: (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]),
    placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews
  }), [
    user, allUsers, isLoading, userLedger, fullLedger, banners, popups, news, apostas, postedResults, jdbResults, jdbSyncLogs, jdbLoterias, genericLotteryConfigs, 
    footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, bingoSettings, bingoDraws, 
    bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, 
    snookerCashOutLog, snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, 
    snookerScoreboards, celebrationTrigger, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, 
    sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, 
    updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, 
    settleSnookerRound, clearCelebration, loadLocalData, logout, handleFinalizarAposta, processarResultados, 
    syncFootballAll, updateLeagueConfig, placeFootballBet, addBanner, updateBanner, deleteBanner, 
    addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews, toggleFullscreen, drawBingoBall,
    casinoSettings, updateCasinoSettings, publishJDBResult, deleteJDBResult,
    updateBingoSettings, createBingoDraw, startBingoDraw, finishBingoDraw, cancelBingoDraw, 
    buyBingoTickets, refundBingoTicket, payBingoPayout
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
