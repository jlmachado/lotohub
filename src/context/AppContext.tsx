'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { generatePoule } from '@/utils/generatePoule';
import { loadBichoLoterias, saveBichoLoterias } from '@/utils/bichoLoteriasStorage';
import { User, getUsers, saveUsers } from '@/utils/usersStorage';
import { getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { NormalizedMatch, NormalizedStanding, syncMatches, syncStandings } from '@/services/football-sync-service';

export interface Aposta {
  id: string;
  userId?: string;
  loteria: string;
  concurso: string;
  data: string;
  createdAt: string;
  valor: string;
  numeros: string;
  status: 'premiado' | 'perdeu' | 'aguardando' | 'won' | 'lost' | 'cash_out';
  detalhes: any;
  usadoSaldo?: number;
  usadoBonus?: number;
}

export interface PostedResult {
  loteria: string;
  jogoDoBichoLoteria?: string;
  horario: string;
  data: string;
  resultados: any;
}

export interface JDBLoteria {
  id: string;
  nome: string;
  modalidades: any[];
  dias: any;
}

export interface NewsMessage {
  id: string;
  text: string;
  order: number;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  position: number;
  active: boolean;
  linkUrl?: string;
  content?: string;
  startAt?: string;
  endAt?: string;
  thumbUrl?: string;
  imageMeta?: any;
}

export interface Popup {
  id: string;
  title: string;
  active: boolean;
  priority: number;
  imageUrl?: string;
  linkUrl?: string;
  description?: string;
  buttonText?: string;
  startAt?: string;
  endAt?: string;
  thumbUrl?: string;
  imageMeta?: any;
}

export interface UserCommission {
  id: string;
  userId: string;
  apostaId: string;
  modulo: string;
  valorAposta: number;
  porcentagem: number;
  valorComissao: number;
  createdAt: string;
}

export interface CambistaMovement {
  id: string;
  userId: string;
  terminal: string;
  tipo: string;
  valor: number;
  createdAt: string;
  modulo?: string;
  observacao?: string;
}

export interface PromoterCreditLog {
  id: string;
  userId: string;
  terminal: string;
  valor: number;
  motivo: string;
  createdAt: string;
}

// BINGO INTERFACES
export interface BingoWinner {
  userId: string;
  userName: string;
  terminalId: string;
  category: string;
  winAmount: number;
  winningNumbers: number[];
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
  prizeRules: {
    quadra: number;
    kina: number;
    keno: number;
  };
  drawnNumbers: number[];
  totalTickets: number;
  totalRevenue: number;
  housePercent: number;
  payoutTotal: number;
  updatedAt: string;
  winnersFound: {
    quadra?: BingoWinner;
    kina?: BingoWinner;
    keno?: BingoWinner;
  };
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  quantity: number;
  amountPaid: number;
  createdAt: string;
  status: 'active' | 'won' | 'lost' | 'refunded';
  ticketNumbers: number[][]; // Each inner array is a card of 25 numbers
  isBot?: boolean;
  result?: {
    winAmount: number;
  };
}

export interface BingoSettings {
  enabled: boolean;
  ticketPriceDefault: number;
  housePercentDefault: number;
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
  maxTicketsPerUserDefault: number;
  preDrawHoldSeconds: number;
  rtpEnabled: boolean;
  rtpPercent: number;
}

// SINUCA INTERFACES
export interface SnookerLiveConfig {
    enabled: boolean;
    defaultChannelId: string;
    showLiveBadge: boolean;
    betsEnabled: boolean;
    minBet: number;
    maxBet: number;
    cashOutMargin: number; // %
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    profanityFilterEnabled: boolean;
    // New Mobile GMP fields
    topHeight: number;
    bubbleSize: number;
    autoShow: boolean;
    defaultState: 'open' | 'minimized';
    showOnHome: boolean;
    showOnSinuca: boolean;
    title: string;
    youtubeUrl: string;
    youtubeEmbedId: string;
}

export interface SnookerChannel {
    id: string;
    title: string;
    description: string;
    youtubeUrl: string;
    embedId: string;
    status: 'scheduled' | 'imminent' | 'live' | 'finished' | 'cancelled';
    scheduledAt: string;
    startedAt?: string;
    finishedAt?: string;
    playerA: { name: string; avatarUrl?: string; level: number };
    playerB: { name: string; avatarUrl?: string; level: number };
    odds: { A: number; B: number; D: number };
    scoreA: number;
    scoreB: number;
    bestOf: number;
    houseMargin: number;
    viewerCount: number;
    priority: number;
    enabled: boolean;
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

export interface SnookerChatMessage {
    id: string;
    channelId: string;
    userId: string;
    userName: string;
    text: string;
    role: 'user' | 'admin';
    createdAt: string;
    deleted?: boolean;
}

export interface SnookerScoreboard {
    id: string; // matchId or channelId
    matchTitle: string;
    playerA: { name: string; avatarUrl?: string };
    playerB: { name: string; avatarUrl?: string };
    scoreA: number;
    scoreB: number;
    frame: number;
    statusText: string;
    round: {
        number: number;
        endsAt?: string;
    }
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

export interface SnookerCashOutLog {
    id: string;
    userId: string;
    userName: string;
    betId: string;
    channelId: string;
    channelTitle: string;
    originalAmount: number;
    originalOdd: number;
    cashOutOdd: number;
    cashOutAmount: number;
    houseProfit: number; // Amount saved or lost by the house
    createdAt: string;
}

export interface FootballSyncData {
  todayMatches: NormalizedMatch[];
  nextMatches: NormalizedMatch[];
  standings: NormalizedStanding[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface AppContextType {
  user: User | null;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  apostas: Aposta[];
  handleFinalizarAposta: (novaAposta: any, custo: number) => string | null;
  
  // Bingo
  bingoSettings: BingoSettings;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  updateBingoSettings: (newSettings: BingoSettings) => void;
  createBingoDraw: (drawData: Omit<BingoDraw, 'id' | 'drawNumber' | 'status' | 'drawnNumbers' | 'totalTickets' | 'totalRevenue' | 'payoutTotal' | 'updatedAt' | 'winnersFound'>) => void;
  buyBingoTickets: (drawId: string, quantity: number) => boolean;
  startBingoDraw: (drawId: string) => void;
  finishBingoDraw: (drawId: string) => void;
  cancelBingoDraw: (drawId: string, reason: string) => void;
  refundBingoTicket: (ticketId: string) => void;
  payBingoPayout: (payoutId: string) => void;
  bingoPayouts: any[]; // Temporary

  // Sinuca
  snookerLiveConfig: SnookerLiveConfig;
  snookerChannels: SnookerChannel[];
  snookerBets: SnookerBet[];
  snookerChatMessages: SnookerChatMessage[];
  snookerScoreboards: Record<string, SnookerScoreboard>;
  snookerFinancialHistory: SnookerFinancialSummary[];
  snookerPresence: Record<string, { viewers: string[] }>;
  snookerCashOutLog: SnookerCashOutLog[];
  updateSnookerLiveConfig: (config: SnookerLiveConfig) => void;
  addSnookerChannel: (channel: Omit<SnookerChannel, 'id' | 'createdAt' | 'updatedAt' | 'viewerCount' | 'scoreA' | 'scoreB' | 'status' | 'odds'>) => void;
  updateSnookerChannel: (channel: SnookerChannel) => void;
  deleteSnookerChannel: (id: string) => void;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  deleteSnookerChatMessage: (messageId: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  placeSnookerBet: (bet: Omit<SnookerBet, 'id' | 'userId' | 'userName' | 'status' | 'createdAt'>) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  updateSnookerScoreboard: (channelId: string, scoreboard: SnookerScoreboard) => void;
  settleSnookerRound: (channelId: string, winner: 'A' | 'B' | 'EMPATE') => void;
  
  // Football
  footballData: FootballSyncData;
  syncFootballMatches: () => Promise<void>;
  syncFootballStandings: () => Promise<void>;

  // Common UI
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // New modules
  news: NewsMessage[];
  addNews: (msg: Omit<NewsMessage, 'id'>) => void;
  updateNews: (msg: NewsMessage) => void;
  deleteNews: (id: string) => void;

  banners: Banner[];
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  updateBanner: (banner: Banner) => void;
  deleteBanner: (id: string) => void;

  popups: Popup[];
  addPopup: (popup: Omit<Popup, 'id'>) => void;
  updatePopup: (popup: Popup) => void;
  deletePopup: (id: string) => void;

  jdbLoterias: JDBLoteria[];
  addJDBLoteria: (loteria: JDBLoteria) => void;
  updateJDBLoteria: (loteria: JDBLoteria) => void;
  deleteJDBLoteria: (id: string) => void;

  postedResults: PostedResult[];
  processarResultados: (params: { loteria: string; jogoDoBichoLoteria?: string; horario: string; data: string; resultados: any }) => void;

  genericLotteryConfigs: any[];
  updateGenericLottery: (config: any) => void;

  casinoSettings: { casinoName: string; casinoStatus: boolean; bannerMessage: string };
  updateCasinoSettings: (settings: { casinoName: string; casinoStatus: boolean; bannerMessage: string }) => void;

  depositos: any[];
  saques: any[];
  cambistaMovements: CambistaMovement[];
  registerCambistaMovement: (movement: Omit<CambistaMovement, 'id' | 'createdAt'>) => void;
  userCommissions: UserCommission[];
  promoterCredits: PromoterCreditLog[];
  addPromoterCredit: (terminal: string, amount: number, reason: string) => void;
  
  liveMiniPlayerConfig: any;
  updateLiveMiniPlayerConfig: (config: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();

  // Authentication & Session
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  // Football State
  const [footballData, setFootballData] = useState<FootballSyncData>({
    todayMatches: [],
    nextMatches: [],
    standings: [],
    lastSync: null,
    syncStatus: 'idle'
  });

  const syncFootballMatches = async () => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const { today, next } = await syncMatches();
      setFootballData(prev => ({
        ...prev,
        todayMatches: today,
        nextMatches: next,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));
      toast({ title: 'Jogos Sincronizados', description: 'Os dados do Brasileirão foram atualizados.' });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: 'Não foi possível buscar os jogos.' });
    }
  };

  const syncFootballStandings = async () => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const standings = await syncStandings();
      setFootballData(prev => ({
        ...prev,
        standings,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));
      toast({ title: 'Classificação Atualizada', description: 'A tabela da Série A foi sincronizada.' });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: 'Não foi possível buscar a tabela.' });
    }
  };

  // Other states...
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [postedResults, setPostedResults] = useState<PostedResult[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = (key: string, def: any) => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : def;
    };

    setApostas(load('app:apostas:v1', []));
    setNews(load('news_messages', []));
    setBanners(load('app:banners:v1', []));
    setPopups(load('app:popups:v1', []));
    setJdbLoterias(loadBichoLoterias());
    setPostedResults(load('app:results:v1', []));
    setFootballData(load('app:football:v1', {
      todayMatches: [],
      nextMatches: [],
      standings: [],
      lastSync: null,
      syncStatus: 'idle'
    }));

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
    localStorage.setItem('app:football:v1', JSON.stringify(footballData));
  }, [footballData]);

  // Mock functions for missing features
  const handleFinalizarAposta = () => null;
  const updateBingoSettings = () => {};
  const createBingoDraw = () => {};
  const buyBingoTickets = () => false;
  const startBingoDraw = () => {};
  const finishBingoDraw = () => {};
  const cancelBingoDraw = () => {};
  const refundBingoTicket = () => {};
  const payBingoPayout = () => {};
  const updateSnookerLiveConfig = () => {};
  const addSnookerChannel = () => {};
  const updateSnookerChannel = () => {};
  const deleteSnookerChannel = () => {};
  const joinChannel = () => {};
  const leaveChannel = () => {};
  const sendSnookerChatMessage = () => {};
  const deleteSnookerChatMessage = () => {};
  const sendSnookerReaction = () => {};
  const placeSnookerBet = () => false;
  const cashOutSnookerBet = () => {};
  const updateSnookerScoreboard = () => {};
  const settleSnookerRound = () => {};
  const addNews = () => {};
  const updateNews = () => {};
  const deleteNews = () => {};
  const addBanner = () => {};
  const updateBanner = () => {};
  const deleteBanner = () => {};
  const addPopup = () => {};
  const updatePopup = () => {};
  const deletePopup = () => {};
  const addJDBLoteria = () => {};
  const updateJDBLoteria = () => {};
  const deleteJDBLoteria = () => {};
  const processarResultados = () => {};
  const updateGenericLottery = () => {};
  const updateCasinoSettings = () => {};
  const registerCambistaMovement = () => {};
  const addPromoterCredit = () => {};
  const updateLiveMiniPlayerConfig = () => {};

  const contextValue: AppContextType = {
    user, balance, bonus, terminal,
    logout: () => { logout(); setUser(null); router.push('/'); },
    apostas, handleFinalizarAposta,
    footballData, syncFootballMatches, syncFootballStandings,
    bingoSettings: { enabled: true } as any, bingoDraws: [], bingoTickets: [],
    updateBingoSettings, createBingoDraw, buyBingoTickets, startBingoDraw, finishBingoDraw,
    cancelBingoDraw, refundBingoTicket, payBingoPayout, bingoPayouts: [],
    snookerLiveConfig: { enabled: true } as any, snookerChannels: [], snookerBets: [],
    snookerChatMessages: [], snookerScoreboards: {}, snookerFinancialHistory: [],
    snookerPresence: {}, snookerCashOutLog: [],
    updateSnookerLiveConfig, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel,
    joinChannel, leaveChannel, sendSnookerChatMessage, deleteSnookerChatMessage,
    sendSnookerReaction, placeSnookerBet, cashOutSnookerBet, updateSnookerScoreboard,
    settleSnookerRound,
    celebrationTrigger, clearCelebration: () => setCelebrationTrigger(false),
    soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled),
    isFullscreen, toggleFullscreen: () => setIsFullscreen(!isFullscreen),
    news, addNews, updateNews, deleteNews,
    banners, addBanner, updateBanner, deleteBanner,
    popups, addPopup, updatePopup, deletePopup,
    jdbLoterias, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria,
    postedResults, processarResultados,
    genericLotteryConfigs: [], updateGenericLottery,
    casinoSettings: { casinoName: 'Casino', casinoStatus: true, bannerMessage: '' }, updateCasinoSettings,
    depositos: [], saques: [], cambistaMovements: [], registerCambistaMovement,
    userCommissions: [], promoterCredits: [], addPromoterCredit,
    liveMiniPlayerConfig: {}, updateLiveMiniPlayerConfig
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
