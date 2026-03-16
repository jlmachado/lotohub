'use client';

/**
 * @fileOverview AppContext - Orquestrador Central de Estado e Sincronização.
 * Atualizado com lógica de visibilidade temporal e regras de mercado unificadas.
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
import { ESPN_LEAGUE_CATALOG } from '@/utils/espn-league-catalog';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { FootballLiveEngine } from '@/services/football-live-engine';
import { JDBNormalizedResult } from '@/types/result-types';
import { useResultsAutoSync } from '@/hooks/use-results-auto-sync';
import { SnookerSyncService } from '@/services/snooker-sync-service';
import { SnookerPriorityService } from '@/services/snooker-priority-service';
import { isValidYoutubeVideoId, isValidYoutubeChannelId } from '@/utils/youtube';
import { getSnookerMarketState } from '@/utils/snooker-rules';

// --- INTERFACES ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }
export interface CasinoSettings { casinoName: string; casinoStatus: boolean; bannerMessage: string; }
export interface JDBModalidade { nome: string; multiplicador: string; }
export interface JDBDia { selecionado: boolean; horarios: string[]; }
export interface JDBLoteria { id: string; bancaId: string; nome: string; stateName?: string; stateCode?: string; modalidades: JDBModalidade[]; dias: Record<string, JDBDia>; }
export interface GenericLotteryConfig { id: string; nome: string; status: 'Ativa' | 'Inativa'; horarios: { dia: string; horas: string }[]; multiplicadores: { modalidade: string; multiplicador: string }[]; }
export interface Aposta { id: string; loteria: string; concurso: string; data: string; valor: string; numeros: string; status: 'aguardando' | 'premiado' | 'perdeu' | 'won' | 'lost'; detalhes?: any[]; userId: string; bancaId: string; createdAt: string; }
export interface FootballBet { id: string; userId: string; bancaId: string; terminal: string; stake: number; potentialWin: number; items: any[]; status: 'OPEN' | 'WON' | 'LOST' | 'VOID'; createdAt: string; settledAt?: string; isDescarga?: boolean; }
export interface FootballData { leagues: any[]; matches: any[]; unifiedMatches: any[]; syncStatus: 'idle' | 'syncing' | 'success' | 'error'; lastSyncAt: string | null; }
export interface LiveMiniPlayerConfig { enabled: boolean; youtubeUrl: string; youtubeEmbedId: string; title: string; autoShow: boolean; defaultState: 'open' | 'minimized'; showOnHome: boolean; showOnSinuca: boolean; topHeight: number; bubbleSize: number; }
export interface BingoSettings { enabled: boolean; rtpEnabled: boolean; rtpPercent: number; ticketPriceDefault: number; maxTicketsPerUserDefault: number; housePercentDefault: number; preDrawHoldSeconds: number; prizeDefaults: { quadra: number; kina: number; keno: number; }; housePercent: number; scheduleMode: 'manual' | 'auto'; autoSchedule: { everyMinutes: number; startHour: number; endHour: number; }; }
export interface BingoDraw { id: string; drawNumber: number; status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled'; drawnNumbers: number[]; winnersFound: { quadra?: any; kina?: any; keno?: any; }; totalTickets: number; totalRevenue: number; payoutTotal: number; bancaId: string; scheduledAt: string; startedAt?: string; finishedAt?: string; ticketPrice: number; prizeRules: { quadra: number; kina: number; keno: number; }; housePercent: number; }
export interface BingoTicket { id: string; drawId: string; userId: string; userName: string; terminalId: string; amountPaid: number; status: 'active' | 'won' | 'lost' | 'refunded'; ticketNumbers: number[]; createdAt: string; isBot?: boolean; bancaId: string; }
export interface BingoPayout { id: string; drawId: string; userId: string; userName: string; terminalId: string; amount: number; status: 'pending' | 'paid' | 'failed' | 'cancelled'; type: 'quadra' | 'kina' | 'keno'; createdAt: string; }

export interface SnookerChannel { 
  id: string; title: string; description: string; youtubeUrl: string; embedId: string; sourceVideoId: string; 
  status: 'scheduled' | 'imminent' | 'live' | 'finished' | 'cancelled'; 
  playerA: { name: string; level: number }; playerB: { name: string; level: number }; 
  scoreA: number; scoreB: number; odds: { A: number; B: number; D: number }; 
  houseMargin: number; bestOf: number; priority: number; enabled: boolean; bancaId: string; 
  createdAt: string; updatedAt: string; source?: 'manual' | 'youtube'; 
  sourceName?: string; sourceId?: string; sourceStatus?: 'detected' | 'synced' | 'error'; 
  autoCreated?: boolean; metadataConfidence?: number; parserNotes?: string[]; 
  thumbnailUrl?: string; tournamentName?: string; isManualOverride?: boolean; 
  isPrimaryCandidate?: boolean; priorityScore?: number; primaryReason?: string; 
  isArchived?: boolean; prizeLabel?: string; phase?: string; contentType?: string; 
  originPriority?: number;
  visibilityStatus?: 'live' | 'upcoming' | 'expired' | 'hidden';
  isExpired?: boolean;
  isUpcoming?: boolean;
  isLiveNow?: boolean;
  // Campos de aposta
  bettingAvailability?: 'all' | 'prelive' | 'live_only' | 'disabled';
  bettingOpensAt?: string;
  bettingClosesAt?: string;
}

export interface SnookerAutomationSource { 
  id: string; name: string; platform: 'youtube'; channelUrl: string; channelHandle: string; channelId: string; 
  enabled: boolean; priority: number; parseProfile: 'tv_snooker_brasil' | 'junior_snooker' | 'generic'; 
  autoCreateChannels: boolean; autoUpdateChannels: boolean; requireAdminApproval: boolean; 
  allowPreMatchBetting: boolean; allowLiveBetting: boolean; createDefaultOddsIfMissing: boolean; 
  keepManualOdds: boolean; markAsFeatured: boolean; fallbackTournamentName?: string; 
  fallbackModality?: string; lastSyncAt?: string; lastSyncStatus?: 'success' | 'error'; 
}
export interface SnookerAutomationSettings { enabled: boolean; sources: SnookerAutomationSource[]; syncIntervalSeconds: number; manualPrimaryChannelId?: string | null; }
export interface SnookerSyncLog { id: string; createdAt: string; type: string; status: 'success' | 'warning' | 'error' | 'info'; message: string; sourceName?: string; relatedChannelId?: string; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number; terminal: string; activeBancaId: string; ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[]; apostas: Aposta[]; postedResults: any[]; jdbResults: JDBNormalizedResult[]; jdbLoterias: JDBLoteria[]; genericLotteryConfigs: GenericLotteryConfig[]; casinoSettings: CasinoSettings; 
  bingoSettings: BingoSettings; bingoDraws: BingoDraw[]; bingoTickets: BingoTicket[]; bingoPayouts: BingoPayout[];
  snookerChannels: SnookerChannel[]; snookerPresence: Record<string, { viewers: string[] }>; snookerFinancialHistory: any[]; snookerBets: any[]; snookerCashOutLog: any[]; snookerLiveConfig: any; snookerActivityFeed: any[]; snookerBetsFeed: any[]; snookerChatMessages: any[]; snookerScoreboards: any; snookerSyncLogs: SnookerSyncLog[]; snookerAutomationSettings: SnookerAutomationSettings; celebrationTrigger: boolean;
  snookerSyncState: 'idle' | 'syncing' | 'success' | 'error'; snookerPrimaryChannelId: string | null;
  footballData: FootballData; footballBets: FootballBet[]; betSlip: any[]; liveMiniPlayerConfig: LiveMiniPlayerConfig; isFullscreen: boolean;
  refreshData: () => void; logout: () => void; handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null; processarResultados: (dados: any) => void; syncFootballAll: (force?: boolean) => Promise<void>; updateLeagueConfig: (id: string, config: any) => void; addBetToSlip: (bet: any) => void; removeBetFromSlip: (id: string) => void; clearBetSlip: () => void; placeFootballBet: (stake: number) => Promise<string | null>; toggleFullscreen: () => void; updateCasinoSettings: (s: CasinoSettings) => void; registerCambistaMovement: (data: { tipo: string, valor: number, modulo: string, observacao: string }) => void; publishJDBResult: (id: string) => void; deleteJDBResult: (id: string) => void;
  updateBingoSettings: (s: BingoSettings) => void; createBingoDraw: (d: Partial<BingoDraw>) => void; startBingoDraw: (id: string) => void; drawBingoBall: (id: string) => void; finishBingoDraw: (id: string) => void; cancelBingoDraw: (id: string, reason: string) => void; buyBingoTickets: (drawId: string, count: number) => boolean; refundBingoTicket: (id: string) => void; payBingoPayout: (id: string) => void;
  joinChannel: (channelId: string, userId: string) => void; leaveChannel: (channelId: string, userId: string) => void; placeSnookerBet: (bet: any) => boolean; cashOutSnookerBet: (betId: string) => void; sendSnookerChatMessage: (channelId: string, text: string) => void; deleteSnookerChatMessage: (id: string) => void; sendSnookerReaction: (channelId: string, reaction: string) => void; updateSnookerLiveConfig: (c: any) => void; updateSnookerScoreboard: (id: string, s: any) => void; addSnookerChannel: (c: any) => void; updateSnookerChannel: (c: any) => void; deleteSnookerChannel: (id: string) => void; settleSnookerRound: (channelId: string, winner: string) => void; clearCelebration: () => void; 
  syncSnookerFromYoutube: (force?: boolean, sourceId?: string) => Promise<void>; updateSnookerAutomationSource: (id: string, updates: Partial<SnookerAutomationSource>) => void; toggleSnookerSource: (id: string, enabled: boolean) => void; approveAutoSnookerChannel: (id: string) => void; archiveAutoSnookerChannel: (id: string) => void; clearSnookerSyncLogs: () => void; updateSnookerAutomationSettings: (s: SnookerAutomationSettings) => void; setManualPrimarySnookerChannel: (id: string | null) => void;
  addBanner: (b: Banner) => void; updateBanner: (b: Banner) => void; deleteBanner: (id: string) => void; addPopup: (p: Popup) => void; updatePopup: (p: Popup) => void; deletePopup: (id: string) => void; addNews: (m: NewsMessage) => void; updateNews: (m: NewsMessage) => void; deleteNews: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- DEFAULTS ---
const DEFAULT_BINGO_SETTINGS: BingoSettings = { enabled: true, rtpEnabled: false, rtpPercent: 20, ticketPriceDefault: 0.3, maxTicketsPerUserDefault: 500, housePercentDefault: 10, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual', autoSchedule: { everyMinutes: 3, startHour: 8, endHour: 23 } };
const DEFAULT_PLAYER_CONFIG: LiveMiniPlayerConfig = { enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo', autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true, topHeight: 96, bubbleSize: 62 };
const DEFAULT_SNOOKER_CFG: any = { defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 5, maxBet: 1000, cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true, updatedAt: new Date().toISOString() };
const DEFAULT_CASINO_SETTINGS: CasinoSettings = { casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está a um clique de distância!' };

const DEFAULT_SOURCES: SnookerAutomationSource[] = [
  { id: "tv-snooker-brasil", name: "TV Snooker Brasil", platform: "youtube", channelHandle: "@TVSnookerBrasil", channelUrl: "https://www.youtube.com/channel/UClp9MNyRB6qqF8G5xg12cGQ", channelId: "UClp9MNyRB6qqF8G5xg12cGQ", enabled: true, priority: 100, parseProfile: "tv_snooker_brasil", autoCreateChannels: true, autoUpdateChannels: true, requireAdminApproval: false, allowPreMatchBetting: true, allowLiveBetting: true, createDefaultOddsIfMissing: true, keepManualOdds: true, markAsFeatured: true, fallbackTournamentName: "TV Snooker Brasil", fallbackModality: "Snooker" },
  { id: "junior-snooker", name: "Junior Snooker", platform: "youtube", channelHandle: "@juniorsnooker", channelUrl: "https://www.youtube.com/channel/UCiB6W2G8RooVFN8R_ciRALA", channelId: "UCiB6W2G8RooVFN8R_ciRALA", enabled: true, priority: 90, parseProfile: "junior_snooker", autoCreateChannels: true, autoUpdateChannels: true, requireAdminApproval: false, allowPreMatchBetting: true, allowLiveBetting: true, createDefaultOddsIfMissing: true, keepManualOdds: true, markAsFeatured: true, fallbackTournamentName: "Junior Snooker", fallbackModality: "Snooker" }
];

const DEFAULT_SNOOKER_AUTOMATION: SnookerAutomationSettings = { enabled: true, sources: DEFAULT_SOURCES, syncIntervalSeconds: 300, manualPrimaryChannelId: null };

/**
 * Utilitário de visibilidade temporal expandido para considerar regras de aposta
 */
