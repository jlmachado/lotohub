'use client';

/**
 * @fileOverview AppContext - Orquestrador Central com Sincronização em Tempo Real e Firebase.
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
import { MatchMapperService } from '@/services/match-mapper-service';
import { SnookerSyncService } from '@/services/snooker-sync-service';

// Firebase
import { initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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

const DEFAULT_CASINO_SETTINGS: CasinoSettings = { casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está a um clique de distância!' };
const DEFAULT_BINGO_SETTINGS: BingoSettings = { enabled: true, rtpEnabled: true, rtpPercent: 20, ticketPriceDefault: 0.3, maxTicketsPerUserDefault: 100, housePercentDefault: 10, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, housePercent: 10, scheduleMode: 'manual', autoSchedule: { everyMinutes: 3, startHour: 0, endHour: 23 } };
const DEFAULT_PLAYER_CONFIG: LiveMiniPlayerConfig = { enabled: false, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo', autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true, topHeight: 96, bubbleSize: 62 };
const DEFAULT_SNOOKER_CFG = { defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 5, maxBet: 1000, cashOutMargin: 8, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true };

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number; terminal: string; activeBancaId: string; ledger: any[]; allUsers: any[]; fullLedger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[]; apostas: Aposta[]; postedResults: any[]; jdbResults: JDBNormalizedResult[]; jdbLoterias: JDBLoteria[]; genericLotteryConfigs: GenericLotteryConfig[]; casinoSettings: CasinoSettings; 
  bingoSettings: BingoSettings; bingoDraws: BingoDraw[]; bingoTickets: BingoTicket[]; bingoPayouts: BingoPayout[];
  snookerChannels: SnookerChannel[]; snookerPresence: Record<string, { viewers: string[] }>; snookerFinancialHistory: SnookerFinancialSummary[]; snookerBets: SnookerBet[]; snookerCashOutLog: any[]; snookerLiveConfig: any; snookerActivityFeed: any[]; snookerBetsFeed: any[]; snookerChatMessages: any[]; snookerScoreboards: Record<string, any>; snookerSyncLogs: any[]; snookerAutomationSettings: any; celebrationTrigger: boolean;
  snookerSyncState: 'idle' | 'syncing' | 'success' | 'error'; snookerPrimaryChannelId: string | null;
  snookerScoreRecognitionSettings: any; snookerCurrentReading: any;
  footballData: FootballData; footballBets: FootballBet[]; betSlip: any[]; liveMiniPlayerConfig: LiveMiniPlayerConfig; isFullscreen: boolean;
  refreshData: () => void; logout: () => void; handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null; processarResultados: (dados: any) => void; syncFootballAll: (force?: boolean) => Promise<void>; updateLeagueConfig: (id: string, config: any) => void; findLeagueById: (id: string) => any; addBetToSlip: (bet: any) => void; removeBetFromSlip: (id: string) => void; clearBetSlip: () => void; placeFootballBet: (stake: number) => Promise<string | null>; toggleFullscreen: () => void; updateCasinoSettings: (s: CasinoSettings) => void; registerCambistaMovement: (data: { tipo: string, valor: number, modulo: string, observacao: string }) => void; publishJDBResult: (id: string) => void; deleteJDBResult: (id: string) => void; deleteSnookerChatMessage: (id: string) => void;
  updateBingoSettings: (s: BingoSettings) => void; createBingoDraw: (d: Partial<BingoDraw>) => void; startBingoDraw: (id: string) => void; drawBingoBall: (id: string) => void; finishBingoDraw: (id: string) => void; cancelBingoDraw: (id: string, reason: string) => void; buyBingoTickets: (drawId: string, count: number) => boolean; refundBingoTicket: (id: string) => void; payBingoPayout: (id: string) => void;
  joinChannel: (channelId: string, userId: string) => void; leaveChannel: (channelId: string, userId: string) => void; placeSnookerBet: (bet: any) => boolean; cashOutSnookerBet: (betId: string) => void; sendSnookerChatMessage: (channelId: string, text: string) => void; sendSnookerReaction: (channelId: string, reaction: string) => void; updateSnookerLiveConfig: (c: any) => void; updateSnookerScoreboard: (id: string, s: any) => void; addSnookerChannel: (c: any) => void; updateSnookerChannel: (c: any) => void; deleteSnookerChannel: (id: string) => void; settleSnookerRound: (channelId: string, winner: string) => void; clearCelebration: () => void; 
  syncSnookerFromYoutube: (force?: boolean, sourceId?: string) => Promise<void>; updateSnookerAutomationSource: (id: string, updates: Partial<any>) => void; toggleSnookerSource: (id: string, enabled: boolean) => void; approveAutoSnookerChannel: (id: string) => void; archiveAutoSnookerChannel: (id: string) => void; clearSnookerSyncLogs: () => void; updateSnookerAutomationSettings: (s: any) => void; setManualPrimarySnookerChannel: (id: string | null) => void;
  updateSnookerScoreRecognitionSettings: (s: any) => void;
  addBanner: (b: Banner) => void; updateBanner: (b: Banner) => void; deleteBanner: (id: string) => void; addPopup: (p: Popup) => void; updatePopup: (p: Popup) => void; deletePopup: (id: string) => void; addNews: (m: NewsMessage) => void; updateNews: (m: NewsMessage) => void; deleteNews: (id: string) => void;
  updateGenericLottery: (c: GenericLotteryConfig) => void; updateJDBLoteria: (l: JDBLoteria) => void; addJDBLoteria: (l: JDBLoteria) => void; deleteJDBLoteria: (id: string) => void; updateLiveMiniPlayerConfig: (c: LiveMiniPlayerConfig) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { firestore, auth } = initializeFirebase();
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
    if (session) { const u = getUserByTerminal(session.terminal); if (u) setUser(u); }
    setAllUsers(getStorageItem('app:users:v1', []));
    setLedger(LedgerService.getEntries()); setBanners(getStorageItem('app:banners:v1', [])); setPopups(getStorageItem('app:popups:v1', [])); setNews(getStorageItem('news_messages', [])); setApostas(getStorageItem('app:apostas:v1', [])); setPostedResults(getStorageItem('app:posted_results:v1', [])); setJdbResults(getStorageItem('app:jdb_results:v1', [])); setFootballBets(getStorageItem('app:football_bets:v1', [])); setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS)); setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES)); setCasinoSettings(getStorageItem('app:casino_settings:v1', DEFAULT_CASINO_SETTINGS)); setBingoSettings(getStorageItem('app:bingo_settings:v1', DEFAULT_BINGO_SETTINGS)); setBingoDraws(getStorageItem('app:bingo_draws:v1', [])); setBingoTickets(getStorageItem('app:bingo_tickets:v1', [])); setBingoPayouts(getStorageItem('app:bingo_payouts:v1', [])); setSnookerChannels(getStorageItem('app:snooker_channels:v1', [])); setSnookerFinancialHistory(getStorageItem('app:snooker_history:v1', [])); setSnookerBets(getStorageItem('app:snooker_bets:v1', [])); setSnookerCashOutLog(getStorageItem('app:snooker_cashout:v1', [])); setSnookerLiveConfig(getStorageItem('app:snooker_cfg:v1', DEFAULT_SNOOKER_CFG)); setSnookerChatMessages(getStorageItem('app:snooker_chat:v1', [])); setSnookerScoreboards(getStorageItem('app:snooker_scores:v1', {})); setSnookerBetsFeed(getStorageItem('app:snooker_bets_feed:v1', [])); setSnookerActivityFeed(getStorageItem('app:snooker_activity_feed:v1', [])); setSnookerSyncLogs(getStorageItem('app:snooker_sync_logs:v1', [])); setSnookerAutomationSettings(getStorageItem('app:snooker_automation:v1', { sources: [], manualPrimaryChannelId: null })); setSnookerScoreRecognitionSettings(getStorageItem('app:snooker_score_rec_cfg:v1', { enabled: false })); setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', DEFAULT_PLAYER_CONFIG));
    const savedFootball = getStorageItem('app:football:unified:v1', null); if (savedFootball) setFootballData(prev => ({ ...prev, ...savedFootball })); else setFootballData(prev => ({ ...prev, leagues: ESPN_LEAGUE_CATALOG }));
  }, []);

  const notify = useCallback(() => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('app:data-changed')); }, []);

  // --- AUTH LISTENER ---
  useEffect(() => {
    if (!mounted || !auth || !firestore) return;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const session = getSession();
        if (session) {
          const u = getUserByTerminal(session.terminal);
          if (u) { setUser(u); return; }
        }
        const userDocRef = doc(firestore, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const cloudUser = userSnap.data();
          setUser(cloudUser);
          setStorageItem('app:session:v1', { userId: fbUser.uid, terminal: cloudUser.terminal, tipoUsuario: cloudUser.tipoUsuario, bancaId: cloudUser.bancaId, loggedAt: Date.now() });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [mounted, auth, firestore]);

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!mounted || !firestore) return;
    const listeners: (() => void)[] = [];
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
      const q = query(collection(firestore, cfg.coll), orderBy('updatedAt', 'desc'), limit(cfg.limit || 500));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cfg.state(data);
        setStorageItem(cfg.key, data);
        const session = getSession();
        if (cfg.coll === 'users' && session) {
          const updatedUser = data.find((u: any) => u.terminal === session.terminal);
          if (updatedUser) setUser(updatedUser);
        }
      });
      listeners.push(unsubscribe);
    });
    return () => listeners.forEach(unsub => unsub());
  }, [mounted, firestore]);

  useEffect(() => {
    setMounted(true); loadLocalData(); setIsLoading(false);
    const handleDataChange = () => loadLocalData();
    window.addEventListener('app:data-changed', handleDataChange);
    window.addEventListener('auth-change', handleDataChange);
    return () => { window.removeEventListener('app:data-changed', handleDataChange); window.removeEventListener('auth-change', handleDataChange); };
  }, [loadLocalData]);

  useEffect(() => {
    if (mounted) {
      const primaryId = SnookerPriorityService.choosePrimary(snookerChannels, snookerAutomationSettings.manualPrimaryChannelId);
      setSnookerPrimaryChannelId(primaryId);
    }
  }, [snookerChannels, snookerAutomationSettings.manualPrimaryChannelId, mounted]);

  // --- ACTIONS ---
  const publishJDBResult = useCallback((id: string) => {
    const target = jdbResults.find(r => r.id === id);
    if (target) {
      resultsRepo.save({ ...target, status: 'PUBLICADO', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      notify();
    }
  }, [jdbResults, resultsRepo, notify]);

  const deleteSnookerChatMessage = useCallback((id: string) => {
    const chatRepo = new BaseRepository<any>('snooker_chat_messages');
    chatRepo.save({ id, deleted: true, updatedAt: new Date().toISOString() });
    notify();
  }, [notify]);

  const deleteJDBResult = useCallback((id: string) => { resultsRepo.delete(id); notify(); }, [resultsRepo, notify]);

  const contextValue = useMemo(() => ({
    user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '', activeBancaId: user?.bancaId || 'default', ledger, allUsers, fullLedger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, casinoSettings, bingoSettings, bingoDraws, bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, snookerActivityFeed, snookerBetsFeed, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId, snookerScoreRecognitionSettings, snookerCurrentReading,
    refreshData: loadLocalData, logout: authLogout,
    handleFinalizarAposta: (aposta: any, valorTotal: number) => {
      if (!user) { router.push('/login'); return null; }
      const pouleId = generatePoule();
      const result = BetService.processBet(user, { userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0, description: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId });
      if (result.success) {
        const newAposta = { ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        apostasRepo.save(newAposta); notify(); return pouleId;
      }
      return null;
    },
    placeFootballBet: async (stake: number) => {
      if (!user) { router.push('/login'); return null; }
      const pouleId = generatePoule();
      const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
      const result = BetService.processBet(user, { userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: totalOdds > 0 ? stake * totalOdds : 0, description: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId });
      if (result.success) {
        const newBet: FootballBet = { id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin: stake * totalOdds, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() };
        footballBetsRepo.save(newBet); setBetSlip([]); notify(); return pouleId;
      }
      return null;
    },
    syncFootballAll: async (force?: boolean) => { /* Sync Logic */ },
    updateLeagueConfig: (id: string, cfg: any) => { /* Update Logic */ },
    findLeagueById: (id: string) => footballData.leagues.find(l => l.id === id),
    addBetToSlip: (b: any) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId || i.id !== b.id), b]),
    removeBetFromSlip: (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id)),
    clearBetSlip: () => setBetSlip([]),
    toggleFullscreen: () => setIsFullscreen(prev => !prev),
    updateCasinoSettings: (s: CasinoSettings) => { setCasinoSettings(s); settingsRepo.save({ id: 'casino_settings', ...s, updatedAt: new Date().toISOString() }); notify(); },
    registerCambistaMovement: (data: any) => { /* Movement Logic */ },
    publishJDBResult, deleteJDBResult, deleteSnookerChatMessage,
    updateBingoSettings: (s: BingoSettings) => { setBingoSettings(s); settingsRepo.save({ id: 'bingo_settings', ...s, updatedAt: new Date().toISOString() }); notify(); },
    createBingoDraw: (d: any) => { bingoDrawsRepo.save({ ...d, updatedAt: new Date().toISOString() }); notify(); },
    startBingoDraw: (id: string) => { /* Start Logic */ },
    drawBingoBall: (id: string) => { /* Draw Logic */ },
    finishBingoDraw: (id: string) => { /* Finish Logic */ },
    cancelBingoDraw: (id: string, reason: string) => { /* Cancel Logic */ },
    buyBingoTickets: (drawId: string, count: number) => { /* Buy Logic */ return true; },
    refundBingoTicket: (id: string) => { /* Refund Logic */ },
    payBingoPayout: (id: string) => { /* Pay Logic */ },
    joinChannel: (cid: string, uid: string) => { /* Join Logic */ },
    leaveChannel: (cid: string, uid: string) => { /* Leave Logic */ },
    placeSnookerBet: (bet: any) => { /* Bet Logic */ return true; },
    cashOutSnookerBet: (betId: string) => { /* Cashout Logic */ },
    sendSnookerChatMessage: (cid: string, txt: string) => { if (!user) return; const msg = { id: `msg-${Date.now()}`, channelId: cid, userId: user.id, userName: user.nome || user.terminal, text: txt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deleted: false }; new BaseRepository<any>('snooker_chat_messages').save(msg); notify(); },
    sendSnookerReaction: (cid: string, react: string) => { setCelebrationTrigger(true); notify(); },
    updateSnookerLiveConfig: (c: any) => { setSnookerLiveConfig(c); settingsRepo.save({ id: 'snooker_live_config', ...c, updatedAt: new Date().toISOString() }); notify(); },
    updateSnookerScoreboard: (id: string, s: any) => { setSnookerScoreboards(prev => ({ ...prev, [id]: s })); notify(); },
    addSnookerChannel: (c: any) => { snookerChannelsRepo.save({ ...c, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); notify(); },
    updateSnookerChannel: (c: any) => { snookerChannelsRepo.save({ ...c, updatedAt: new Date().toISOString() }); notify(); },
    deleteSnookerChannel: (id: string) => { snookerChannelsRepo.delete(id); notify(); },
    settleSnookerRound: (cid: string, win: string) => { /* Settle Logic */ },
    clearCelebration: () => setCelebrationTrigger(false),
    syncSnookerFromYoutube: async (force?: boolean, sourceId?: string) => { /* Sync Logic */ },
    updateSnookerAutomationSource: (id: string, updates: any) => { /* Update Logic */ },
    toggleSnookerSource: (id: string, enabled: boolean) => { /* Toggle Logic */ },
    approveAutoSnookerChannel: (id: string) => { /* Approve Logic */ },
    archiveAutoSnookerChannel: (id: string) => { /* Archive Logic */ },
    clearSnookerSyncLogs: () => { setSnookerSyncLogs([]); notify(); },
    updateSnookerAutomationSettings: (s: any) => { setSnookerAutomationSettings(s); settingsRepo.save({ id: 'snooker_automation_settings', ...s, updatedAt: new Date().toISOString() }); notify(); },
    setManualPrimarySnookerChannel: (id: string | null) => { /* Manual Logic */ },
    updateSnookerScoreRecognitionSettings: (s: any) => { setSnookerScoreRecognitionSettings(s); settingsRepo.save({ id: 'snooker_score_recognition_settings', ...s, updatedAt: new Date().toISOString() }); notify(); },
    processarResultados: (dados: any) => { const newRes = { ...dados, id: `res-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'PENDENTE' }; resultsRepo.save(newRes); notify(); },
    addBanner: (b: Banner) => { bannersRepo.save({ ...b, updatedAt: new Date().toISOString() }); notify(); },
    updateBanner: (b: Banner) => { bannersRepo.save({ ...b, updatedAt: new Date().toISOString() }); notify(); },
    deleteBanner: (id: string) => { bannersRepo.delete(id); notify(); },
    addPopup: (p: Popup) => { popupsRepo.save({ ...p, updatedAt: new Date().toISOString() }); notify(); },
    updatePopup: (p: Popup) => { popupsRepo.save({ ...p, updatedAt: new Date().toISOString() }); notify(); },
    deletePopup: (id: string) => { popupsRepo.delete(id); notify(); },
    addNews: (m: NewsMessage) => { newsRepo.save({ ...m, updatedAt: new Date().toISOString() }); notify(); },
    updateNews: (m: NewsMessage) => { newsRepo.save({ ...m, updatedAt: new Date().toISOString() }); notify(); },
    deleteNews: (id: string) => { newsRepo.delete(id); notify(); },
    updateGenericLottery: (c: GenericLotteryConfig) => { setGenericLotteryConfigs(prev => prev.map(l => l.id === c.id ? c : l)); settingsRepo.save({ id: `lottery_${c.id}`, ...c, updatedAt: new Date().toISOString() }); notify(); },
    updateJDBLoteria: (l: JDBLoteria) => { setJdbLoterias(prev => prev.map(old => old.id === l.id ? l : old)); new BaseRepository<any>('jdb_loterias').save({ ...l, updatedAt: new Date().toISOString() }); notify(); },
    addJDBLoteria: (l: JDBLoteria) => { setJdbLoterias(prev => [...prev, l]); new BaseRepository<any>('jdb_loterias').save({ ...l, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); notify(); },
    deleteJDBLoteria: (id: string) => { setJdbLoterias(prev => prev.filter(l => l.id !== id)); new BaseRepository<any>('jdb_loterias').delete(id); notify(); },
    updateLiveMiniPlayerConfig: (c: LiveMiniPlayerConfig) => { setLiveMiniPlayerConfig(c); settingsRepo.save({ id: 'mini_player_cfg', ...c, updatedAt: new Date().toISOString() }); notify(); }
  }), [
    user, isLoading, ledger, allUsers, fullLedger, banners, popups, news, apostas, postedResults, jdbResults, jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig, isFullscreen, casinoSettings, bingoSettings, bingoDraws, bingoTickets, bingoPayouts, snookerChannels, snookerPresence, snookerFinancialHistory, snookerBets, snookerChatMessages, snookerScoreboards, snookerSyncLogs, snookerAutomationSettings, snookerActivityFeed, snookerBetsFeed, celebrationTrigger, snookerSyncState, snookerPrimaryChannelId, snookerScoreRecognitionSettings, snookerCurrentReading, loadLocalData, publishJDBResult, deleteSnookerChatMessage, deleteJDBResult, notify, resultsRepo, snookerChannelsRepo, snookerBetsRepo, apostasRepo, footballBetsRepo, bannersRepo, popupsRepo, newsRepo, settingsRepo, bingoDrawsRepo, router
  ]);

  return <AppContext.Provider value={contextValue}>{mounted && children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
