'use client';

/**
 * @fileOverview AppContext - Orquestrador Central baseado em Storage Local.
 * Gerencia o estado global de todos os módulos: Futebol, Bingo, Sinuca, Cassino e Loterias.
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

// --- INTERFACES ---

export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

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

export interface JDBModalidade { nome: string; multiplicador: string; }
export interface JDBDia { selecionado: boolean; horarios: string[]; }
export interface JDBLoteria { id: string; bancaId?: string; nome: string; modalidades: JDBModalidade[]; dias: Record<string, JDBDia>; }
export interface GenericLotteryConfig { id: string; nome: string; status: 'Ativa' | 'Inativa'; horarios: { dia: string; horas: string; }[]; multiplicadores: { modalidade: string; multiplicador: string; }[]; }

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

// Interfaces de Bingo e Sinuca (Simplificadas para o contexto síncrono)
export interface BingoTicket { id: string; drawId: string; userId: string; terminalId: string; userName: string; amountPaid: number; ticketNumbers: number[][]; status: 'active' | 'won' | 'lost' | 'refunded'; createdAt: string; bancaId: string; isBot?: boolean; result?: any; }
export interface BingoWinner { category: 'quadra' | 'kina' | 'keno'; terminalId: string; userName: string; winAmount: number; winningNumbers: number[]; wonAt: string; type: 'USER_WIN' | 'BOT_WIN'; }
export interface BingoDraw { id: string; drawNumber: number; scheduledAt: string; startedAt?: string; finishedAt?: string; status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled'; ticketPrice: number; drawnNumbers: number[]; winnersFound: Record<string, BingoWinner | null>; totalRevenue: number; payoutTotal: number; housePercent: number; prizeRules: any; bancaId: string; updatedAt: string; }
export interface BingoSettings { enabled: boolean; rtpEnabled: boolean; rtpPercent: number; ticketPriceDefault: number; housePercentDefault: number; maxTicketsPerUserDefault: number; preDrawHoldSeconds: number; prizeDefaults: any; scheduleMode: 'manual' | 'auto'; autoSchedule: any; }

export interface SnookerBet { id: string; channelId: string; userId: string; userName: string; pick: 'A' | 'B' | 'EMPATE'; amount: number; oddsA: number; oddsB: number; oddsD: number; status: 'open' | 'won' | 'lost' | 'refunded'; createdAt: string; settledAt?: string; }
export interface SnookerChannel { id: string; title: string; youtubeUrl: string; embedId: string; scheduledAt: string; startedAt?: string; playerA: any; playerB: any; scoreA: number; scoreB: number; status: 'scheduled' | 'imminent' | 'live' | 'finished' | 'cancelled'; enabled: boolean; bestOf: number; houseMargin: number; priority: number; viewerCount: number; updatedAt: string; }
export interface SnookerFinancialSummary { id: string; settledAt: string; channelId: string; channelTitle: string; totalPot: number; totalPayout: number; houseProfit: number; roundNumber?: number; }

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  activeBancaId: string;
  
  // Dados
  ledger: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  apostas: Aposta[];
  postedResults: any[];
  jdbLoterias: JDBLoteria[];
  genericLotteryConfigs: GenericLotteryConfig[];
  
  // Futebol
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: any[];
  
  // Bingo & Sinuca
  bingoSettings: BingoSettings;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  snookerChannels: SnookerChannel[];
  snookerBets: SnookerBet[];
  snookerFinancialHistory: SnookerFinancialSummary[];
  snookerPresence: Record<string, any>;
  snookerChatMessages: any[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerScoreboards: Record<string, any>;
  snookerLiveConfig: any;
  snookerCashOutLog: any[];
  
  // Configurações
  liveMiniPlayerConfig: LiveMiniPlayerConfig;
  casinoSettings: any;
  soundEnabled: boolean;
  isFullscreen: boolean;
  celebrationTrigger: boolean;

  // Funções
  refreshData: () => void;
  logout: () => void;
  toggleSound: () => void;
  toggleFullscreen: () => void;
  clearCelebration: () => void;
  
  // Handlers
  addBanner: (b: Banner) => void;
  updateBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  addPopup: (p: Popup) => void;
  updatePopup: (p: Popup) => void;
  deletePopup: (id: string) => void;
  addNews: (m: NewsMessage) => void;
  updateNews: (m: NewsMessage) => void;
  deleteNews: (id: string) => void;
  
  // Loterias
  handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null;
  processarResultados: (dados: any) => void;
  updateGenericLottery: (config: GenericLotteryConfig) => void;
  addJDBLoteria: (loteria: JDBLoteria) => void;
  updateJDBLoteria: (loteria: JDBLoteria) => void;
  deleteJDBLoteria: (id: string) => void;

  // Futebol Handlers
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: any) => void;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;

  // Mini Player
  updateLiveMiniPlayerConfig: (config: LiveMiniPlayerConfig) => void;
  
  // Outros (Bingo/Sinuca stubs para compilar páginas existentes)
  registerCambistaMovement: (move: any) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  deleteSnookerChatMessage: (msgId: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- ESTADO ---
  const [user, setUser] = useState<any>(null);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG, matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });

  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>({
    enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
    autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
    topHeight: 96, bubbleSize: 62
  });

  // Estubs de Bingo/Sinuca/Cassino para as páginas compilarem
  const [bingoSettings] = useState<any>({ enabled: true, ticketPriceDefault: 0.3, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, autoSchedule: {} });
  const [bingoDraws] = useState<any[]>([]);
  const [bingoTickets] = useState<any[]>([]);
  const [snookerChannels] = useState<any[]>([]);
  const [snookerBets] = useState<any[]>([]);
  const [snookerFinancialHistory] = useState<any[]>([]);
  const [snookerPresence] = useState<any>({});
  const [snookerChatMessages] = useState<any[]>([]);
  const [snookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed] = useState<any[]>([]);
  const [snookerScoreboards] = useState<any>({});
  const [snookerLiveConfig] = useState<any>({ enabled: true });
  const [snookerCashOutLog] = useState<any[]>([]);
  const [casinoSettings] = useState<any>({ casinoStatus: true, casinoName: 'LotoHub Casino' });

  // --- CARREGAMENTO ---
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
    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', liveMiniPlayerConfig));
    
    setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES));

    const savedFootball = getStorageItem('app:football:unified:v1', null);
    if (savedFootball) setFootballData(prev => ({ ...prev, ...savedFootball }));
  }, [liveMiniPlayerConfig]);

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

  // --- CRUD HANDLERS ---
  const addBanner = (b: Banner) => { const items = [...banners, b]; setStorageItem('app:banners:v1', items); notify(); };
  const updateBanner = (b: Banner) => { const items = banners.map(i => i.id === b.id ? b : i); setStorageItem('app:banners:v1', items); notify(); };
  const deleteBanner = (id: string) => { const items = banners.filter(i => i.id !== id); setStorageItem('app:banners:v1', items); notify(); };

  const addPopup = (p: Popup) => { const items = [...popups, p]; setStorageItem('app:popups:v1', items); notify(); };
  const updatePopup = (p: Popup) => { const items = popups.map(i => i.id === p.id ? p : i); setStorageItem('app:popups:v1', items); notify(); };
  const deletePopup = (id: string) => { const items = popups.filter(i => i.id !== id); setStorageItem('app:popups:v1', items); notify(); };

  const addNews = (m: NewsMessage) => { const items = [...news, m]; setStorageItem('news_messages', items); notify(); };
  const updateNews = (m: NewsMessage) => { const items = news.map(i => i.id === m.id ? m : i); setStorageItem('news_messages', items); notify(); };
  const deleteNews = (id: string) => { const items = news.filter(i => i.id !== id); setStorageItem('news_messages', items); notify(); };

  const updateGenericLottery = (config: GenericLotteryConfig) => {
    const items = genericLotteryConfigs.map(c => c.id === config.id ? config : c);
    setStorageItem('app:generic_loterias:v1', items);
    notify();
  };

  const addJDBLoteria = (l: JDBLoteria) => {
    const items = [...jdbLoterias, l];
    setStorageItem('app:jdb_loterias:v1', items);
    notify();
  };

  const updateJDBLoteria = (l: JDBLoteria) => {
    const items = jdbLoterias.map(item => item.id === l.id ? l : item);
    setStorageItem('app:jdb_loterias:v1', items);
    notify();
  };

  const deleteJDBLoteria = (id: string) => {
    const items = jdbLoterias.filter(l => l.id !== id);
    setStorageItem('app:jdb_loterias:v1', items);
    notify();
  };

  // --- LOTERIA HANDLERS ---
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

  // --- FUTEBOL HANDLERS ---
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
        const markets = FootballMarketsEngine.generateAllMarkets(probs);
        return { 
          ...match, 
          markets, 
          hasOdds: true, 
          isLive: match.status === 'LIVE', 
          marketStatus: 'OPEN', 
          odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } 
        };
      });

      const data = { matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      toast({ title: 'Sync Concluído' });
    } catch (e) {
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
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`,
      referenceId: pouleId
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

  // --- STUBS E OUTROS ---
  const updateLiveMiniPlayerConfig = (cfg: LiveMiniPlayerConfig) => { setStorageItem('app:mini_player_cfg:v1', cfg); notify(); };
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const clearCelebration = () => setCelebrationTrigger(false);

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      activeBancaId: user?.bancaId || 'default',
      ledger, banners, popups, news, apostas, postedResults, jdbLoterias, genericLotteryConfigs,
      footballData, footballBets, betSlip,
      bingoSettings, bingoDraws, bingoTickets,
      snookerChannels, snookerBets, snookerFinancialHistory, snookerPresence, snookerChatMessages, snookerBetsFeed, snookerActivityFeed, snookerScoreboards, snookerLiveConfig, snookerCashOutLog,
      liveMiniPlayerConfig, casinoSettings, soundEnabled, isFullscreen, celebrationTrigger,
      refreshData: loadLocalData, logout, toggleSound, toggleFullscreen, clearCelebration,
      addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup,
      addNews, updateNews, deleteNews,
      handleFinalizarAposta, processarResultados, updateGenericLottery, addJDBLoteria, updateJDBLoteria, deleteJDBLoteria,
      syncFootballAll, updateLeagueConfig,
      addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet, updateLiveMiniPlayerConfig,
      // Stubs
      registerCambistaMovement: () => {},
      buyBingoTickets: () => false,
      cashOutSnookerBet: () => {},
      sendSnookerChatMessage: () => {},
      deleteSnookerChatMessage: () => {},
      sendSnookerReaction: () => {},
      joinChannel: () => {},
      leaveChannel: () => {}
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