const computeChannelVisibility = (channel: SnookerChannel): Partial<SnookerChannel> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const eventDate = new Date(channel.scheduledAt || channel.createdAt);
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

  const isLive = channel.status === 'live';
  const isFinished = channel.status === 'finished' || channel.status === 'cancelled';
  const isExpired = eventDay < today;
  
  let visibilityStatus: SnookerChannel['visibilityStatus'] = 'upcoming';
  
  if (isLive) {
    visibilityStatus = 'live';
  } else if (isExpired) {
    visibilityStatus = 'expired';
  } else if (isFinished) {
    visibilityStatus = 'hidden';
  }

  // Se não tiver regras de aposta, inicializa com padrão aberto
  const bettingAvailability = channel.bettingAvailability || 'all';
  const bettingOpensAt = channel.bettingOpensAt || new Date(eventDate.getTime() - (120 * 60 * 1000)).toISOString();

  return {
    visibilityStatus,
    isExpired,
    isUpcoming: visibilityStatus === 'upcoming',
    isLiveNow: isLive,
    bettingAvailability,
    bettingOpensAt
  };
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
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings>(DEFAULT_CASINO_SETTINGS);
  
  const [bingoSettings, setBingoSettings] = useState<BingoSettings>(DEFAULT_BINGO_SETTINGS);
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoPayouts, setBingoPayouts] = useState<BingoPayout[]>([]);

  const [snookerChannels, setSnookerChannels] = useState<SnookerChannel[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<Record<string, { viewers: string[] }>>({});
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<any[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<any>(DEFAULT_SNOOKER_CFG);
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<any>({});
  const [snookerSyncLogs, setSnookerSyncLogs] = useState<SnookerSyncLog[]>([]);
  const [snookerAutomationSettings, setSnookerAutomationSettings] = useState<SnookerAutomationSettings>(DEFAULT_SNOOKER_AUTOMATION);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const snookerPrimaryChannelId = useMemo(() => {
    const eligible = snookerChannels.filter(c => c.visibilityStatus !== 'expired' && c.visibilityStatus !== 'hidden' && c.enabled);
    return SnookerPriorityService.choosePrimary(eligible, snookerAutomationSettings.manualPrimaryChannelId);
  }, [snookerChannels, snookerAutomationSettings.manualPrimaryChannelId]);

  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({ leagues: [], matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null });

  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>(DEFAULT_PLAYER_CONFIG);

  useResultsAutoSync();

  const loadLocalData = useCallback(() => {
    if (typeof window === 'undefined') return;
    const session = getSession();
    if (session) { const u = getUserByTerminal(session.terminal); setUser(u); } else { setUser(null); }
    
    setLedger(LedgerService.getEntries()); setBanners(getStorageItem('app:banners:v1', [])); setPopups(getStorageItem('app:popups:v1', [])); setNews(getStorageItem('news_messages', [])); setApostas(getStorageItem('app:apostas:v1', [])); setPostedResults(getStorageItem('app:posted_results:v1', [])); setJdbResults(getStorageItem('app:jdb_results:v1', [])); setFootballBets(getStorageItem('app:football_bets:v1', [])); setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS)); setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES)); setCasinoSettings(getStorageItem('app:casino_settings:v1', DEFAULT_CASINO_SETTINGS)); setBingoSettings(getStorageItem('app:bingo_settings:v1', DEFAULT_BINGO_SETTINGS)); setBingoDraws(getStorageItem('app:bingo_draws:v1', [])); setBingoTickets(getStorageItem('app:bingo_tickets:v1', [])); setBingoPayouts(getStorageItem('app:bingo_payouts:v1', [])); 
    
    const savedChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);
    const updatedChannels = savedChannels.map(c => ({ ...c, ...computeChannelVisibility(c) }));
    setSnookerChannels(updatedChannels);

    setSnookerFinancialHistory(getStorageItem('app:snooker_history:v1', [])); setSnookerBets(getStorageItem('app:snooker_bets:v1', [])); setSnookerCashOutLog(getStorageItem('app:snooker_cashout:v1', [])); setSnookerLiveConfig(getStorageItem('app:snooker_cfg:v1', DEFAULT_SNOOKER_CFG)); setSnookerChatMessages(getStorageItem('app:snooker_chat:v1', [])); setSnookerScoreboards(getStorageItem('app:snooker_scores:v1', {})); setSnookerBetsFeed(getStorageItem('app:snooker_bets_feed:v1', [])); setSnookerActivityFeed(getStorageItem('app:snooker_activity_feed:v1', [])); setSnookerSyncLogs(getStorageItem('app:snooker_sync_logs:v1', [])); 
    
    const currentAutomation = getStorageItem<SnookerAutomationSettings>('app:snooker_automation:v1', DEFAULT_SNOOKER_AUTOMATION);
    setSnookerAutomationSettings(currentAutomation); 
    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', DEFAULT_PLAYER_CONFIG));
    const savedFootball = getStorageItem('app:football:unified:v1', null); if (savedFootball) setFootballData(prev => ({ ...prev, ...savedFootball })); else setFootballData(prev => ({ ...prev, leagues: ESPN_LEAGUE_CATALOG }));
  }, []);

  const notify = useCallback(() => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('app:data-changed')); }, []);

  useEffect(() => {
    setMounted(true); loadLocalData(); setIsLoading(false);
    const handleDataChange = () => loadLocalData();
    window.addEventListener('app:data-changed', handleDataChange);
    window.addEventListener('auth-change', handleDataChange);
    return () => { window.removeEventListener('app:data-changed', handleDataChange); window.removeEventListener('auth-change', handleDataChange); };
  }, [loadLocalData]);

  const syncSnookerFromYoutube = useCallback(async (force = false, sourceId?: string) => {
    if (snookerSyncState === 'syncing' && !force) return;
    setSnookerSyncState('syncing');
    
    const settings = getStorageItem<SnookerAutomationSettings>('app:snooker_automation:v1', DEFAULT_SNOOKER_AUTOMATION);
    const sourcesToSync = sourceId ? settings.sources.filter(s => s.id === sourceId) : settings.sources.filter(s => s.enabled);

    if (sourcesToSync.length === 0) { setSnookerSyncState('idle'); return; }

    try {
      let currentChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []);

      for (const source of sourcesToSync) {
        if (!isValidYoutubeChannelId(source.channelId)) continue;

        try {
          const { updatedChannels } = await SnookerSyncService.sync(currentChannels, user?.bancaId || 'default', source, settings);
          currentChannels = updatedChannels;
          source.lastSyncAt = new Date().toISOString();
          source.lastSyncStatus = 'success';
        } catch (e: any) {
          source.lastSyncStatus = 'error';
        }
      }

      const finalizedChannels = currentChannels.map(c => ({ ...c, ...computeChannelVisibility(c) }));

      setStorageItem('app:snooker_channels:v1', finalizedChannels);
      setStorageItem('app:snooker_automation:v1', settings);

      setSnookerSyncState('success');
      notify();
    } catch (e: any) {
      setSnookerSyncState('error');
    }
  }, [user, notify, snookerSyncState]);

  const setManualPrimarySnookerChannel = useCallback((id: string | null) => {
    const settings = { ...snookerAutomationSettings, manualPrimaryChannelId: id };
    setStorageItem('app:snooker_automation:v1', settings);
    setSnookerAutomationSettings(settings);
    notify();
  }, [snookerAutomationSettings, notify]);

  const updateSnookerAutomationSource = useCallback((id: string, updates: Partial<SnookerAutomationSource>) => {
    const settings = getStorageItem<SnookerAutomationSettings>('app:snooker_automation:v1', DEFAULT_SNOOKER_AUTOMATION);
    settings.sources = settings.sources.map(s => s.id === id ? { ...s, ...updates } : s);
    setStorageItem('app:snooker_automation:v1', settings);
    notify();
  }, [notify]);

  const toggleSnookerSource = useCallback((id: string, enabled: boolean) => {
    updateSnookerAutomationSource(id, { enabled });
  }, [updateSnookerAutomationSource]);

  const approveAutoSnookerChannel = useCallback((id: string) => { 
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); 
    setStorageItem('app:snooker_channels:v1', current.map(c => c.id === id ? { ...c, enabled: true, sourceStatus: 'synced' as const } : c)); 
    notify(); 
  }, [notify]);

  const archiveAutoSnookerChannel = useCallback((id: string) => { 
    const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); 
    setStorageItem('app:snooker_channels:v1', current.map(c => c.id === id ? { ...c, isArchived: true, enabled: false } : c)); 
    notify(); 
  }, [notify]);

  const clearSnookerSyncLogs = useCallback(() => { 
    setStorageItem('app:snooker_sync_logs:v1', []); 
    notify(); 
  }, [notify]);

  const updateSnookerAutomationSettings = useCallback((s: SnookerAutomationSettings) => { 
    setStorageItem('app:snooker_automation:v1', s); 
    notify(); 
  }, [notify]);

  const logout = useCallback(() => { authLogout(); setUser(null); notify(); router.push('/login'); }, [notify, router]);
  const toggleFullscreen = useCallback(() => { if (typeof document === 'undefined') return; if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {}); else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {}); }, []);
  const updateCasinoSettings = useCallback((s: CasinoSettings) => { setStorageItem('app:casino_settings:v1', s); notify(); }, [notify]);
  const registerCambistaMovement = useCallback((data: { tipo: string, valor: number, modulo: string, observacao: string }) => { if (!user) return; const typeMap: Record<string, any> = { 'ENTRADA_MANUAL': 'CASH_IN', 'RECOLHE': 'CASH_OUT_RECOLHE', 'FECHAMENTO_CAIXA': 'CASH_CLOSE' }; const ledgerType = typeMap[data.tipo] || 'BALANCE_ADJUST'; const amount = data.tipo === 'ENTRADA_MANUAL' ? data.valor : -data.valor; LedgerService.addEntry({ bancaId: user.bancaId || 'default', userId: user.id, terminal: user.terminal, tipoUsuario: user.tipoUsuario, modulo: data.modulo, type: ledgerType, amount: amount, balanceBefore: user.saldo + user.bonus, balanceAfter: user.saldo + user.bonus + amount, referenceId: `caixa-${Date.now()}`, description: data.observacao }); notify(); }, [user, notify]);
  const publishJDBResult = useCallback((id: string) => { const current = getStorageItem<JDBNormalizedResult[]>('app:jdb_results:v1', []); setStorageItem('app:jdb_results:v1', current.map(r => r.id === id ? { ...r, status: 'PUBLICADO' as const, isSettled: false, publishedAt: new Date().toISOString() } : r)); notify(); }, [notify]);
  const deleteJDBResult = useCallback((id: string) => { const current = getStorageItem<JDBNormalizedResult[]>('app:jdb_results:v1', []); setStorageItem('app:jdb_results:v1', current.filter(r => r.id !== id)); notify(); }, [notify]);
  const updateBingoSettings = useCallback((s: BingoSettings) => { setStorageItem('app:bingo_settings:v1', s); notify(); }, [notify]);
  const createBingoDraw = useCallback((d: Partial<BingoDraw>) => { const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); const nextNum = current.length > 0 ? Math.max(...current.map(x => x.drawNumber)) + 1 : 1001; const newDraw: BingoDraw = { id: `draw-${Date.now()}`, drawNumber: nextNum, status: 'scheduled', drawnNumbers: [], winnersFound: {}, totalTickets: 0, totalRevenue: 0, payoutTotal: 0, bancaId: user?.bancaId || 'default', scheduledAt: new Date().toISOString(), ticketPrice: 0.3, prizeRules: { quadra: 60, kina: 90, keno: 150 }, housePercent: 10, ...d }; setStorageItem('app:bingo_draws:v1', [newDraw, ...current]); notify(); }, [user, notify]);
  const startBingoDraw = useCallback((id: string) => { const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); setStorageItem('app:bingo_draws:v1', current.map(d => d.id === id ? { ...d, status: 'live' as const, startedAt: new Date().toISOString() } : d)); notify(); }, [notify]);
  const drawBingoBall = useCallback((id: string) => { const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); const idx = draws.findIndex(d => d.id === id); if (idx === -1) return; const draw = draws[idx]; const available = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !draw.drawnNumbers.includes(n)); if (available.length === 0) return; const ball = available[Math.floor(Math.random() * available.length)]; const newDrawn = [...draw.drawnNumbers, ball]; draws[idx] = { ...draw, drawnNumbers: newDrawn }; setStorageItem('app:bingo_draws:v1', draws); notify(); }, [notify]);
  const finishBingoDraw = useCallback((id: string) => { const current = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); setStorageItem('app:bingo_draws:v1', current.map(d => d.id === id ? { ...d, status: 'finished' as const, finishedAt: new Date().toISOString() } : d)); notify(); }, [notify]);
  const cancelBingoDraw = useCallback((id: string, reason: string) => { const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); const draw = draws.find(d => d.id === id); if (!draw) return; const tickets = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []); const drawTickets = tickets.filter(t => t.drawId === id && t.status === 'active'); drawTickets.forEach(t => { const u = getUserByTerminal(t.terminalId); if (u) { upsertUser({ terminal: u.terminal, saldo: u.saldo + t.amountPaid }); LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'WITHDRAW', amount: t.amountPaid, balanceBefore: u.saldo, balanceAfter: u.saldo + t.amountPaid, referenceId: t.id, description: `Estorno Bingo: ${reason}` }); } }); setStorageItem('app:bingo_tickets:v1', tickets.map(t => t.drawId === id ? { ...t, status: 'refunded' as const } : t)); setStorageItem('app:bingo_draws:v1', draws.map(d => d.id === id ? { ...d, status: 'cancelled' as const } : d)); notify(); }, [notify]);
  const buyBingoTickets = useCallback((drawId: string, count: number) => { if (!user || count <= 0) return false; const draws = getStorageItem<BingoDraw[]>('app:bingo_draws:v1', []); const draw = draws.find(d => d.id === drawId); if (!draw || (draw.status !== 'scheduled' && draw.status !== 'waiting')) return false; const total = count * draw.ticketPrice; const result = BetService.processBet(user, { userId: user.id, modulo: 'Bingo', valor: total, retornoPotencial: 0, descricao: `Compra ${count} cartelas Bingo`, referenceId: `bin-${drawId}-${Date.now()}` }); if (result.success) { const tickets: BingoTicket[] = Array.from({ length: count }, () => ({ id: `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, drawId, userId: user.id, userName: user.nome || user.terminal, terminalId: user.terminal, amountPaid: draw.ticketPrice, status: 'active', ticketNumbers: Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 1), createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default' })); const currentTkts = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []); setStorageItem('app:bingo_tickets:v1', [...tickets, ...currentTkts]); setStorageItem('app:bingo_draws:v1', draws.map(d => d.id === drawId ? { ...d, totalTickets: d.totalTickets + count, totalRevenue: d.totalRevenue + total } : d)); notify(); return true; } return false; }, [user, notify]);
  const refundBingoTicket = useCallback((id: string) => { const current = getStorageItem<BingoTicket[]>('app:bingo_tickets:v1', []); setStorageItem('app:bingo_tickets:v1', current.map(t => t.id === id ? { ...t, status: 'refunded' as const } : t)); notify(); }, [notify]);
  const payBingoPayout = useCallback((id: string) => { const current = getStorageItem<BingoPayout[]>('app:bingo_payouts:v1', []); setStorageItem('app:bingo_payouts:v1', current.map(p => p.id === id ? { ...p, status: 'paid' as const } : p)); notify(); }, [notify]);

  const joinChannel = useCallback((channelId: string, userId: string) => { setSnookerPresence(prev => { const current = prev[channelId]?.viewers || []; if (current.includes(userId)) return prev; return { ...prev, [channelId]: { viewers: [...current, userId] } }; }); }, []);
  const leaveChannel = useCallback((channelId: string, userId: string) => { setSnookerPresence(prev => { const current = prev[channelId]?.viewers || []; return { ...prev, [channelId]: { viewers: current.filter(id => id !== userId) } }; }); }, []);
  const placeSnookerBet = useCallback((bet: any) => { if (!user) return false; const result = BetService.processBet(user, { userId: user.id, modulo: 'Sinuca', valor: bet.amount, retornoPotencial: 0, descricao: `Sinuca: Aposta em ${bet.pick}`, referenceId: `sno-${bet.channelId}-${Date.now()}` }); if (result.success) { const newBet: any = { ...bet, id: `bet-sno-${Date.now()}`, userId: user.id, userName: user.nome || user.terminal, status: 'open', createdAt: new Date().toISOString() }; const currentBets = getStorageItem<any[]>('app:snooker_bets:v1', []); setStorageItem('app:snooker_bets:v1', [newBet, ...currentBets]); notify(); return true; } return false; }, [user, notify]);
  const cashOutSnookerBet = useCallback((betId: string) => { if (!user) return; const currentBets = getStorageItem<any[]>('app:snooker_bets:v1', []); const bet = currentBets.find(b => b.id === betId); if (!bet || bet.status !== 'open') return; const fairValue = bet.amount; const cashOutValue = fairValue * 0.9; const u = getUserByTerminal(user.terminal); if (u) { const newBal = u.saldo + cashOutValue; upsertUser({ terminal: u.terminal, saldo: newBal }); LedgerService.addEntry({ bancaId: u.bancaId || 'default', userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Sinuca', type: 'CASH_OUT_RECOLHE', amount: cashOutValue, balanceBefore: u.saldo, balanceAfter: newBal, referenceId: betId, description: `Cash Out Sinuca` }); } setStorageItem('app:snooker_bets:v1', currentBets.map(b => b.id === betId ? { ...b, status: 'cash_out' as const } : b)); notify(); }, [user, notify]);
  const sendSnookerChatMessage = useCallback((channelId: string, text: string) => { if (!user) return; const newMessage = { id: `msg-${Date.now()}`, channelId, userId: user.id, userName: user.nome || user.terminal, text, createdAt: new Date().toISOString() }; const currentMsgs = getStorageItem<any[]>('app:snooker_chat:v1', []); setStorageItem('app:snooker_chat:v1', [newMessage, ...currentMsgs].slice(0, 100)); notify(); }, [user, notify]);
  const deleteSnookerChatMessage = useCallback((id: string) => { const current = getStorageItem<any[]>('app:snooker_chat:v1', []); setStorageItem('app:snooker_chat:v1', current.map(m => m.id === id ? { ...m, deleted: true } : m)); notify(); }, [notify]);
  const sendSnookerReaction = useCallback((channelId: string, reaction: string) => { if (!user) return; const entry = { id: Date.now(), channelId, text: `${user.nome || user.terminal} reagiu com ${reaction}`, createdAt: new Date().toISOString() }; const currentFeed = getStorageItem<any[]>('app:snooker_activity_feed:v1', []); setStorageItem('app:snooker_activity_feed:v1', [entry, ...currentFeed].slice(0, 50)); notify(); }, [user, notify]);
  const updateSnookerLiveConfig = useCallback((c: any) => { setStorageItem('app:snooker_cfg:v1', c); notify(); }, [notify]);
  const updateSnookerScoreboard = useCallback((id: string, s: any) => { const current = getStorageItem<any>('app:snooker_scores:v1', {}); setStorageItem('app:snooker_scores:v1', { ...current, [id]: s }); notify(); }, [notify]);
  const addSnookerChannel = useCallback((c: any) => { const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); setStorageItem('app:snooker_channels:v1', [...current, { ...c, scoreA: 0, scoreB: 0, status: 'scheduled', enabled: true, odds: { A: 1.95, B: 1.95, D: 3.20 } }]); notify(); }, [notify]);
  const updateSnookerChannel = useCallback((c: any) => { const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); setStorageItem('app:snooker_channels:v1', current.map(i => i.id === c.id ? c : i)); notify(); }, [notify]);
  const deleteSnookerChannel = useCallback((id: string) => { const current = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); setStorageItem('app:snooker_channels:v1', current.filter(i => i.id !== id)); notify(); }, [notify]);
  const settleSnookerRound = useCallback((channelId: string, winner: string) => { const currentChannels = getStorageItem<SnookerChannel[]>('app:snooker_channels:v1', []); const currentBets = getStorageItem<any[]>('app:snooker_bets:v1', []); const betsToSettle = currentBets.filter(b => b.channelId === channelId && b.status === 'open'); betsToSettle.forEach(bet => { if (bet.pick === winner) { const prize = bet.amount * 1.95; const realUser = getUserByTerminal(bet.userName); if (realUser) { upsertUser({ terminal: realUser.terminal, saldo: realUser.saldo + prize }); LedgerService.addEntry({ bancaId: realUser.bancaId || 'default', userId: realUser.id, terminal: realUser.terminal, tipoUsuario: realUser.tipoUsuario, modulo: 'Sinuca', type: 'BET_WIN', amount: prize, balanceBefore: realUser.saldo, balanceAfter: realUser.saldo + prize, referenceId: bet.id, description: `Prêmio Sinuca` }); } } }); setStorageItem('app:snooker_bets:v1', currentBets.map(b => b.channelId === channelId && b.status === 'open' ? { ...b, status: b.pick === winner ? 'won' as const : 'lost' as const } : b)); if (winner !== 'EMPATE') setCelebrationTrigger(true); notify(); }, [notify]);
  const clearCelebration = useCallback(() => setCelebrationTrigger(false), []);

  const syncFootballAll = useCallback(async (force = false) => { setFootballData(prev => ({ ...prev, syncStatus: 'syncing' })); try { const activeLeagues = getStorageItem('app:football:unified:v1', { leagues: ESPN_LEALOG_CATALOG }).leagues.filter((l: any) => l.active); let allMatches: any[] = []; const leagueStandings: Record<string, any[]> = {}; for (const league of activeLeagues) { const [standingsData, scoreboardData] = await Promise.all([espnService.getStandings(league.slug), espnService.getScoreboard(league.slug)]); if (standingsData) leagueStandings[league.slug] = normalizeESPNStandings(standingsData); if (scoreboardData) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboardData, league.slug)]; } const unified = allMatches.map(match => { const probs = FootballOddsEngine.calculateMatchProbabilities(match.homeTeam.id, match.awayTeam.id, leagueStandings[match.leagueSlug] || [], match.id); const baseModel = { id: match.id, league: match.leagueName, leagueSlug: match.leagueSlug, homeTeam: match.homeTeam.name, awayTeam: match.awayTeam.name, homeLogo: match.homeTeam.logo, awayLogo: match.awayTeam.logo, kickoff: match.date, status: match.status, minute: match.clock || '', scoreHome: match.homeTeam.score, scoreAway: match.awayTeam.score, hasOdds: true, isLive: match.status === 'LIVE', isFinished: match.status === 'FINISHED', marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'OPEN' }; const markets = FootballMarketsEngine.generateAllMarkets(probs); const processed = FootballLiveEngine.processLiveState(baseModel as any, match); return { ...processed, markets, hasOdds: true, odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } }; }); const data = { leagues: ESPN_LEAGUE_CATALOG, matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() }; setStorageItem('app:football:unified:v1', data); setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' })); if (force) toast({ title: 'Sync Concluído' }); } catch (e) { setFootballData(prev => ({ ...prev, syncStatus: 'error' })); } }, [toast]);
  const updateLeagueConfig = useCallback((id: string, config: any) => { setFootballData(prev => { const leagues = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l); const updated = { ...prev, leagues }; setStorageItem('app:football:unified:v1', updated); return updated; }); notify(); }, [notify]);
  const placeFootballBet = useCallback(async (stake: number): Promise<string | null> => { if (!user) { router.push('/login'); return null; } const pouleId = generatePoule(); const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2)); const result = BetService.processBet(user, { userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: totalOdds > 0 ? stake * totalOdds : 0, descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId }); if (result.success) { const currentBets = getStorageItem<FootballBet[]>('app:football_bets:v1', []); setStorageItem('app:football_bets:v1', [{ id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin: stake * totalOdds, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() }, ...currentBets]); setBetSlip([]); notify(); return pouleId; } return null; }, [user, betSlip, notify, router]);
  const handleFinalizarAposta = useCallback((aposta: any, valorTotal: number): string | null => { if (!user) { router.push('/login'); return null; } const pouleId = generatePoule(); const result = BetService.processBet(user, { userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0, descricao: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId }); if (result.success) { const currentApostas = getStorageItem<Aposta[]>('app:apostas:v1', []); setStorageItem('app:apostas:v1', [{ ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() }, ...currentApostas]); notify(); return pouleId; } return null; }, [user, notify, router]);
  const processarResultados = useCallback((dados: any) => { const current = getStorageItem<any[]>('app:posted_results:v1', []); setStorageItem('app:posted_results:v1', [dados, ...current]); notify(); }, [notify]);
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
    user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '', activeBancaId: user?.bancaId || 'default', ledger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, toggleFullscreen, casinoSettings, updateCasinoSettings, registerCambistaMovement, publishJDBResult, deleteJDBResult,
    bingoSettings, bingoDraws, bingoTickets, bingoPayouts, updateBingoSettings, createBingoDraw, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw, buyBingoTickets, refundBingoTicket, payBingoPayout,
    snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerCashOutLog, snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId,
    joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, settleSnookerRound, clearCelebration, syncSnookerFromYoutube, updateSnookerAutomationSource, toggleSnookerSource, approveAutoSnookerChannel, archiveAutoSnookerChannel, clearSnookerSyncLogs, updateSnookerAutomationSettings, setManualPrimarySnookerChannel,
    refreshData: loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, updateLeagueConfig, addBetToSlip: (b: any) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId || i.id !== b.id), b]), removeBetFromSlip: (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]), placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews
  }), [
    user, isLoading, ledger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, bingoSettings, bingoDraws, bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerCashOutLog, snookerLiveConfig, snookerActivityFeed, snookerBetsFeed, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId, loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, updateLeagueConfig, placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews, toggleFullscreen, drawBingoBall, casinoSettings, updateCasinoSettings, publishJDBResult, deleteJDBResult, updateBingoSettings, createBingoDraw, startBingoDraw, finishBingoDraw, cancelBingoDraw, buyBingoTickets, refundBingoTicket, payBingoPayout, registerCambistaMovement, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, settleSnookerRound, clearCelebration, syncSnookerFromYoutube, updateSnookerAutomationSource, toggleSnookerSource, approveAutoSnookerChannel, archiveAutoSnookerChannel, clearSnookerSyncLogs, updateSnookerAutomationSettings, setManualPrimarySnookerChannel
  ]);

  return <AppContext.Provider value={contextValue}>{mounted && children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
