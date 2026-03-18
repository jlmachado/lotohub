'use client';

/**
 * @fileOverview AppContext - Orquestrador Central com Sincronização em Tempo Real.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { getUserByTerminal, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG } from '@/utils/espn-league-catalog';
import { SnookerPriorityService } from '@/services/snooker-priority-service';
import { normalizeESPNScoreboard } from '@/utils/espn-normalizer';
import { MatchMapperService } from '@/services/match-mapper-service';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { SnookerSyncService } from '@/services/snooker-sync-service';

// Firebase
import { useFirestore, initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, DocumentData } from 'firebase/firestore';
import { MigrationService } from '@/services/migration-service';
import { BaseRepository } from '@/repositories/base-repository';

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
export interface FootballBet { id: string; userId: string; bancaId: string; terminal: string; stake: number; potentialWin: number; items: any[]; status: 'OPEN' | 'WON' | 'LOST' | 'VOID'; createdAt: string; settledAt?: string; hideOnTerminal?: boolean; isDescarga?: boolean; }
export interface FootballData { leagues: any[]; matches: any[]; unifiedMatches: any[]; syncStatus: 'idle' | 'syncing' | 'success' | 'error'; lastSyncAt: string | null; }
export interface LiveMiniPlayerConfig { enabled: boolean; youtubeUrl: string; youtubeEmbedId: string; title: string; autoShow: boolean; defaultState: 'open' | 'minimized'; showOnHome: boolean; showOnSinuca: boolean; topHeight: number; bubbleSize: number; }
export interface BingoSettings { enabled: boolean; rtpEnabled: boolean; rtpPercent: number; ticketPriceDefault: number; maxTicketsPerUserDefault: number; housePercentDefault: number; preDrawHoldSeconds: number; prizeDefaults: { quadra: number; kina: number; keno: number; }; housePercent: number; scheduleMode: 'manual' | 'auto'; autoSchedule: { everyMinutes: number; startHour: number; endHour: number; }; }
export interface BingoDraw { id: string; drawNumber: number; status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled'; drawnNumbers: number[]; winnersFound: { quadra?: any; kina?: any; keno?: any; }; totalTickets: number; totalRevenue: number; payoutTotal: number; bancaId: string; scheduledAt: string; startedAt?: string; finishedAt?: string; ticketPrice: number; prizeRules: { quadra: number; kina: number; keno: number; }; housePercent: number; }
export interface BingoTicket { id: string; drawId: string; userId: string; userName: string; terminalId: string; amountPaid: number; status: 'active' | 'won' | 'lost' | 'refunded'; ticketNumbers: number[]; createdAt: string; isBot?: boolean; bancaId: string; }
export interface BingoPayout { id: string; drawId: string; userId: string; userName: string; terminalId: string; amount: number; status: 'pending' | 'paid' | 'failed' | 'cancelled'; type: 'quadra' | 'kina' | 'keno'; createdAt: string; }

export interface SnookerFinancialSummary { id: string; settledAt: string; channelId: string; channelTitle: string; roundNumber: number; totalPot: number; totalPayout: number; houseProfit: number; winner: string; }
export interface SnookerChannel { id: string; title: string; description: string; youtubeUrl: string; embedId: string; sourceVideoId: string; status: 'scheduled' | 'imminent' | 'live' | 'finished' | 'cancelled'; playerA: { name: string; level: number }; playerB: { name: string; level: number }; scoreA: number; scoreB: number; odds: { A: number; B: number; D: number }; houseMargin: number; bestOf: number; priority: number; enabled: boolean; bancaId: string; createdAt: string; updatedAt: string; source?: 'manual' | 'youtube'; sourceName?: string; sourceId?: string; sourceStatus?: 'detected' | 'synced' | 'error'; autoCreated?: boolean; metadataConfidence?: number; thumbnailUrl?: string; tournamentName?: string; isManualOverride?: boolean; isPrimaryCandidate?: boolean; priorityScore?: number; primaryReason?: string; isArchived?: boolean; prizeLabel?: string; phase?: string; visibilityStatus?: 'live' | 'upcoming' | 'expired' | 'hidden'; scoreOverlayProfile?: string; originPriority?: number; }
export interface SnookerBet { id: string; channelId: string; userId: string; userName: string; pick: 'A' | 'B' | 'EMPATE'; amount: number; oddsA: number; oddsB: number; oddsD: number; status: 'open' | 'won' | 'lost' | 'cash_out' | 'refunded'; createdAt: string; bancaId: string; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number; terminal: string; activeBancaId: string; ledger: any[]; allUsers: any[]; fullLedger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[]; apostas: Aposta[]; postedResults: any[]; jdbResults: JDBNormalizedResult[]; jdbLoterias: JDBLoteria[]; genericLotteryConfigs: GenericLotteryConfig[]; casinoSettings: CasinoSettings; 
  bingoSettings: BingoSettings; bingoDraws: BingoDraw[]; bingoTickets: BingoTicket[]; bingoPayouts: BingoPayout[];
  snookerChannels: SnookerChannel[]; snookerPresence: Record<string, { viewers: string[] }>; snookerFinancialHistory: SnookerFinancialSummary[]; snookerBets: SnookerBet[]; snookerCashOutLog: any[]; snookerLiveConfig: any; snookerActivityFeed: any[]; snookerBetsFeed: any[]; snookerChatMessages: any[]; snookerScoreboards: Record<string, any>; snookerSyncLogs: any[]; snookerAutomationSettings: any; celebrationTrigger: boolean;
  snookerSyncState: 'idle' | 'syncing' | 'success' | 'error'; snookerPrimaryChannelId: string | null;
  snookerScoreRecognitionSettings: any; snookerCurrentReading: any;
  footballData: FootballData; footballBets: FootballBet[]; betSlip: any[]; liveMiniPlayerConfig: LiveMiniPlayerConfig; isFullscreen: boolean;
  refreshData: () => void; logout: () => void; handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null; processarResultados: (dados: any) => void; syncFootballAll: (force?: boolean) => Promise<void>; updateLeagueConfig: (id: string, config: any) => void; findLeagueById: (id: string) => any; addBetToSlip: (bet: any) => void; removeBetFromSlip: (id: string) => void; clearBetSlip: () => void; placeFootballBet: (stake: number) => Promise<string | null>; toggleFullscreen: () => void; updateCasinoSettings: (s: CasinoSettings) => void; registerCambistaMovement: (data: { tipo: string, valor: number, modulo: string, observacao: string }) => void; publishJDBResult: (id: string) => void; deleteJDBResult: (id: string) => void;
  updateBingoSettings: (s: BingoSettings) => void; createBingoDraw: (d: Partial<BingoDraw>) => void; startBingoDraw: (id: string) => void; drawBingoBall: (id: string) => void; finishBingoDraw: (id: string) => void; cancelBingoDraw: (id: string, reason: string) => void; buyBingoTickets: (drawId: string, count: number) => boolean; refundBingoTicket: (id: string) => void; payBingoPayout: (id: string) => void;
  joinChannel: (channelId: string, userId: string) => void; leaveChannel: (channelId: string, userId: string) => void; placeSnookerBet: (bet: any) => boolean; cashOutSnookerBet: (betId: string) => void; sendSnookerChatMessage: (channelId: string, text: string) => void; deleteSnookerChatMessage: (id: string) => void; sendSnookerReaction: (channelId: string, reaction: string) => void; updateSnookerLiveConfig: (c: any) => void; updateSnookerScoreboard: (id: string, s: any) => void; addSnookerChannel: (c: any) => void; updateSnookerChannel: (c: any) => void; deleteSnookerChannel: (id: string) => void; settleSnookerRound: (channelId: string, winner: string) => void; clearCelebration: () => void; 
  syncSnookerFromYoutube: (force?: boolean, sourceId?: string) => Promise<void>; updateSnookerAutomationSource: (id: string, updates: Partial<any>) => void; toggleSnookerSource: (id: string, enabled: boolean) => void; approveAutoSnookerChannel: (id: string) => void; archiveAutoSnookerChannel: (id: string) => void; clearSnookerSyncLogs: () => void; updateSnookerAutomationSettings: (s: any) => void; setManualPrimarySnookerChannel: (id: string | null) => void;
  updateSnookerScoreRecognitionSettings: (s: any) => void;
  addBanner: (b: Banner) => void; updateBanner: (b: Banner) => void; deleteBanner: (id: string) => void; addPopup: (p: Popup) => void; updatePopup: (p: Popup) => void; deletePopup: (id: string) => void; addNews: (m: NewsMessage) => void; updateNews: (m: NewsMessage) => void; deleteNews: (id: string) => void;
  updateGenericLottery: (c: GenericLotteryConfig) => void; updateJDBLoteria: (l: JDBLoteria) => void; addJDBLoteria: (l: JDBLoteria) => void; deleteJDBLoteria: (id: string) => void; updateLiveMiniPlayerConfig: (c: LiveMiniPlayerConfig) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- DEFAULTS ---
const DEFAULT_BINGO_SETTINGS: BingoSettings = { enabled: true, rtpEnabled: false, rtpPercent: 20, ticketPriceDefault: 0.3, maxTicketsPerUserDefault: 500, housePercentDefault: 10, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual', autoSchedule: { everyMinutes: 3, startHour: 8, endHour: 23 }, housePercent: 10 };
const DEFAULT_PLAYER_CONFIG: LiveMiniPlayerConfig = { enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo', autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true, topHeight: 96, bubbleSize: 62 };
const DEFAULT_SNOOKER_CFG: any = { defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 5, maxBet: 1000, cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true, updatedAt: new Date().toISOString() };
const DEFAULT_CASINO_SETTINGS: CasinoSettings = { casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está a um clique de distância!' };

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const firestore = useFirestore();
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [fullLedger, setFullLedger] = useState<any[]>([]);
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
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<SnookerFinancialSummary[]>([]);
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<any>(DEFAULT_SNOOKER_CFG);
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  const [snookerSyncLogs, setSnookerSyncLogs] = useState<any[]>([]);
  const [snookerAutomationSettings, setSnookerAutomationSettings] = useState<any>({ sources: [], manualPrimaryChannelId: null });
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [snookerPrimaryChannelId, setSnookerPrimaryChannelId] = useState<string | null>(null);
  const [snookerScoreRecognitionSettings, setSnookerScoreRecognitionSettings] = useState<any>({ enabled: false });
  const [snookerCurrentReading, setSnookerCurrentReading] = useState<any>(null);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({ leagues: [], matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null });
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>(DEFAULT_PLAYER_CONFIG);

  // Cloud Repositories
  const bannersRepo = useMemo(() => new BaseRepository<Banner>('banners'), []);
  const popupsRepo = useMemo(() => new BaseRepository<Popup>('popups'), []);
  const newsRepo = useMemo(() => new BaseRepository<NewsMessage>('news_messages'), []);
  const apostasRepo = useMemo(() => new BaseRepository<Aposta>('apostas'), []);
  const footballBetsRepo = useMemo(() => new BaseRepository<FootballBet>('football_bets'), []);
  const snookerChannelsRepo = useMemo(() => new BaseRepository<SnookerChannel>('snooker_channels'), []);
  const snookerBetsRepo = useMemo(() => new BaseRepository<SnookerBet>('snooker_bets'), []);
  const snookerHistoryRepo = useMemo(() => new BaseRepository<SnookerFinancialSummary>('snooker_history'), []);
  const snookerSyncLogsRepo = useMemo(() => new BaseRepository<any>('snooker_sync_logs'), []);
  const bingoDrawsRepo = useMemo(() => new BaseRepository<BingoDraw>('bingo_draws'), []);
  const bingoTicketsRepo = useMemo(() => new BaseRepository<BingoTicket>('bingo_tickets'), []);
  const resultsRepo = useMemo(() => new BaseRepository<any>('jdbResults'), []);
  const settingsRepo = useMemo(() => new BaseRepository<any>('system_settings'), []);

  const loadLocalData = useCallback(() => {
    if (typeof window === 'undefined') return;
    const session = getSession();
    if (session) { const u = getUserByTerminal(session.terminal); setUser(u); } else { setUser(null); }
    setAllUsers(getStorageItem('app:users:v1', []));
    setLedger(LedgerService.getEntries()); setBanners(getStorageItem('app:banners:v1', [])); setPopups(getStorageItem('app:popups:v1', [])); setNews(getStorageItem('news_messages', [])); setApostas(getStorageItem('app:apostas:v1', [])); setPostedResults(getStorageItem('app:posted_results:v1', [])); setJdbResults(getStorageItem('app:jdb_results:v1', [])); setFootballBets(getStorageItem('app:football_bets:v1', [])); setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS)); setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES)); setCasinoSettings(getStorageItem('app:casino_settings:v1', DEFAULT_CASINO_SETTINGS)); setBingoSettings(getStorageItem('app:bingo_settings:v1', DEFAULT_BINGO_SETTINGS)); setBingoDraws(getStorageItem('app:bingo_draws:v1', [])); setBingoTickets(getStorageItem('app:bingo_tickets:v1', [])); setBingoPayouts(getStorageItem('app:bingo_payouts:v1', [])); setSnookerChannels(getStorageItem('app:snooker_channels:v1', [])); setSnookerFinancialHistory(getStorageItem('app:snooker_history:v1', [])); setSnookerBets(getStorageItem('app:snooker_bets:v1', [])); setSnookerCashOutLog(getStorageItem('app:snooker_cashout:v1', [])); setSnookerLiveConfig(getStorageItem('app:snooker_cfg:v1', DEFAULT_SNOOKER_CFG)); setSnookerChatMessages(getStorageItem('app:snooker_chat:v1', [])); setSnookerScoreboards(getStorageItem('app:snooker_scores:v1', {})); setSnookerBetsFeed(getStorageItem('app:snooker_bets_feed:v1', [])); setSnookerActivityFeed(getStorageItem('app:snooker_activity_feed:v1', [])); setSnookerSyncLogs(getStorageItem('app:snooker_sync_logs:v1', [])); setSnookerAutomationSettings(getStorageItem('app:snooker_automation:v1', { sources: [], manualPrimaryChannelId: null })); setSnookerScoreRecognitionSettings(getStorageItem('app:snooker_score_rec_cfg:v1', { enabled: false })); setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', DEFAULT_PLAYER_CONFIG));
    const savedFootball = getStorageItem('app:football:unified:v1', null); if (savedFootball) setFootballData(prev => ({ ...prev, ...savedFootball })); else setFootballData(prev => ({ ...prev, leagues: ESPN_LEAGUE_CATALOG }));
  }, []);

  const notify = useCallback(() => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('app:data-changed')); }, []);

  // --- REAL-TIME LISTENERS (onSnapshot) ---
  useEffect(() => {
    if (!mounted || !firestore) return;

    const listeners: (() => void)[] = [];

    // Coleções mapeadas para estados reativos
    const configs = [
      { coll: 'users', state: setAllUsers, key: 'app:users:v1' },
      { coll: 'ledgerEntries', state: (data: any[]) => { setLedger(data); setFullLedger(data); }, key: 'app:ledger:v1', limit: 1000 },
      { coll: 'apostas', state: setApostas, key: 'app:apostas:v1' },
      { coll: 'football_bets', state: setFootballBets, key: 'app:football_bets:v1' },
      { coll: 'snooker_channels', state: setSnookerChannels, key: 'app:snooker_channels:v1' },
      { coll: 'snooker_bets', state: setSnookerBets, key: 'app:snooker_bets:v1' },
      { coll: 'bingo_draws', state: setBingoDraws, key: 'app:bingo_draws:v1' },
      { coll: 'jdbResults', state: setJdbResults, key: 'app:jdb_results:v1' },
      { coll: 'news_messages', state: setNews, key: 'news_messages' },
      { coll: 'banners', state: setBanners, key: 'app:banners:v1' },
      { coll: 'popups', state: setPopups, key: 'app:popups:v1' }
    ];

    configs.forEach(cfg => {
      const q = query(
        collection(firestore, cfg.coll),
        orderBy('updatedAt', 'desc'),
        limit(cfg.limit || 500)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cfg.state(data);
        setStorageItem(cfg.key, data);
        
        // Atualiza usuário logado se ele estiver na lista
        const session = getSession();
        if (cfg.coll === 'users' && session) {
          const updatedUser = data.find((u: any) => u.terminal === session.terminal);
          if (updatedUser) setUser(updatedUser);
        }
      }, (err) => {
        console.warn(`[onSnapshot Error] ${cfg.coll}:`, err.message);
      });
      listeners.push(unsubscribe);
    });

    // Listener especial para system_settings
    const unsubSettings = onSnapshot(collection(firestore, 'system_settings'), (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === 'casino_settings') { setCasinoSettings(data as CasinoSettings); setStorageItem('app:casino_settings:v1', data); }
        if (doc.id === 'bingo_settings') { setBingoSettings(data as BingoSettings); setStorageItem('app:bingo_settings:v1', data); }
        if (doc.id === 'snooker_live_config') { setSnookerLiveConfig(data); setStorageItem('app:snooker_cfg:v1', data); }
        if (doc.id === 'mini_player_config') { setLiveMiniPlayerConfig(data as LiveMiniPlayerConfig); setStorageItem('app:mini_player_cfg:v1', data); }
      });
    });
    listeners.push(unsubSettings);

    return () => listeners.forEach(unsub => unsub());
  }, [mounted, firestore]);

  useEffect(() => {
    setMounted(true); loadLocalData(); setIsLoading(false);
    const handleDataChange = () => loadLocalData();
    window.addEventListener('app:data-changed', handleDataChange);
    window.addEventListener('auth-change', handleDataChange);
    return () => { window.removeEventListener('app:data-changed', handleDataChange); window.removeEventListener('auth-change', handleDataChange); };
  }, [loadLocalData]);

  // Lógica de Canal Principal de Sinuca
  useEffect(() => {
    if (mounted) {
      const primaryId = SnookerPriorityService.choosePrimary(snookerChannels, snookerAutomationSettings.manualPrimaryChannelId);
      setSnookerPrimaryChannelId(primaryId);
    }
  }, [snookerChannels, snookerAutomationSettings.manualPrimaryChannelId, mounted]);

  useEffect(() => { if (mounted && firestore) MigrationService.syncToCloud(firestore); }, [mounted, firestore]);

  // --- ACTIONS ---
  const addBanner = useCallback((b: Banner) => { bannersRepo.save(b); notify(); }, [bannersRepo, notify]);
  const updateBanner = useCallback((b: Banner) => { bannersRepo.save(b); notify(); }, [bannersRepo, notify]);
  const deleteBanner = useCallback((id: string) => { bannersRepo.delete(id); notify(); }, [bannersRepo, notify]);
  
  const addPopup = useCallback((p: Popup) => { popupsRepo.save(p); notify(); }, [popupsRepo, notify]);
  const updatePopup = useCallback((p: Popup) => { popupsRepo.save(p); notify(); }, [popupsRepo, notify]);
  const deletePopup = useCallback((id: string) => { popupsRepo.delete(id); notify(); }, [popupsRepo, notify]);

  const addNews = useCallback((m: NewsMessage) => { newsRepo.save(m); notify(); }, [newsRepo, notify]);
  const updateNews = useCallback((m: NewsMessage) => { newsRepo.save(m); notify(); }, [newsRepo, notify]);
  const deleteNews = useCallback((id: string) => { newsRepo.delete(id); notify(); }, [newsRepo, notify]);

  const handleFinalizarAposta = useCallback((aposta: any, valorTotal: number): string | null => { 
    if (!user) { router.push('/login'); return null; } 
    const pouleId = generatePoule(); 
    const result = BetService.processBet(user, { userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0, description: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId }); 
    if (result.success) { 
      const newAposta = { ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() };
      apostasRepo.save(newAposta);
      notify(); return pouleId; 
    } 
    return null; 
  }, [user, apostasRepo, notify, router]);

  const placeFootballBet = useCallback(async (stake: number): Promise<string | null> => { 
    if (!user) { router.push('/login'); return null; } 
    const pouleId = generatePoule(); 
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2)); 
    const result = BetService.processBet(user, { userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: totalOdds > 0 ? stake * totalOdds : 0, description: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId }); 
    if (result.success) { 
      const newBet: FootballBet = { id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin: stake * totalOdds, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() };
      footballBetsRepo.save(newBet);
      setBetSlip([]); notify(); return pouleId; 
    } 
    return null; 
  }, [user, betSlip, footballBetsRepo, notify, router]);

  const createBingoDraw = useCallback((d: Partial<BingoDraw>) => { 
    const nextNum = bingoDraws.length > 0 ? Math.max(...bingoDraws.map(x => x.drawNumber)) + 1 : 1001; 
    const newDraw: BingoDraw = { id: `draw-${Date.now()}`, drawNumber: nextNum, status: 'scheduled', drawnNumbers: [], winnersFound: {}, totalTickets: 0, totalRevenue: 0, payoutTotal: 0, bancaId: user?.bancaId || 'default', scheduledAt: new Date().toISOString(), ticketPrice: 0.3, prizeRules: { quadra: 60, kina: 90, keno: 150 }, housePercent: 10, ...d }; 
    bingoDrawsRepo.save(newDraw);
    notify(); 
  }, [user, bingoDraws, bingoDrawsRepo, notify]);

  const addSnookerChannel = useCallback((c: any) => { const newChan = { ...c, scoreA: 0, scoreB: 0, status: 'scheduled', enabled: true, odds: { A: 1.95, B: 1.95, D: 3.20 } }; snookerChannelsRepo.save(newChan); notify(); }, [snookerChannelsRepo, notify]);
  const updateSnookerChannel = useCallback((c: any) => { snookerChannelsRepo.save(c); notify(); }, [snookerChannelsRepo, notify]);
  const deleteSnookerChannel = useCallback((id: string) => { snookerChannelsRepo.delete(id); notify(); }, [snookerChannelsRepo, notify]);

  const placeSnookerBet = useCallback((bet: any) => { 
    if (!user) return false; 
    const result = BetService.processBet(user, { userId: user.id, modulo: 'Sinuca', valor: bet.amount, retornoPotencial: 0, description: `Sinuca: Aposta em ${bet.pick}`, referenceId: `sno-${bet.channelId}-${Date.now()}` }); 
    if (result.success) { 
      const newBet: SnookerBet = { ...bet, id: `bet-sno-${Date.now()}`, userId: user.id, userName: user.nome || user.terminal, status: 'open', createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default' }; 
      snookerBetsRepo.save(newBet);
      notify(); return true; 
    } 
    return false; 
  }, [user, snookerBetsRepo, notify]);

  const publishJDBResult = useCallback((id: string) => {
    const target = jdbResults.find(r => r.id === id);
    if (target) {
      resultsRepo.save({ ...target, status: 'PUBLICADO', publishedAt: new Date().toISOString() });
      notify();
    }
  }, [jdbResults, resultsRepo, notify]);

  const deleteJDBResult = useCallback((id: string) => { resultsRepo.delete(id); notify(); }, [resultsRepo, notify]);

  const updateBingoSettings = useCallback((s: BingoSettings) => { settingsRepo.save({ id: 'bingo_settings', ...s }); notify(); }, [settingsRepo, notify]);
  const updateCasinoSettings = useCallback((s: CasinoSettings) => { settingsRepo.save({ id: 'casino_settings', ...s }); notify(); }, [settingsRepo, notify]);
  const updateSnookerLiveConfig = useCallback((c: any) => { settingsRepo.save({ id: 'snooker_live_config', ...c }); notify(); }, [settingsRepo, notify]);
  const updateLiveMiniPlayerConfig = useCallback((c: LiveMiniPlayerConfig) => { settingsRepo.save({ id: 'mini_player_config', ...c }); notify(); }, [settingsRepo, notify]);

  const logout = useCallback(() => { authLogout(); setUser(null); notify(); router.push('/login'); }, [notify, router]);
  const toggleFullscreen = useCallback(() => { if (typeof document === 'undefined') return; if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {}); else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {}); }, []);
  const registerCambistaMovement = useCallback((data: { tipo: string, valor: number, modulo: string, observacao: string }) => { if (!user) return; const typeMap: Record<string, any> = { 'ENTRADA_MANUAL': 'CASH_IN', 'RECOLHE': 'CASH_OUT_RECOLHE', 'FECHAMENTO_CAIXA': 'CASH_CLOSE' }; const ledgerType = typeMap[data.tipo] || 'BALANCE_ADJUST'; const amount = data.tipo === 'ENTRADA_MANUAL' ? data.valor : -data.valor; LedgerService.addEntry({ bancaId: user.bancaId || 'default', userId: user.id, terminal: user.terminal, tipoUsuario: user.tipoUsuario, modulo: data.modulo, type: ledgerType, amount: amount, balanceBefore: user.saldo + user.bonus, balanceAfter: user.saldo + user.bonus + amount, referenceId: `caixa-${Date.now()}`, description: data.observacao }); notify(); }, [user, notify]);
  const startBingoDraw = useCallback((id: string) => { const target = bingoDraws.find(d => d.id === id); if (target) bingoDrawsRepo.save({ ...target, status: 'live', startedAt: new Date().toISOString() }); notify(); }, [bingoDraws, bingoDrawsRepo, notify]);
  const drawBingoBall = useCallback((id: string) => { const draw = bingoDraws.find(d => d.id === id); if (!draw) return; const available = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !draw.drawnNumbers.includes(n)); if (available.length === 0) return; const ball = available[Math.floor(Math.random() * available.length)]; bingoDrawsRepo.save({ ...draw, drawnNumbers: [...draw.drawnNumbers, ball] }); notify(); }, [bingoDraws, bingoDrawsRepo, notify]);
  const finishBingoDraw = useCallback((id: string) => { const target = bingoDraws.find(d => d.id === id); if (target) bingoDrawsRepo.save({ ...target, status: 'finished', finishedAt: new Date().toISOString() }); notify(); }, [bingoDraws, bingoDrawsRepo, notify]);
  const cancelBingoDraw = useCallback((id: string, reason: string) => { const draw = bingoDraws.find(d => d.id === id); if (!draw) return; bingoTickets.filter(t => t.drawId === id && t.status === 'active').forEach(t => { const u = getUserByTerminal(t.terminalId); if (u) { upsertUser({ terminal: u.terminal, saldo: u.saldo + t.amountPaid }); LedgerService.addEntry({ bancaId: draw.bancaId, userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Bingo', type: 'WITHDRAW', amount: t.amountPaid, balanceBefore: u.saldo, balanceAfter: u.saldo + t.amountPaid, referenceId: t.id, description: `Estorno Bingo: ${reason}` }); } }); bingoDrawsRepo.save({ ...draw, status: 'cancelled' }); notify(); }, [bingoDraws, bingoTickets, bingoDrawsRepo, notify]);
  const refundBingoTicket = useCallback((id: string) => { const t = bingoTickets.find(x => x.id === id); if (t) bingoTicketsRepo.save({ ...t, status: 'refunded' }); notify(); }, [bingoTickets, bingoTicketsRepo, notify]);
  const payBingoPayout = useCallback((id: string) => { /* logic for payout */ notify(); }, [notify]);
  const joinChannel = useCallback((channelId: string, userId: string) => { setSnookerPresence(prev => { const current = prev[channelId]?.viewers || []; if (current.includes(userId)) return prev; return { ...prev, [channelId]: { viewers: [...current, userId] } }; }); }, []);
  const leaveChannel = useCallback((channelId: string, userId: string) => { setSnookerPresence(prev => { const current = prev[channelId]?.viewers || []; return { ...prev, [channelId]: { viewers: current.filter(id => id !== userId) } }; }); }, []);
  
  const cashOutSnookerBet = useCallback((betId: string) => { 
    const bet = snookerBets.find(b => b.id === betId); 
    if (!bet || !user || bet.status !== 'open') return; 
    const cashOutValue = bet.amount * 0.9; 
    const u = getUserByTerminal(user.terminal); 
    if (u) { 
      const newBal = u.saldo + cashOutValue; 
      upsertUser({ terminal: u.terminal, saldo: newBal }); 
      LedgerService.addEntry({ bancaId: u.bancaId || 'default', userId: u.id, terminal: u.terminal, tipoUsuario: u.tipoUsuario, modulo: 'Sinuca', type: 'CASH_OUT_RECOLHE', amount: cashOutValue, balanceBefore: u.saldo, balanceAfter: newBal, referenceId: betId, description: `Cash Out Sinuca` }); 
    } 
    snookerBetsRepo.save({ ...bet, status: 'cash_out' });
    notify(); 
  }, [snookerBets, user, snookerBetsRepo, notify]);

  const sendSnookerChatMessage = useCallback((channelId: string, text: string) => { if (!user) return; const newMessage = { id: `msg-${Date.now()}`, channelId, userId: user.id, userName: user.nome || user.terminal, text, createdAt: new Date().toISOString() }; const currentMsgs = getStorageItem<any[]>('app:snooker_chat:v1', []); setStorageItem('app:snooker_chat:v1', [newMessage, ...currentMsgs].slice(0, 100)); notify(); }, [user, notify]);
  const deleteSnookerChatMessage = useCallback((id: string) => { /* Mark message deleted logic */ notify(); }, [notify]);
  const sendSnookerReaction = useCallback((channelId: string, reaction: string) => { if (!user) return; const entry = { id: Date.now(), channelId, text: `${user.nome || user.terminal} reagiu com ${reaction}`, createdAt: new Date().toISOString() }; const currentFeed = getStorageItem<any[]>('app:snooker_activity_feed:v1', []); setStorageItem('app:snooker_activity_feed:v1', [entry, ...currentFeed].slice(0, 50)); notify(); }, [user, notify]);
  const updateSnookerScoreboard = useCallback((id: string, s: any) => { const updatedScores = { ...snookerScoreboards, [id]: { ...s, updatedAt: new Date().toISOString() } }; setSnookerScoreboards(updatedScores); const target = snookerChannels.find(c => c.id === id); if (target) snookerChannelsRepo.save({ ...target, scoreA: s.scoreA, scoreB: s.scoreB }); notify(); }, [snookerScoreboards, snookerChannels, snookerChannelsRepo, notify]);
  
  const settleSnookerRound = useCallback((channelId: string, winner: string) => { 
    snookerBets.forEach(bet => { 
      if (bet.channelId === channelId && bet.status === 'open') { 
        const isWin = bet.pick === winner;
        if (isWin) { 
          const prize = bet.amount * 1.95; 
          const realUser = getUserByTerminal(bet.userName); 
          if (realUser) { 
            upsertUser({ terminal: realUser.terminal, saldo: realUser.saldo + prize }); 
            LedgerService.addEntry({ bancaId: realUser.bancaId || 'default', userId: realUser.id, terminal: realUser.terminal, tipoUsuario: realUser.tipoUsuario, modulo: 'Sinuca', type: 'BET_WIN', amount: prize, balanceBefore: realUser.saldo, balanceAfter: realUser.saldo + prize, referenceId: bet.id, description: `Prêmio Sinuca` }); 
          } 
        } 
        snookerBetsRepo.save({ ...bet, status: isWin ? 'won' : 'lost' });
      } 
    }); 
    if (winner !== 'EMPATE') setCelebrationTrigger(true); 
    notify(); 
  }, [snookerBets, snookerBetsRepo, notify]);

  const clearCelebration = useCallback(() => setCelebrationTrigger(false), []);
  const updateLeagueConfig = useCallback((id: string, config: any) => { setFootballData(prev => { const leagues = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l); const updated = { ...prev, leagues }; setStorageItem('app:football:unified:v1', updated); return updated; }); notify(); }, [notify]);
  const findLeagueById = useCallback((id: string) => { return footballData.leagues.find(l => l.id === id); }, [footballData.leagues]);
  const processarResultados = useCallback((dados: any) => { const current = getStorageItem<any[]>('app:posted_results:v1', []); setStorageItem('app:posted_results:v1', [dados, ...current]); notify(); }, [notify]);
  
  const syncFootballAll = useCallback(async (force = false) => { 
    if (footballData.syncStatus === 'syncing') return;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allMatches: any[] = [];
      
      for (const league of activeLeagues) {
        const response = await fetch(`/api/espn/scoreboard?league=${league.slug}`);
        if (response.ok) {
          const result = await response.json();
          if (result.ok) {
            const normalized = normalizeESPNScoreboard(result.data, league.slug);
            allMatches = [...allMatches, ...normalized];
          }
        }
      }
      
      const unified = allMatches.map(m => {
        const bettable = MatchMapperService.transformEspnToBettable(m);
        const probs = FootballOddsEngine.calculateMatchProbabilities(m.homeTeam.id, m.awayTeam.id, [], m.id);
        bettable.markets = FootballMarketsEngine.generateAllMarkets(probs);
        return bettable;
      });

      const updatedData: FootballData = {
        ...footballData,
        matches: allMatches,
        unifiedMatches: unified,
        syncStatus: 'success',
        lastSyncAt: new Date().toISOString()
      };
      
      setFootballData(updatedData);
      setStorageItem('app:football:unified:v1', updatedData);
      
      if (force) toast({ title: 'Sportsbook Atualizado', description: `${unified.length} partidas sincronizadas.` });
      notify();
    } catch (error) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      console.error("Football Sync Error:", error);
    }
  }, [footballData, toast, notify]);
  
  const syncSnookerFromYoutube = useCallback(async (force = false, sourceId?: string) => { 
    if (snookerSyncState === 'syncing') return;
    setSnookerSyncState('syncing');

    try {
      const sources = sourceId 
        ? snookerAutomationSettings.sources.filter((s: any) => s.id === sourceId)
        : snookerAutomationSettings.sources.filter((s: any) => s.enabled);

      let currentList = [...snookerChannels];
      let totalCreated = 0;
      let totalUpdated = 0;

      for (const source of sources) {
        const { updatedChannels, summary } = await SnookerSyncService.sync(
          currentList,
          user?.bancaId || 'default',
          source,
          snookerAutomationSettings
        );
        currentList = updatedChannels;
        totalCreated += summary.created;
        totalUpdated += summary.updated;
        
        const newLog = { 
          id: `log-${Date.now()}`, 
          createdAt: new Date().toISOString(), 
          sourceName: source.name, 
          status: 'success', 
          message: `Sync ok: ${summary.created} novos, ${summary.updated} atualizados.` 
        };
        snookerSyncLogsRepo.save(newLog);
      }

      setSnookerChannels(currentList);
      currentList.forEach(c => snookerChannelsRepo.save(c));

      setSnookerSyncState('success');
      if (force) toast({ title: 'Sinuca Atualizada', description: `${totalCreated} novos eventos encontrados.` });
      notify();
    } catch (error: any) {
      setSnookerSyncState('error');
      console.error("Snooker Sync Error:", error);
    }
  }, [snookerSyncState, snookerAutomationSettings, snookerChannels, user, snookerChannelsRepo, snookerSyncLogsRepo, toast, notify]);
  
  const updateGenericLottery = useCallback((c: GenericLotteryConfig) => { setGenericLotteryConfigs(prev => prev.map(i => i.id === c.id ? c : i)); settingsRepo.save({ id: `lottery_config_${c.id}`, ...c }); notify(); }, [settingsRepo, notify]);
  const updateJDBLoteria = useCallback((l: JDBLoteria) => { setJdbLoterias(prev => prev.map(i => i.id === l.id ? l : i)); settingsRepo.save({ id: `jdb_loteria_${l.id}`, ...l }); notify(); }, [settingsRepo, notify]);
  const addJDBLoteria = useCallback((l: JDBLoteria) => { setJdbLoterias(prev => [...prev, l]); settingsRepo.save({ id: `jdb_loteria_${l.id}`, ...l }); notify(); }, [settingsRepo, notify]);
  const deleteJDBLoteria = useCallback((id: string) => { setJdbLoterias(prev => prev.filter(i => i.id !== id)); settingsRepo.delete(`jdb_loteria_${id}`); notify(); }, [settingsRepo, notify]);

  const updateSnookerAutomationSource = useCallback((id: string, updates: Partial<any>) => {
    const updated = { ...snookerAutomationSettings, sources: (snookerAutomationSettings.sources || []).map((s: any) => s.id === id ? { ...s, ...updates } : s) };
    setSnookerAutomationSettings(updated);
    settingsRepo.save({ id: 'snooker_automation_settings', ...updated });
    notify();
  }, [snookerAutomationSettings, settingsRepo, notify]);

  const toggleSnookerSource = useCallback((id: string, enabled: boolean) => {
    updateSnookerAutomationSource(id, { enabled });
  }, [updateSnookerAutomationSource]);

  const approveAutoSnookerChannel = useCallback((id: string) => {
    const target = snookerChannels.find(c => c.id === id);
    if (target) snookerChannelsRepo.save({ ...target, sourceStatus: 'synced', enabled: true });
    notify();
  }, [snookerChannels, snookerChannelsRepo, notify]);

  const archiveAutoSnookerChannel = useCallback((id: string) => {
    const target = snookerChannels.find(c => c.id === id);
    if (target) snookerChannelsRepo.save({ ...target, isArchived: true });
    notify();
  }, [snookerChannels, snookerChannelsRepo, notify]);

  const clearSnookerSyncLogs = useCallback(() => {
    snookerSyncLogs.forEach(l => snookerSyncLogsRepo.delete(l.id));
    notify();
  }, [snookerSyncLogs, snookerSyncLogsRepo, notify]);

  const updateSnookerAutomationSettings = useCallback((s: any) => {
    setSnookerAutomationSettings(s);
    settingsRepo.save({ id: 'snooker_automation_settings', ...s });
    notify();
  }, [settingsRepo, notify]);

  const updateSnookerScoreRecognitionSettings = useCallback((s: any) => {
    setSnookerScoreRecognitionSettings(s);
    settingsRepo.save({ id: 'snooker_score_recognition_settings', ...s });
    notify();
  }, [settingsRepo, notify]);

  const buyBingoTickets = useCallback((drawId: string, count: number) => {
    if (!user) return false;
    const price = bingoSettings.ticketPriceDefault;
    const total = price * count;
    if (user.saldo < total) {
      toast({ variant: 'destructive', title: 'Saldo insuficiente' });
      return false;
    }
    const newTickets: BingoTicket[] = Array.from({ length: count }, (_, i) => ({
      id: `tkt-${Date.now()}-${i}`,
      drawId,
      userId: user.id,
      userName: user.nome || user.terminal,
      terminalId: user.terminal,
      amountPaid: price,
      status: 'active',
      ticketNumbers: Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 1),
      createdAt: new Date().toISOString(),
      bancaId: user.bancaId || 'default'
    }));
    newTickets.forEach(t => bingoTicketsRepo.save(t));
    upsertUser({ terminal: user.terminal, saldo: user.saldo - total });
    notify();
    toast({ title: 'Compra realizada!', description: `${count} cartelas adquiridas.` });
    return true;
  }, [user, bingoSettings, bingoTicketsRepo, notify, toast]);

  const contextValue = useMemo(() => ({
    user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '', activeBancaId: user?.bancaId || 'default', ledger, allUsers, fullLedger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, toggleFullscreen, casinoSettings, updateCasinoSettings, registerCambistaMovement, publishJDBResult, deleteJDBResult,
    bingoSettings, bingoDraws, bingoTickets, bingoPayouts, updateBingoSettings, createBingoDraw, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw, buyBingoTickets, refundBingoTicket, payBingoPayout,
    snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, snookerActivityFeed, snookerBetsFeed, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId, snookerScoreRecognitionSettings, snookerCurrentReading,
    joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, settleSnookerRound, clearCelebration, syncSnookerFromYoutube, 
    updateSnookerAutomationSource, toggleSnookerSource, approveAutoSnookerChannel, archiveAutoSnookerChannel, clearSnookerSyncLogs, updateSnookerAutomationSettings, 
    setManualPrimarySnookerChannel: (id: string | null) => {
      const newSettings = { ...snookerAutomationSettings, manualPrimaryChannelId: id };
      setSnookerAutomationSettings(newSettings);
      settingsRepo.save({ id: 'snooker_automation_settings', ...newSettings });
      notify();
    }, 
    updateSnookerScoreRecognitionSettings,
    refreshData: loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, updateLeagueConfig, findLeagueById, addBetToSlip: (b: any) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId || i.id !== b.id), b]), removeBetFromSlip: (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]), placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews,
    updateGenericLottery, updateJDBLoteria, addJDBLoteria, deleteJDBLoteria, updateLiveMiniPlayerConfig
  }), [
    user, isLoading, ledger, allUsers, fullLedger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, bingoSettings, bingoDraws, bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, snookerActivityFeed, snookerBetsFeed, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId, snookerScoreRecognitionSettings, snookerCurrentReading, loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, updateLeagueConfig, findLeagueById, placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews, toggleFullscreen, casinoSettings, updateCasinoSettings, publishJDBResult, deleteJDBResult, updateBingoSettings, createBingoDraw, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw, buyBingoTickets, refundBingoTicket, payBingoPayout, registerCambistaMovement, joinChannel, leaveChannel, placeSnookerBet, cashOutSnookerBet, sendSnookerChatMessage, deleteSnookerChatMessage, sendSnookerReaction, updateSnookerLiveConfig, updateSnookerScoreboard, addSnookerChannel, updateSnookerChannel, deleteSnookerChannel, settleSnookerRound, clearCelebration, syncSnookerFromYoutube, updateGenericLottery, updateJDBLoteria, addJDBLoteria, deleteJDBLoteria, updateLiveMiniPlayerConfig, updateSnookerAutomationSource, toggleSnookerSource, approveAutoSnookerChannel, archiveAutoSnookerChannel, clearSnookerSyncLogs, updateSnookerAutomationSettings, updateSnookerScoreRecognitionSettings, notify, settingsRepo
  ]);

  return <AppContext.Provider value={contextValue}>{mounted && children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
