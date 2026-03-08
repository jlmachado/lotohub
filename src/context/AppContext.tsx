'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { loadBichoLoterias, saveBichoLoterias } from '@/utils/bichoLoteriasStorage';
import { generatePoule as generatePouleUtil } from '@/utils/generatePoule';
import { User, getUsers, saveUsers } from '@/utils/usersStorage';
import { getSession, getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { resolveCurrentBanca, getActiveContext } from '@/utils/bancaContext';
import { syncFootballData as syncFootballService } from '@/services/football-sync';

// --- Snooker Types ---
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
  isDescarga?: boolean;
}

export interface SnookerFinancialSummary {
  id: string;
  channelId: string;
  channelTitle: string;
  roundNumber?: number;
  totalPot: number;
  totalPayout: number;
  houseProfit: number;
  settledAt: string;
}

export interface SnookerChannel {
  id: string;
  bancaId: string;
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

export interface SnookerChatMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  text: string;
  role: 'user' | 'admin';
  deleted: boolean;
  createdAt: string;
}

export interface SnookerScoreboard {
  id: string;
  matchTitle: string;
  playerA: { name: string; avatarUrl?: string };
  playerB: { name: string; avatarUrl?: string };
  scoreA: number;
  scoreB: number;
  frame: number;
  statusText: string;
  round: { number: number; endsAt?: string };
}

// --- Football Types ---
export interface FootballMatch {
  id: string;
  bancaId: string;
  championshipApiId: string;
  homeTeamId: string;
  awayTeamId: string;
  dateTime: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  odds: { home: number; draw: number; away: number };
  isImported: boolean;
  score?: { home: number; away: number };
}

export interface FootballChampionship {
  id: string;
  apiId: string;
  name: string;
  logo: string;
  bancaId: string;
  importar: boolean;
}

export interface FootballTeam {
  id: string;
  bancaId: string;
  name: string;
  logo: string;
}

// --- Other Types ---
export interface NewsMessage {
  id: string;
  bancaId: string;
  text: string;
  order: number;
  active: boolean;
}

export interface Banner {
  id: string;
  bancaId: string;
  title: string;
  content?: string; 
  imageUrl: string;
  thumbUrl?: string;
  linkUrl?: string;
  position: number;
  active: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  imageMeta?: any;
}

export interface Popup {
  id: string;
  bancaId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  thumbUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  active: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  imageMeta?: any;
}

