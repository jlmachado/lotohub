/**
 * @fileOverview Contexto global expandido para suportar sistema de apostas, ESPN API,
 * Bingo, Sinuca ao Vivo e gerenciamento de identidade visual.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { upsertUser, addPromoterCredit } from '@/utils/usersStorage';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService, LiveScoreMatch } from '@/services/livescore-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { BetSlipItem } from '@/utils/bet-calculator';
import { generatePoule } from '@/utils/generatePoule';
import { loadBichoLoterias, saveBichoLoterias } from '@/utils/bichoLoteriasStorage';

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

export interface Banner {
  id: string;
  title: string;
  content?: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
  active: boolean;
  startAt?: string;
  endAt?: string;
  imageMeta?: any;
}

export interface Popup {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  active: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
  imageMeta?: any;
}

export interface NewsMessage {
  id: string;
  text: string;
  order: number;
  active: boolean;
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

// Snooker Types
export interface SnookerChannel {
  id: string;
  title: string;
  youtubeUrl: string;
  playerA: { name: string; level: number; avatarUrl?: string };
  playerB: { name: string; level: number; avatarUrl?: string };
  odds: { A: number; B: number; D: number };
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  scheduledAt: string;
  startedAt?: string;
  viewerCount: number;
  enabled: boolean;
  bestOf: number;
  scoreA: number;
  scoreB: number;
}

// Bingo Types
export interface BingoWinner {
  userId: string;
  userName: string;
  terminalId: string;
  winAmount: number;
  winningNumbers: number[];
  category: 'quadra' | 'kina' | 'keno';
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
  totalRevenue: number;
  totalTickets: number;
  payoutTotal: number;
  drawnNumbers: number[];
  winnersFound: {
    quadra: BingoWinner | null;
    kina: BingoWinner | null;
    keno: BingoWinner | null;
  };
  prizeRules: { quadra: number; kina: number; keno: number };
  bancaId: string;
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  ticketNumbers: number[][];
  amountPaid: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  createdAt: string;
  bancaId: string;
  isBot?: boolean;
  result?: { category: string; winAmount: number };
}

export interface BingoSettings {
  enabled: boolean;
  ticketPriceDefault: number;
  maxTicketsPerUserDefault: number;
  housePercentDefault: number;
  rtpEnabled: boolean;
  rtpPercent: number;
  preDrawHoldSeconds: number;
  prizeDefaults: { quadra: number; kina: number; keno: number };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: { everyMinutes: number; startHour: number; endHour: number };
}

export interface GenericLotteryConfig {
  id: string;
  nome: string;
  status: 'Ativa' | 'Inativa';
  horarios: { dia: string; horas: string }[];
  multiplicadores: { modalidade: string; multiplicador: string }[];
}

export interface JDBLoteria {
  id: string;
  nome: string;
  modalidades: { nome: string; multiplicador: string }[];
  dias: Record<string, { selecionado: boolean; horarios: string[] }>;
  bancaId: string;
}

export interface Aposta {
  id: string;
  userId: string;
  loteria: string;
  concurso: string;
  data: string;
  valor: string;
  numeros: string;
  status: 'aguardando' | 'premiado' | 'perdeu';
  detalhes: any;
  createdAt: string;
  bancaId: string;
}

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  // Banner/Popups
  banners: Banner[];
  addBanner: (b: Omit<Banner, 'id'>) => void;
  updateBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  popups: Popup[];
  addPopup: (p: Omit<Popup, 'id'>) => void;
  updatePopup: (p: Popup) => void;
  deletePopup: (id: string) => void;
  news: NewsMessage[];
  addNews: (n: Omit<NewsMessage, 'id'>) => void;
  updateNews: (n: NewsMessage) => void;
  deleteNews: (id: string) => void;
  liveMiniPlayerConfig: LiveMiniPlayerConfig;
  updateLiveMiniPlayerConfig: (c: LiveMiniPlayerConfig) => void;

  // Football
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => boolean;
  footballData: FootballSyncData;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;

  // Snooker
  snookerChannels: SnookerChannel[];
  snookerPresence: Record<string, { viewers: string[] }>;
  snookerBets: any[];
  snookerFinancialHistory: any[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerScoreboards: Record<string, any>;
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  joinChannel: (cid: string, uid: string) => void;
  leaveChannel: (cid: string, uid: string) => void;
  placeSnookerBet: (bet: any) => boolean;
  cashOutSnookerBet: (id: string) => void;
  sendSnookerChatMessage: (cid: string, msg: string) => void;
  deleteSnookerChatMessage: (id: string) => void;
  sendSnookerReaction: (cid: string, reaction: string) => void;
  updateSnookerLiveConfig: (config: any) => void;
  addSnookerChannel: (channel: any) => void;
  updateSnookerChannel: (channel: any) => void;
  deleteSnookerChannel: (id: string) => void;
  settleSnookerRound: (cid: string, winner: string) => void;
  updateSnookerScoreboard: (cid: string, sb: any) => void;
  snookerLiveConfig: any;
  snookerChatMessages: any[];
  snookerCashOutLog: any[];

  // Bingo
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoSettings: BingoSettings;
  bingoPayouts: any[];
  buyBingoTickets: (did: string, count: number) => boolean;
  startBingoDraw: (did: string) => void;
  finishBingoDraw: (did: string) => void;
  cancelBingoDraw: (did: string, reason: string) => void;
  refundBingoTicket: (tid: string) => void;
  updateBingoSettings: (s: BingoSettings) => void;
  createBingoDraw: (d: Partial<BingoDraw>) => void;
  payBingoPayout: (id: string) => void;

  // Loterias
  apostas: Aposta[];
  jdbLoterias: JDBLoteria[];
  addJDBLoteria: (l: JDBLoteria) => void;
  updateJDBLoteria: (l: JDBLoteria) => void;
  deleteJDBLoteria: (id: string) => void;
  genericLotteryConfigs: GenericLotteryConfig[];
  updateGenericLottery: (c: GenericLotteryConfig) => void;
  handleFinalizarAposta: (a: any, v: number) => string | null;
  processarResultados: (d: any) => void;
  postedResults: any[];

  // Financeiro
  depositos: any[];
  saques: any[];
  cambistaMovements: any[];
  registerCambistaMovement: (m: any) => void;
  userCommissions: any[];
  promoterCredits: any[];

  activeBancaId: string;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  // Core Auth/User
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  // UI States
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Football
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

  // Snooker
  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<any>(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  // Bingo
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoPayouts, setBingoPayouts] = useState<any[]>([]);
  const [bingoSettings, setBingoSettings] = useState<any>(null);

  // Loterias
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);

  // Financeiro
  const [depositos, setDepositos] = useState<any[]>([]);
  const [saques, setSaques] = useState<any[]>([]);
  const [cambistaMovements, setCambistaMovements] = useState<any[]>([]);
  const [userCommissions, setUserCommissions] = useState<any[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);

  // --- PERSISTENCE LOAD ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setBanners(JSON.parse(localStorage.getItem('app:banners:v1') || '[]'));
    setPopups(JSON.parse(localStorage.getItem('app:popups:v1') || '[]'));
    setNews(JSON.parse(localStorage.getItem('news_messages') || '[]'));
    setLiveMiniPlayerConfig(JSON.parse(localStorage.getItem('live_mini_player_config') || '{"enabled":true,"youtubeUrl":"https://www.youtube.com/watch?v=5Eqb_-j3FDA","youtubeEmbedId":"5Eqb_-j3FDA","title":"Sinuca Profissional Ao Vivo","autoShow":true,"defaultState":"minimized","showOnHome":true,"showOnSinuca":true,"topHeight":96,"bubbleSize":62}'));
    setFootballBets(JSON.parse(localStorage.getItem('app:football_bets:v1') || '[]'));
    setSnookerChannels(JSON.parse(localStorage.getItem('snooker_channels') || '[]'));
    setSnookerBets(JSON.parse(localStorage.getItem('snooker_bets') || '[]'));
    setSnookerFinancialHistory(JSON.parse(localStorage.getItem('snooker_financial_history') || '[]'));
    setSnookerChatMessages(JSON.parse(localStorage.getItem('snooker_chat_messages') || '[]'));
    setSnookerCashOutLog(JSON.parse(localStorage.getItem('snooker_cashout_log') || '[]'));
    setSnookerLiveConfig(JSON.parse(localStorage.getItem('snooker_live_config') || '{"defaultChannelId":"","showLiveBadge":true,"betsEnabled":true,"minBet":5,"maxBet":1000,"cashOutMargin":8,"chatEnabled":true,"reactionsEnabled":true,"profanityFilterEnabled":true}'));
    setBingoDraws(JSON.parse(localStorage.getItem('bingo_draws') || '[]'));
    setBingoTickets(JSON.parse(localStorage.getItem('bingo_tickets') || '[]'));
    setBingoPayouts(JSON.parse(localStorage.getItem('bingo_payouts') || '[]'));
    setBingoSettings(JSON.parse(localStorage.getItem('bingo_settings') || '{"enabled":true,"ticketPriceDefault":0.3,"maxTicketsPerUserDefault":100,"housePercentDefault":10,"rtpEnabled":false,"rtpPercent":85,"preDrawHoldSeconds":10,"prizeDefaults":{"quadra":60,"kina":90,"keno":150},"scheduleMode":"manual","autoSchedule":{"everyMinutes":3,"startHour":0,"endHour":23}}'));
    setApostas(JSON.parse(localStorage.getItem('apostas') || '[]'));
    setGenericLotteryConfigs(JSON.parse(localStorage.getItem('generic_lottery_configs') || '[]'));
    setPostedResults(JSON.parse(localStorage.getItem('posted_results') || '[]'));
    setJdbLoterias(loadBichoLoterias());
    setCambistaMovements(JSON.parse(localStorage.getItem('app:cambista_movements:v1') || '[]'));
    setUserCommissions(JSON.parse(localStorage.getItem('app:user_commissions:v1') || '[]'));
    setPromoterCredits(JSON.parse(localStorage.getItem('app:promoter_creditos:v1') || '[]'));
  }, []);

  // --- PERSISTENCE SAVE ---
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:banners:v1', JSON.stringify(banners)); }, [banners]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:popups:v1', JSON.stringify(popups)); }, [popups]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('news_messages', JSON.stringify(news)); }, [news]);
  useEffect(() => { if (typeof window !== 'undefined' && liveMiniPlayerConfig) localStorage.setItem('live_mini_player_config', JSON.stringify(liveMiniPlayerConfig)); }, [liveMiniPlayerConfig]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:football_bets:v1', JSON.stringify(footballBets)); }, [footballBets]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('snooker_channels', JSON.stringify(snookerChannels)); }, [snookerChannels]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('snooker_bets', JSON.stringify(snookerBets)); }, [snookerBets]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('snooker_financial_history', JSON.stringify(snookerFinancialHistory)); }, [snookerFinancialHistory]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('snooker_chat_messages', JSON.stringify(snookerChatMessages)); }, [snookerChatMessages]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('snooker_cashout_log', JSON.stringify(snookerCashOutLog)); }, [snookerCashOutLog]);
  useEffect(() => { if (typeof window !== 'undefined' && snookerLiveConfig) localStorage.setItem('snooker_live_config', JSON.stringify(snookerLiveConfig)); }, [snookerLiveConfig]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('bingo_draws', JSON.stringify(bingoDraws)); }, [bingoDraws]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('bingo_tickets', JSON.stringify(bingoTickets)); }, [bingoTickets]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('bingo_payouts', JSON.stringify(bingoPayouts)); }, [bingoPayouts]);
  useEffect(() => { if (typeof window !== 'undefined' && bingoSettings) localStorage.setItem('bingo_settings', JSON.stringify(bingoSettings)); }, [bingoSettings]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('apostas', JSON.stringify(apostas)); }, [apostas]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('generic_lottery_configs', JSON.stringify(genericLotteryConfigs)); }, [genericLotteryConfigs]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('posted_results', JSON.stringify(postedResults)); }, [postedResults]);
  useEffect(() => { if (typeof window !== 'undefined') saveBichoLoterias(jdbLoterias); }, [jdbLoterias]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:cambista_movements:v1', JSON.stringify(cambistaMovements)); }, [cambistaMovements]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:user_commissions:v1', JSON.stringify(userCommissions)); }, [userCommissions]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('app:promoter_creditos:v1', JSON.stringify(promoterCredits)); }, [promoterCredits]);

  // --- ACTIONS: BANNERS/POPUPS/NEWS ---
  const addBanner = (b: Omit<Banner, 'id'>) => setBanners(prev => [...prev, { ...b, id: `banner-${Date.now()}` }]);
  const updateBanner = (b: Banner) => setBanners(prev => prev.map(item => item.id === b.id ? b : item));
  const deleteBanner = (id: string) => setBanners(prev => prev.filter(item => item.id !== id));
  
  const addPopup = (p: Omit<Popup, 'id'>) => setPopups(prev => [...prev, { ...p, id: `popup-${Date.now()}` }]);
  const updatePopup = (p: Popup) => setPopups(prev => prev.map(item => item.id === p.id ? p : item));
  const deletePopup = (id: string) => setPopups(prev => prev.filter(item => item.id !== id));

  const addNews = (n: Omit<NewsMessage, 'id'>) => setNews(prev => [...prev, { ...n, id: `news-${Date.now()}` }]);
  const updateNews = (n: NewsMessage) => setNews(prev => prev.map(item => item.id === n.id ? n : item));
  const deleteNews = (id: string) => setNews(prev => prev.filter(item => item.id !== id));

  const updateLiveMiniPlayerConfig = (c: LiveMiniPlayerConfig) => setLiveMiniPlayerConfig(c);

  // --- ACTIONS: FOOTBALL ---
  const addBetToSlip = (bet: BetSlipItem) => {
    if (betSlip.some(item => item.matchId === bet.matchId)) {
      setBetSlip(prev => prev.map(item => item.matchId === bet.matchId ? bet : item));
    } else {
      setBetSlip(prev => [...prev, bet]);
    }
    toast({ title: 'Adicionado ao bilhete', description: `${bet.matchName}: ${bet.selection}` });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = (stake: number): boolean => {
    if (!user) { router.push('/login'); return false; }
    if (balance < stake) { toast({ variant: 'destructive', title: 'Saldo Insuficiente' }); return false; }

    const totalOdds = betSlip.reduce((acc, item) => acc * item.odd, 1);
    const potentialWin = stake * totalOdds;

    const newBet: FootballBet = {
      id: `bet-fb-${Date.now()}`,
      userId: user.id, terminal: user.terminal,
      items: [...betSlip], stake, totalOdds, potentialWin,
      status: 'OPEN', createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
    };

    setFootballBets(prev => [newBet, ...prev]);
    const newBalance = balance - stake;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    clearBetSlip();
    toast({ title: 'Aposta Confirmada!' });
    return true;
  };

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
        if (scoreboard) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboard, league.slug)];
        if (league.useStandings) {
          const table = await espnService.getStandings(league.slug);
          if (table) allStandings[league.slug] = normalizeESPNStandings(table);
        }
      }

      const live = await liveScoreService.getLiveMatches();
      setFootballData(prev => ({
        ...prev, matches: allMatches, standings: allStandings, liveMatches: live,
        lastSync: new Date().toISOString(), syncStatus: 'idle'
      }));
      if (manual) toast({ title: 'Futebol Atualizado!' });
    } catch (e: any) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  // --- ACTIONS: SNOOKER ---
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const clearCelebration = () => setCelebrationTrigger(false);
  const joinChannel = (cid: string, uid: string) => {};
  const leaveChannel = (cid: string, uid: string) => {};
  const placeSnookerBet = (bet: any) => {
    if (!user) { router.push('/login'); return false; }
    if (balance < bet.amount) { toast({ variant: 'destructive', title: 'Saldo Insuficiente' }); return false; }
    const newBet = { ...bet, id: `sno-${Date.now()}`, userId: user.id, userName: user.nome, status: 'open', createdAt: new Date().toISOString() };
    setSnookerBets(prev => [newBet, ...prev]);
    const newBalance = balance - bet.amount;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    return true;
  };
  const cashOutSnookerBet = (id: string) => {};
  const sendSnookerChatMessage = (cid: string, msg: string) => {};
  const deleteSnookerChatMessage = (id: string) => {};
  const sendSnookerReaction = (cid: string, r: string) => {};
  const updateSnookerLiveConfig = (c: any) => setSnookerLiveConfig(c);
  const addSnookerChannel = (c: any) => setSnookerChannels(prev => [...prev, { ...c, id: `sno-ch-${Date.now()}` }]);
  const updateSnookerChannel = (c: any) => setSnookerChannels(prev => prev.map(item => item.id === c.id ? c : item));
  const deleteSnookerChannel = (id: string) => setSnookerChannels(prev => prev.filter(item => item.id !== id));
  const settleSnookerRound = (cid: string, winner: string) => {};
  const updateSnookerScoreboard = (cid: string, sb: any) => {};

  // --- ACTIONS: BINGO ---
  const buyBingoTickets = (did: string, count: number) => {
    if (!user) { router.push('/login'); return false; }
    const draw = bingoDraws.find(d => d.id === did);
    if (!draw) return false;
    const total = draw.ticketPrice * count;
    if (balance < total) { toast({ variant: 'destructive', title: 'Saldo Insuficiente' }); return false; }
    const newTicket: BingoTicket = {
      id: `tkt-${Date.now()}`, drawId: did, userId: user.id, userName: user.nome, terminalId: user.terminal,
      ticketNumbers: [], amountPaid: total, status: 'active', createdAt: new Date().toISOString(), bancaId: 'default'
    };
    setBingoTickets(prev => [...prev, newTicket]);
    const newBalance = balance - total;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    toast({ title: 'Compra Confirmada!' });
    return true;
  };
  const startBingoDraw = (id: string) => {};
  const finishBingoDraw = (id: string) => {};
  const cancelBingoDraw = (id: string, r: string) => {};
  const refundBingoTicket = (id: string) => {};
  const updateBingoSettings = (s: BingoSettings) => setBingoSettings(s);
  const createBingoDraw = (d: any) => setBingoDraws(prev => [...prev, { ...d, id: `draw-${Date.now()}`, drawNumber: prev.length + 1, status: 'scheduled', totalRevenue: 0, totalTickets: 0, payoutTotal: 0, drawnNumbers: [], winnersFound: { quadra: null, kina: null, keno: null }, bancaId: 'default' }]);
  const payBingoPayout = (id: string) => {};

  // --- ACTIONS: LOTERIAS ---
  const addJDBLoteria = (l: JDBLoteria) => setJdbLoterias(prev => [...prev, l]);
  const updateJDBLoteria = (l: JDBLoteria) => setJdbLoterias(prev => prev.map(item => item.id === l.id ? l : item));
  const deleteJDBLoteria = (id: string) => setJdbLoterias(prev => prev.filter(item => item.id !== id));
  const updateGenericLottery = (c: GenericLotteryConfig) => setGenericLotteryConfigs(prev => prev.map(item => item.id === c.id ? c : item));
  const handleFinalizarAposta = (a: any, v: number) => {
    if (!user) { router.push('/login'); return null; }
    if (balance < v) { toast({ variant: 'destructive', title: 'Saldo Insuficiente' }); return null; }
    const poule = generatePoule();
    const newAposta: Aposta = { ...a, id: poule, userId: user.id, status: 'aguardando', createdAt: new Date().toISOString(), bancaId: 'default' };
    setApostas(prev => [newAposta, ...prev]);
    const newBalance = balance - v;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    return poule;
  };
  const processarResultados = (d: any) => setPostedResults(prev => [d, ...prev]);

  // --- ACTIONS: FINANCEIRO ---
  const registerCambistaMovement = (m: any) => setCambistaMovements(prev => [m, ...prev]);

  // --- BOOTSTRAP ---
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }
    syncFootballAll();
  }, []);

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout: () => { authLogout(); setUser(null); router.push('/'); },
      
      banners, addBanner, updateBanner, deleteBanner,
      popups, addPopup, updatePopup, deletePopup,
      news, addNews, updateNews, deleteNews,
      liveMiniPlayerConfig, updateLiveMiniPlayerConfig,

      footballBets, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      footballData, syncFootballAll, updateLeagueConfig: () => {},

      snookerChannels, snookerPresence, snookerBets, snookerFinancialHistory, snookerBetsFeed, snookerActivityFeed, snookerScoreboards,
      celebrationTrigger, clearCelebration, soundEnabled, toggleSound, joinChannel, leaveChannel,
      placeSnookerBet, cashOutSnookerBet, sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction,
      updateSnookerLiveConfig, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, settleSnookerRound, updateSnookerScoreboard,
      snookerLiveConfig, snookerChatMessages, snookerCashOutLog,

      bingoDraws, bingoTickets, bingoSettings, bingoPayouts,
      buyBingoTickets, startBingoDraw, finishBingoDraw, cancelBingoDraw, refundBingoTicket, updateBingoSettings, createBingoDraw, payBingoPayout,

      apostas, jdbLoterias, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria, genericLotteryConfigs, updateGenericLottery,
      handleFinalizarAposta, processarResultados, postedResults,

      depositos, saques, cambistaMovements, registerCambistaMovement, userCommissions, promoterCredits,

      activeBancaId: 'default',
      isFullscreen, toggleFullscreen
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