export interface Aposta {
  id: string;
  bancaId: string;
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
  isDescarga?: boolean;
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

export interface PromoterCreditLog {
  id: string;
  userId: string;
  terminal: string;
  valor: number;
  motivo: string;
  createdAt: string;
}

export interface CambistaMovement {
  id: string;
  userId: string;
  terminal: string;
  tipo: "APOSTA" | "PREMIO_PAGO" | "RECOLHE" | "ENTRADA_MANUAL" | "FECHAMENTO_CAIXA";
  modulo?: string;
  apostaId?: string;
  valor: number;
  observacao?: string;
  createdAt: string;
}

export interface PostedResult {
    bancaId: string;
    loteria: string;
    jogoDoBichoLoteria?: string;
    horario: string;
    data: string;
    resultados: any;
}

export interface JDBLoteria {
  id: string;
  bancaId: string;
  nome: string;
  modalidades: JDBModalidade[];
  dias: Record<string, JDBDia>;
}

export interface JDBModalidade {
  nome: string;
  multiplicador: string;
}

export interface JDBDia {
    selecionado: boolean;
    horarios: string[];
}

export interface GenericLotteryConfig {
  id: string;
  bancaId: string;
  nome: string;
  status: 'Ativa' | 'Inativa';
  horarios: { dia: string; horas: string }[];
  multiplicadores: { modalidade: string; multiplicador: string }[];
}

export interface CasinoSettings {
  bancaId: string;
  casinoName: string;
  casinoStatus: boolean;
  bannerMessage: string;
}

export interface BingoDraw { 
  id: string; 
  bancaId: string; 
  drawNumber: number; 
  status: "scheduled" | "waiting" | "live" | "finished" | "cancelled"; 
  scheduledAt: string; 
  ticketPrice: number; 
  prizeRules: { quadra: number, kina: number, keno: number }; 
  drawnNumbers: number[]; 
  totalTickets: number; 
  totalRevenue: number; 
  housePercent: number; 
  payoutTotal: number; 
  updatedAt: string;
  winnersFound: {
    quadra: any | null;
    kina: any | null;
    keno: any | null;
  };
}

export interface BingoTicket { 
  id: string; 
  bancaId: string; 
  drawId: string; 
  userId: string; 
  userName: string;
  terminalId: string;
  quantity: number; 
  amountPaid: number; 
  createdAt: string; 
  status: "active" | "lost" | "won" | "refunded"; 
  ticketNumbers: number[][]; 
  isBot?: boolean; 
}

export interface BingoSettings { 
  bancaId: string; 
  enabled: boolean; 
  ticketPriceDefault: number; 
  housePercentDefault: number; 
  prizeDefaults: { quadra: number, kina: number, keno: number }; 
  scheduleMode: "auto" | "manual"; 
  autoSchedule: { everyMinutes: number, startHour: number, endHour: number }; 
  maxTicketsPerUserDefault: number; 
  preDrawHoldSeconds: number; 
  rtpEnabled: boolean; 
  rtpPercent: number; 
}

export interface SnookerLiveConfig {
  bancaId: string;
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
  autoShow: boolean;
  defaultState: 'open' | 'minimized';
  showOnHome: boolean;
  showOnSinuca: boolean;
  title: string;
  youtubeUrl: string;
  youtubeEmbedId: string;
}

export interface FootballApiConfig {
  bancaId: string;
  provider: 'api-futebol' | 'api-football';
  apiKey: string;
  mode: 'test' | 'live';
  lastSync?: string;
}

interface AppContextType {
  user: User | null;
  balance: number; 
  bonus: number; 
  terminal: string; 
  activeBancaId: string;
  isGlobalMode: boolean;
  logout: () => void;

  apostas: Aposta[]; 
  postedResults: PostedResult[]; 
  jdbLoterias: JDBLoteria[];
  genericLotteryConfigs: GenericLotteryConfig[];
  updateGenericLottery: (config: GenericLotteryConfig) => void;
  handleFinalizarAposta: (novaAposta: Omit<Aposta, 'status' | 'bancaId' | 'id' | 'createdAt'>, custoTotal: number) => string | null;
  processarResultados: (postedResult: Omit<PostedResult, 'bancaId'>) => void;
  addJDBLoteria: (loteria: Omit<JDBLoteria, 'bancaId' | 'id'> & { id?: string }) => void;
  updateJDBLoteria: (loteria: JDBLoteria) => void;
  deleteJDBLoteria: (loteriaId: string) => void;

  news: NewsMessage[];
  addNews: (news: Omit<NewsMessage, 'id' | 'bancaId'>) => void;
  updateNews: (news: NewsMessage) => void;
  deleteNews: (id: string) => void;

  casinoSettings: CasinoSettings; 
  updateCasinoSettings: (settings: Partial<CasinoSettings>) => void;

  banners: Banner[]; 
  popups: Popup[];
  addBanner: (banner: any) => void;
  updateBanner: (banner: Banner) => void;
  deleteBanner: (id: string) => void;
  addPopup: (popup: any) => void;
  updatePopup: (popup: Popup) => void;
  deletePopup: (id: string) => void;
  
  bingoSettings: BingoSettings;
  updateBingoSettings: (settings: BingoSettings) => void;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  buyBingoTickets: (drawId: string, quantity: number) => boolean;

  // Snooker
  snookerLiveConfig: SnookerLiveConfig;
  updateSnookerLiveConfig: (config: SnookerLiveConfig) => void;
  snookerChannels: SnookerChannel[];
  snookerBets: SnookerBet[];
  snookerFinancialHistory: SnookerFinancialSummary[];
  snookerPresence: Record<string, { viewers: string[] }>;
  snookerChatMessages: SnookerChatMessage[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerScoreboards: Record<string, SnookerScoreboard>;
  snookerCashOutLog: any[];
  settleSnookerRound: (channelId: string, winner: 'A' | 'B' | 'EMPATE') => void;
  placeSnookerBet: (bet: Omit<SnookerBet, 'id' | 'userId' | 'userName' | 'status' | 'createdAt'>) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  updateSnookerScoreboard: (channelId: string, scoreboard: SnookerScoreboard) => void;
  addSnookerChannel: (channel: any) => void;
  updateSnookerChannel: (channel: SnookerChannel) => void;
  deleteSnookerChannel: (id: string) => void;
  deleteSnookerChatMessage: (id: string) => void;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
  celebrationTrigger: boolean;
  clearCelebration: () => void;

  // Football
  footballApiConfig: FootballApiConfig;
  updateFootballApiConfig: (config: Partial<FootballApiConfig>) => void;
  footballMatches: FootballMatch[];
  footballChampionships: FootballChampionship[];
  footballTeams: FootballTeam[];
  syncFootballData: () => Promise<void>;
  deleteFootballMatch: (id: string) => void;
  importFootballMatches: (ids: string[]) => void;
  updateFootballChampionship: (id: string, data: Partial<FootballChampionship>) => void;

  userCommissions: UserCommission[];
  cambistaMovements: CambistaMovement[];
  promoterCredits: PromoterCreditLog[];
  registerCambistaMovement: (movement: Omit<CambistaMovement, 'id' | 'createdAt'>) => void;

  soundEnabled: boolean; 
  toggleSound: () => void; 
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

const DEFAULT_GENERIC_LOTTERIES: GenericLotteryConfig[] = [
  {
    id: 'loteria-uruguai',
    bancaId: 'global',
    nome: 'Loteria Uruguai (Quiniela)',
    status: 'Ativa',
    horarios: [
      { dia: 'Segunda a Sexta', horas: '15:00, 21:00' },
      { dia: 'Sábado', horas: '21:00' }
    ],
    multiplicadores: [
      { modalidade: '3 Dígitos', multiplicador: '500x' },
      { modalidade: '2 Dígitos', multiplicador: '70x' },
      { modalidade: '1 Dígito', multiplicador: '7x' }
    ]
  },
  {
    id: 'seninha',
    bancaId: 'global',
    nome: 'Seninha',
    status: 'Ativa',
    horarios: [{ dia: 'Diário', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'SENINHA 14D', multiplicador: '5000x' },
      { modalidade: 'SENINHA 15D', multiplicador: '3500x' },
      { modalidade: 'SENINHA 16D', multiplicador: '2000x' },
      { modalidade: 'SENINHA 17D', multiplicador: '1500x' },
      { modalidade: 'SENINHA 18D', multiplicador: '850x' },
      { modalidade: 'SENINHA 19D', multiplicador: '650x' },
      { modalidade: 'SENINHA 20D', multiplicador: '500x' },
      { modalidade: 'SENINHA 25D', multiplicador: '110x' },
      { modalidade: 'SENINHA 30D', multiplicador: '28x' },
      { modalidade: 'SENINHA 35D', multiplicador: '8x' },
      { modalidade: 'SENINHA 40D', multiplicador: '5x' }
    ]
  },
  {
    id: 'quininha',
    bancaId: 'global',
    nome: 'Quininha',
    status: 'Ativa',
    horarios: [{ dia: 'Diário', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'QUININHA 13D', multiplicador: '5000x' },
      { modalidade: 'QUININHA 14D', multiplicador: '3900x' },
      { modalidade: 'QUININHA 15D', multiplicador: '2700x' },
      { modalidade: 'QUININHA 16D', multiplicador: '2200x' },
      { modalidade: 'QUININHA 17D', multiplicador: '1600x' },
      { modalidade: 'QUININHA 18D', multiplicador: '1100x' },
      { modalidade: 'QUININHA 19D', multiplicador: '800x' },
      { modalidade: 'QUININHA 20D', multiplicador: '700x' },
      { modalidade: 'QUININHA 25D', multiplicador: '180x' },
      { modalidade: 'QUININHA 30D', multiplicador: '65x' },
      { modalidade: 'QUININHA 35D', multiplicador: '29x' },
      { modalidade: 'QUININHA 40D', multiplicador: '10x' },
      { modalidade: 'QUININHA 45D', multiplicador: '7x' }
    ]
  },
  {
    id: 'lotinha',
    bancaId: 'global',
    nome: 'Lotinha',
    status: 'Ativa',
    horarios: [{ dia: 'Diário', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'LOTINHA 16D', multiplicador: '5000x' },
      { modalidade: 'LOTINHA 17D', multiplicador: '200x' },
      { modalidade: 'LOTINHA 18D', multiplicador: '100x' },
      { modalidade: 'LOTINHA 19D', multiplicador: '50x' },
      { modalidade: 'LOTINHA 20D', multiplicador: '25x' },
      { modalidade: 'LOTINHA 21D', multiplicador: '15x' },
      { modalidade: 'LOTINHA 22D', multiplicador: '8x' }
    ]
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  
  // --- Contexto de Banca ---
  const [activeCtx, setActiveCtx] = useState<any>(null);
  const currentBancaId = useMemo(() => activeCtx?.bancaId || 'default', [activeCtx]);
  const isGlobalMode = useMemo(() => activeCtx?.mode === 'GLOBAL', [activeCtx]);

  // --- Estados do Usuário ---
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  // --- Estados de Configuração ---
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings>({
    bancaId: 'global',
    casinoName: 'LotoHub Casino',
    casinoStatus: true,
    bannerMessage: 'Sua sorte está aqui!'
  });
  const [bingoSettings, setBingoSettings] = useState<BingoSettings>({
    bancaId: 'global', enabled: true, ticketPriceDefault: 0.20, housePercentDefault: 10,
    prizeDefaults: { quadra: 20, kina: 30, keno: 50 }, scheduleMode: 'auto',
    autoSchedule: { everyMinutes: 3, startHour: 0, endHour: 23 }, maxTicketsPerUserDefault: 100,
    preDrawHoldSeconds: 10, rtpEnabled: true, rtpPercent: 10
  });
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig>({
    bancaId: 'global', enabled: true, defaultChannelId: '', showLiveBadge: true, betsEnabled: true,
    minBet: 5, maxBet: 500, cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true,
    profanityFilterEnabled: true, topHeight: 96, bubbleSize: 62, autoShow: true,
    defaultState: 'minimized', showOnHome: true, showOnSinuca: true, title: '', youtubeUrl: '', youtubeEmbedId: ''
  });
  const [footballApiConfig, setFootballApiConfig] = useState<FootballApiConfig>({
    bancaId: 'global', provider: 'api-futebol', apiKey: '', mode: 'test'
  });

  // --- Estados de Dados ---
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [postedResults, setPostedResults] = useState<PostedResult[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [userCommissions, setUserCommissions] = useState<UserCommission[]>([]);
  const [cambistaMovements, setCambistaMovements] = useState<CambistaMovement[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<PromoterCreditLog[]>([]);
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);

  // --- Football Data ---
  const [footballMatches, setFootballMatches] = useState<FootballMatch[]>([]);
  const [footballChampionships, setFootballChampionships] = useState<FootballChampionship[]>([]);
  const [footballTeams, setFootballTeams] = useState<FootballTeam[]>([]);

  // --- Snooker Data ---
  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<SnookerFinancialSummary[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<Record<string, { viewers: string[] }>>({});
  const [snookerChatMessages, setSnookerChatMessages] = useState<SnookerChatMessage[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, SnookerScoreboard>>({});
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  // --- UI ---
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Carregamento Inicial ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const load = (key: string, defaults: any) => {
      const stored = localStorage.getItem(key);
      if (!stored) return defaults;
      try { return JSON.parse(stored); } catch { return defaults; }
    };

    const ctx = getActiveContext();
    setActiveCtx(ctx);
    const bancaId = ctx?.bancaId || 'default';

    // Helper para carregar config com herança global
    const loadConfig = (baseKey: string, defaults: any) => {
      const global = load(`${baseKey}:global`, defaults);
      if (ctx?.mode === 'GLOBAL') return global;
      const specific = load(`${baseKey}:${bancaId}`, null);
      return specific || global;
    };

    setGenericLotteryConfigs(loadConfig('app:generic_loterias:v1', DEFAULT_GENERIC_LOTTERIES));
    setCasinoSettings(loadConfig('app:casino_settings:v1', casinoSettings));
    setBingoSettings(loadConfig('app:bingo_settings:v1', bingoSettings));
    setSnookerLiveConfig(loadConfig('app:snooker_live_config:v1', snookerLiveConfig));
    setFootballApiConfig(loadConfig('app:football_api_config:v1', footballApiConfig));
    
    setApostas(load('app:apostas:v1', []));
    setPostedResults(load('app:results:v1', []));
    setJdbLoterias(loadBichoLoterias());
    setNews(load('news_messages', []));
    setBanners(load('app:banners:v1', []));
    setPopups(load('app:popups:v1', []));
    setUserCommissions(load('app:user_commissions:v1', []));
    setCambistaMovements(load('app:cambista_caixa:v1', []));
    setPromoterCredits(load('app:promoter_creditos:v1', []));
    setBingoDraws(load('app:bingo_draws:v1', []));
    setBingoTickets(load('app:bingo_tickets:v1', []));

    setFootballMatches(load('app:football_matches:v1', []));
    setFootballChampionships(load('app:football_champs:v1', []));
    setFootballTeams(load('app:football_teams:v1', []));

    setSnookerChannels(load('app:snooker_channels:v1', []));
    setSnookerBets(load('app:snooker_bets:v1', []));
    setSnookerFinancialHistory(load('app:snooker_history:v1', []));
    setSnookerChatMessages(load('app:snooker_chat:v1', []));
    setSnookerScoreboards(load('app:snooker_scoreboards:v1', {}));
    setSnookerCashOutLog(load('app:snooker_cashout:v1', []));

    const refreshSession = () => {
      const u = getCurrentUser();
      setUser(u);
      setBalance(u?.saldo || 0);
      setBonus(u?.bonus || 0);
      setTerminal(u?.terminal || '');
    };
    refreshSession();
    
    const syncCtx = () => setActiveCtx(getActiveContext());
    window.addEventListener('auth-change', refreshSession);
    window.addEventListener('banca-context-updated', syncCtx);
    
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
    };
    
    // Motor de restauração automática de fullscreen (ex: após impressão)
    const handleFocus = () => {
      const restoreIntent = sessionStorage.getItem('app:restore_fullscreen:v1');
      if (restoreIntent === 'true' && !document.fullscreenElement) {
        // Delay para garantir que a janela recuperou o foco do sistema operacional antes da solicitação
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {
            // Falha silenciosa se o navegador bloquear (política de gesto do usuário)
          });
        }, 300);
      }
      sessionStorage.removeItem('app:restore_fullscreen:v1');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('auth-change', refreshSession);
      window.removeEventListener('banca-context-updated', syncCtx);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // --- Métodos de Atualização ---
  const save = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const getSaveKey = (baseKey: string) => {
    return isGlobalMode ? `${baseKey}:global` : `${baseKey}:${currentBancaId}`;
  };

  const updateGenericLottery = useCallback((config: GenericLotteryConfig) => {
    setGenericLotteryConfigs(prev => {
      const updated = prev.map(l => l.id === config.id ? config : l);
      if (!prev.some(l => l.id === config.id)) updated.push(config);
      save(getSaveKey('app:generic_loterias:v1'), updated);
      return updated;
    });
  }, [isGlobalMode, currentBancaId]);

  const updateCasinoSettings = useCallback((settings: Partial<CasinoSettings>) => {
    setCasinoSettings(prev => {
      const updated = { ...prev, ...settings };
      save(getSaveKey('app:casino_settings:v1'), updated);
      return updated;
    });
  }, [isGlobalMode, currentBancaId]);

  const updateBingoSettings = useCallback((settings: BingoSettings) => {
    setBingoSettings(settings);
    save(getSaveKey('app:bingo_settings:v1'), settings);
  }, [isGlobalMode, currentBancaId]);

  const updateSnookerLiveConfig = useCallback((config: SnookerLiveConfig) => {
    setSnookerLiveConfig(config);
    save(getSaveKey('app:snooker_live_config:v1'), config);
  }, [isGlobalMode, currentBancaId]);

  const updateFootballApiConfig = useCallback((config: Partial<FootballApiConfig>) => {
    setFootballApiConfig(prev => {
      const updated = { ...prev, ...config } as FootballApiConfig;
      save(getSaveKey('app:football_api_config:v1'), updated);
      return updated;
    });
  }, [isGlobalMode, currentBancaId]);

  // --- Football Sync ---
  const syncFootballData = useCallback(async () => {
    const result = await syncFootballService(
      { championships: footballChampionships, teams: footballTeams, matches: footballMatches },
      footballApiConfig
    );

    if (result.success) {
      const updatedChamps = [...footballChampionships, ...result.newChampionships];
      const updatedTeams = [...footballTeams, ...result.newTeams];
      const updatedMatches = [...footballMatches, ...result.newMatches];

      setFootballChampionships(updatedChamps);
      setFootballTeams(updatedTeams);
      setFootballMatches(updatedMatches);

      save('app:football_champs:v1', updatedChamps);
      save('app:football_teams:v1', updatedTeams);
      save('app:football_matches:v1', updatedMatches);
      
      updateFootballApiConfig({ lastSync: new Date().toISOString() });
      toast({ title: 'Sucesso', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: result.message });
    }
  }, [footballChampionships, footballTeams, footballMatches, footballApiConfig, updateFootballApiConfig, toast]);

  const deleteFootballMatch = useCallback((id: string) => {
    setFootballMatches(prev => {
      const updated = prev.filter(m => m.id !== id);
      save('app:football_matches:v1', updated);
      return updated;
    });
  }, []);

  const importFootballMatches = useCallback((ids: string[]) => {
    setFootballMatches(prev => {
      const updated = prev.map(m => ids.includes(m.id) ? { ...m, isImported: true } : m);
      save('app:football_matches:v1', updated);
      return updated;
    });
    toast({ title: 'Sucesso', description: `${ids.length} partidas importadas para o painel de apostas.` });
  }, [toast]);

  const updateFootballChampionship = useCallback((id: string, data: Partial<FootballChampionship>) => {
    setFootballChampionships(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      save('app:football_champs:v1', updated);
      return updated;
    });
  }, []);

  const addJDBLoteria = useCallback((loteria: any) => {
    const bancaId = isGlobalMode ? 'global' : (resolveCurrentBanca()?.id || 'default');
    const newLoteria = { ...loteria, id: loteria.id || loteria.nome.toLowerCase().replace(/\s+/g, '-'), bancaId };
    setJdbLoterias(prev => {
      const updated = [...prev, newLoteria];
      saveBichoLoterias(updated);
      return updated;
    });
  }, [isGlobalMode]);

  const updateJDBLoteria = useCallback((loteria: JDBLoteria) => {
    setJdbLoterias(prev => {
      const updated = prev.map(l => l.id === loteria.id ? loteria : l);
      saveBichoLoterias(updated);
      return updated;
    });
  }, []);

  const deleteJDBLoteria = useCallback((id: string) => {
    setJdbLoterias(prev => {
      const updated = prev.filter(l => l.id !== id);
      saveBichoLoterias(updated);
      return updated;
    });
  }, []);

  // --- Lógica de Aposta ---
  const handleFinalizarAposta = useCallback((novaAposta: any, custoTotal: number) => {
    const u = getCurrentUser();
    if (!u) return null;

    const banca = resolveCurrentBanca();
    const isCambista = u.tipoUsuario === 'CAMBISTA';
    
    if (!isCambista && (u.saldo + u.bonus) < custoTotal) {
      toast({ variant: 'destructive', title: 'Saldo Insuficiente' });
      return null;
    }

    const pouleId = generatePouleUtil();
    const now = new Date().toISOString();
    
    if (!isCambista) {
      let restante = custoTotal;
      const debitoSaldo = Math.min(u.saldo, restante);
      restante -= debitoSaldo;
      const debitoBonus = restante;
      
      const updatedUsers = getUsers().map(usr => 
        usr.id === u.id ? { ...usr, saldo: usr.saldo - debitoSaldo, bonus: usr.bonus - debitoBonus } : usr
      );
      saveUsers(updatedUsers);
      setBalance(u.saldo - debitoSaldo);
      setBonus(u.bonus - debitoBonus);
    }

    const apostaCompleta: Aposta = {
      ...novaAposta,
      id: pouleId,
      bancaId: banca?.id || 'default',
      userId: u.id,
      status: 'aguardando',
      createdAt: now
    };

    setApostas(prev => {
      const updated = [apostaCompleta, ...prev];
      save('app:apostas:v1', updated);
      return updated;
    });

    return pouleId;
  }, [toast]);

  const registerCambistaMovement = useCallback((movement: any) => {
    setCambistaMovements(prev => {
      const updated = [{ ...movement, id: `c-move-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev];
      save('app:cambista_caixa:v1', updated);
      return updated;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  }, []);

  // --- Snooker Methods ---
  const addSnookerChannel = useCallback((channel: any) => {
    const bancaId = isGlobalMode ? 'global' : (resolveCurrentBanca()?.id || 'default');
    setSnookerChannels(prev => {
      const updated = [...prev, { ...channel, id: `sno-${Date.now()}`, bancaId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      save('app:snooker_channels:v1', updated);
      return updated;
    });
  }, [isGlobalMode]);

  const updateSnookerChannel = useCallback((channel: SnookerChannel) => {
    setSnookerChannels(prev => {
      const updated = prev.map(c => c.id === channel.id ? { ...channel, updatedAt: new Date().toISOString() } : c);
      save('app:snooker_channels:v1', updated);
      return updated;
    });
  }, []);

  const deleteSnookerChannel = useCallback((id: string) => {
    setSnookerChannels(prev => {
      const updated = prev.filter(c => c.id !== id);
      save('app:snooker_channels:v1', updated);
      return updated;
    });
  }, []);

  // --- List Filtering (Para Usuários Finais) ---
  const filteredJDBLoterias = useMemo(() => jdbLoterias.filter(l => l.bancaId === 'global' || l.bancaId === currentBancaId), [jdbLoterias, currentBancaId]);
  const filteredBanners = useMemo(() => banners.filter(b => b.bancaId === 'global' || b.bancaId === currentBancaId), [banners, currentBancaId]);
  const filteredPopups = useMemo(() => popups.filter(p => p.bancaId === 'global' || p.bancaId === currentBancaId), [popups, currentBancaId]);
  const filteredNews = useMemo(() => news.filter(n => n.bancaId === 'global' || n.bancaId === currentBancaId), [news, currentBancaId]);
  const filteredSnookerChannels = useMemo(() => snookerChannels.filter(c => c.bancaId === 'global' || c.bancaId === currentBancaId), [snookerChannels, currentBancaId]);

  const contextValue = useMemo(() => ({
    user, balance, bonus, terminal, activeBancaId: currentBancaId, isGlobalMode,
    logout: () => { logout(); setUser(null); router.push('/'); },
    apostas, postedResults, jdbLoterias: filteredJDBLoterias, genericLotteryConfigs, updateGenericLottery,
    handleFinalizarAposta, processarResultados: () => {},
    addJDBLoteria, updateJDBLoteria, deleteJDBLoteria,
    news: filteredNews, 
    addNews: (n: any) => setNews(prev => { const upd = [...prev, {...n, bancaId: isGlobalMode ? 'global' : currentBancaId, id: `n-${Date.now()}`}]; save('news_messages', upd); return upd; }),
    updateNews: (n: any) => setNews(prev => { const upd = prev.map(i => i.id === n.id ? n : i); save('news_messages', upd); return upd; }),
    deleteNews: (id: string) => setNews(prev => { const upd = prev.filter(i => i.id !== id); save('news_messages', upd); return upd; }),
    casinoSettings, updateCasinoSettings,
    banners: filteredBanners, popups: filteredPopups,
    addBanner: (b: any) => setBanners(prev => { const upd = [...prev, {...b, bancaId: isGlobalMode ? 'global' : currentBancaId, id: `b-${Date.now()}`, createdAt: new Date().toISOString()}]; save('app:banners:v1', upd); return upd; }),
    updateBanner: (b: any) => setBanners(prev => { const upd = prev.map(i => i.id === b.id ? b : i); save('app:banners:v1', upd); return upd; }),
    deleteBanner: (id: string) => setBanners(prev => { const upd = prev.filter(i => i.id !== id); save('app:banners:v1', upd); return upd; }),
    addPopup: (p: any) => setPopups(prev => { const upd = [...prev, {...p, bancaId: isGlobalMode ? 'global' : currentBancaId, id: `p-${Date.now()}`, createdAt: new Date().toISOString()}]; save('app:popups:v1', upd); return upd; }),
    updatePopup: (p: any) => setPopups(prev => { const upd = prev.map(i => i.id === p.id ? p : i); save('app:popups:v1', upd); return upd; }),
    deletePopup: (id: string) => setPopups(prev => { const upd = prev.filter(i => i.id !== id); save('app:popups:v1', upd); return upd; }),
    bingoSettings, updateBingoSettings, bingoDraws, bingoTickets, buyBingoTickets: () => false,
    
    // Snooker Value
    snookerLiveConfig, updateSnookerLiveConfig,
    snookerChannels: filteredSnookerChannels, snookerBets, snookerFinancialHistory, snookerPresence, snookerChatMessages,
    snookerBetsFeed, snookerActivityFeed, snookerScoreboards, snookerCashOutLog,
    settleSnookerRound: () => {}, placeSnookerBet: () => false, cashOutSnookerBet: () => {},
    sendSnookerChatMessage: () => {}, sendSnookerReaction: () => {}, updateSnookerScoreboard: () => {},
    addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, deleteSnookerChatMessage: () => {},
    joinChannel: () => {}, leaveChannel: () => {}, celebrationTrigger, clearCelebration: () => setCelebrationTrigger(false),

    // Football Value
    footballApiConfig, updateFootballApiConfig,
    footballMatches, footballChampionships, footballTeams,
    syncFootballData, deleteFootballMatch, importFootballMatches, updateFootballChampionship,

    userCommissions, cambistaMovements, promoterCredits, registerCambistaMovement,
    soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled),
    isFullscreen, toggleFullscreen
  }), [user, balance, bonus, terminal, currentBancaId, isGlobalMode, apostas, filteredJDBLoterias, genericLotteryConfigs, filteredNews, casinoSettings, filteredBanners, filteredPopups, bingoSettings, snookerLiveConfig, filteredSnookerChannels, snookerBets, snookerFinancialHistory, snookerPresence, snookerChatMessages, snookerBetsFeed, snookerActivityFeed, snookerScoreboards, snookerCashOutLog, celebrationTrigger, footballApiConfig, footballMatches, footballChampionships, footballTeams, userCommissions, cambistaMovements, promoterCredits, soundEnabled, isFullscreen, toggleFullscreen, logout, updateGenericLottery, updateCasinoSettings, updateBingoSettings, updateSnookerLiveConfig, updateFootballApiConfig, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria, registerCambistaMovement, handleFinalizarAposta, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, syncFootballData, deleteFootballMatch, importFootballMatches, updateFootballChampionship]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
