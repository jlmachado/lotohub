'use client';

/**
 * @fileOverview AppContext Professional - Motor de Tempo Real Multi-Tenant.
 * Versão V11: Estabilização de listeners e tratamento silencioso de permissões durante transição.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, setDoc, 
  deleteDoc, where, updateDoc, increment, arrayUnion, arrayRemove,
  Timestamp, serverTimestamp
} from 'firebase/firestore';
import { resolveCurrentBanca, getSubdomain } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { SnookerSyncService } from '@/services/snooker-sync-service';
import { ResultsSyncService } from '@/services/results-sync-service';
import { filterProfanity } from '@/utils/profanity-filter';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// --- Interfaces de Tipagem ---

export interface Banner { id: string; title: string; imageUrl: string; active: boolean; position: number; bancaId: string; content?: string; linkUrl?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; imageUrl: string; active: boolean; priority: number; bancaId: string; description?: string; linkUrl?: string; buttonText?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[];
  unifiedMatches: any[];
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;
}

export interface BetSlipItem {
  id: string;
  matchId: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  pickLabel: string;
  odd: number;
  isLive: boolean;
  addedAt: number;
}

export interface FootballBet {
  id: string;
  userId: string;
  bancaId: string;
  terminal: string;
  stake: number;
  potentialWin: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  items: any[];
  createdAt: string;
  isDescarga?: boolean;
}

export interface CasinoSettings {
  casinoName: string;
  casinoStatus: boolean;
  bannerMessage: string;
}

export interface BingoSettings {
  enabled: boolean;
  rtpEnabled: boolean;
  rtpPercent: number;
  ticketPriceDefault: number;
  housePercentDefault: number;
  maxTicketsPerUserDefault: number;
  preDrawHoldSeconds: number;
  prizeDefaults: { quadra: number; kina: number; keno: number; };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: { everyMinutes: number; startHour: number; endHour: number; };
}

export interface BingoDraw {
  id: string;
  drawNumber: number;
  status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled';
  scheduledAt: string;
  finishedAt?: string;
  ticketPrice: number;
  totalTickets: number;
  totalRevenue: number;
  payoutTotal: number;
  housePercent: number;
  drawnNumbers: number[];
  winnersFound: { quadra?: any; kina?: any; keno?: any; };
  prizeRules: { quadra: number; kina: number; keno: number; };
  bancaId: string;
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  ticketNumbers: number[];
  amountPaid: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  createdAt: string;
  bancaId: string;
  isBot?: boolean;
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
  settledAt?: string;
  isPreMatch?: boolean;
  bancaId: string;
}

export interface SnookerLiveConfig {
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
}

export interface SnookerAutomationSettings {
  enabled: boolean;
  intervalMinutes: number;
  sources: any[];
  manualPrimaryChannelId: string | null;
  status: 'idle' | 'running' | 'error';
}

export interface SnookerSyncLog {
  id: string;
  message: string;
  status: 'success' | 'error' | 'warning';
  sourceName?: string;
  createdAt: string;
}

export interface SnookerScoreRecognitionSettings {
  enabled: boolean;
  mode: 'manual' | 'auto_assistido';
  autoApplyScore: boolean;
  minConfidenceToAutoApply: number;
  requiredStableReads: number;
  captureIntervalSeconds: number;
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

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number;
  currentBanca: any; subdomain: string | null;
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[];
  apostas: any[]; snookerChannels: any[];
  jdbResults: JDBNormalizedResult[];
  postedResults: JDBNormalizedResult[];
  allUsers: any[];
  
  // Football
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  syncFootballAll: (force?: boolean) => Promise<void>;
  addBetToSlip: (item: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  updateLeagueConfig: (id: string, updates: Partial<ESPNLeagueConfig>) => void;

  // Snooker
  snookerPresence: any;
  snookerSyncState: 'idle' | 'syncing' | 'error';
  celebrationTrigger: boolean;
  snookerLiveConfig: SnookerLiveConfig | null;
  snookerBets: SnookerBet[];
  snookerFinancialHistory: any[];
  snookerChatMessages: any[];
  snookerCashOutLog: any[];
  snookerScoreboards: Record<string, any>;
  snookerScoreRecognitionSettings: SnookerScoreRecognitionSettings;
  snookerAutomationSettings: SnookerAutomationSettings;
  snookerPrimaryChannelId: string | null;
  snookerSyncLogs: SnookerSyncLog[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  
  // Bingo & Casino
  casinoSettings: CasinoSettings | null;
  bingoSettings: BingoSettings | null;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoPayouts: any[];

  // Utils
  refreshData: () => void; logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => Promise<string | null>;
  processarResultados: (data: any) => Promise<void>;
  
  // Snooker Actions
  syncSnookerFromYoutube: (force?: boolean) => Promise<void>;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
  clearCelebration: () => void;
  sendSnookerChatMessage: (channelId: string, text: string) => void;
  sendSnookerReaction: (channelId: string, reaction: string) => void;
  placeSnookerBet: (data: any) => boolean;
  cashOutSnookerBet: (betId: string) => void;
  settleSnookerRound: (channelId: string, winner: string) => void;
  updateSnookerLiveConfig: (cfg: SnookerLiveConfig) => void;
  updateSnookerChannel: (channel: any) => void;
  deleteSnookerChannel: (id: string) => void;
  addSnookerChannel: (channel: any) => void;
  updateSnookerScoreboard: (channelId: string, scoreboard: any) => void;
  updateSnookerScoreRecognitionSettings: (cfg: any) => void;
  updateSnookerAutomationSettings: (cfg: any) => void;
  updateSnookerAutomationSource: (id: string, source: any) => void;
  toggleSnookerSource: (id: string, enabled: boolean) => void;
  approveAutoSnookerChannel: (id: string) => void;
  archiveAutoSnookerChannel: (id: string) => void;
  clearSnookerSyncLogs: () => void;
  setManualPrimarySnookerChannel: (id: string | null) => void;

  // Bingo Actions
  updateBingoSettings: (cfg: BingoSettings) => void;
  createBingoDraw: (data: any) => void;
  startBingoDraw: (id: string) => void;
  drawBingoBall: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  cancelBingoDraw: (id: string, reason: string) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  refundBingoTicket: (id: string) => void;
  payBingoPayout: (id: string) => void;

  // Casino Actions
  updateCasinoSettings: (cfg: CasinoSettings) => void;

  // Imagens Actions
  updateBanner: (banner: Banner) => void;
  addBanner: (banner: Omit<Banner, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteBanner: (id: string) => void;
  updatePopup: (popup: Popup) => void;
  addPopup: (popup: Omit<Popup, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deletePopup: (id: string) => void;
  updateNews: (news: NewsMessage) => void;
  addNews: (news: Omit<NewsMessage, 'id' | 'bancaId'> & { id?: string }) => void;
  deleteNews: (id: string) => void;
  
  // Branding & Config
  liveMiniPlayerConfig: any;
  updateLiveMiniPlayerConfig: (cfg: any) => void;
  
  // Sync
  syncJDBResults: () => Promise<void>;
  fullLedger: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { firestore } = initializeFirebase();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [currentBanca, setCurrentBanca] = useState<any>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  
  // Module States
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG,
    matches: [],
    unifiedMatches: [],
    syncStatus: 'idle',
    lastSyncAt: null
  });
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<any[]>([]);
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  const [snookerSyncLogs, setSnookerSyncLogs] = useState<SnookerSyncLog[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  
  const [snookerScoreRecognitionSettings, setSnookerScoreRecognitionSettings] = useState<SnookerScoreRecognitionSettings>({
    enabled: false,
    mode: 'manual',
    autoApplyScore: false,
    minConfidenceToAutoApply: 0.8,
    requiredStableReads: 3,
    captureIntervalSeconds: 10
  });
  
  const [snookerAutomationSettings, setSnookerAutomationSettings] = useState<SnookerAutomationSettings>({
    enabled: true,
    intervalMinutes: 5,
    sources: [],
    manualPrimaryChannelId: null,
    status: 'idle'
  });
  
  const [snookerPrimaryChannelId, setSnookerPrimaryChannelId] = useState<string | null>(null);

  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings | null>(null);
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoPayouts, setBingoPayouts] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig | null>(null);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);

  // --- Auth & Tenant Resolving ---

  useEffect(() => {
    const banca = resolveCurrentBanca();
    const sub = getSubdomain();
    setCurrentBanca(banca);
    setSubdomain(sub);
    
    const session = getSession();
    if (session && session.userId) {
      const activeBancaId = session.bancaId || 'default';
      const userRef = doc(firestore, 'bancas', activeBancaId, 'usuarios', session.userId);
      
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() });
        }
        setIsLoading(false);
      }, (err) => console.warn("[AUTH] Permissão negada durante transição:", err.message));
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore]);

  // --- Firestore Real-time Listeners ---

  useEffect(() => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    const bancaPath = `bancas/${bancaId}`;

    const unsubscribers = [
      // Public Listeners (Always active)
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), 
        (s) => setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner))),
        (err) => {} // Silencioso para dados públicos
      ),
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), 
        (s) => setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup))),
        (err) => {}
      ),
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), 
        (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage))),
        (err) => {}
      ),
      onSnapshot(collection(firestore, bancaPath, 'snooker'), 
        (s) => setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => {}
      ),
      onSnapshot(collection(firestore, bancaPath, 'jdbResults'), 
        (s) => setJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))),
        (err) => {}
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), 
        (s) => { if (s.exists()) setCasinoSettings(s.data() as CasinoSettings); },
        (err) => {}
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), 
        (s) => { if (s.exists()) setBingoSettings(s.data() as BingoSettings); },
        (err) => {}
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), 
        (s) => { if (s.exists()) setSnookerLiveConfig(s.data() as SnookerLiveConfig); },
        (err) => {}
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'mini_player'), 
        (s) => { if (s.exists()) setLiveMiniPlayerConfig(s.data()); },
        (err) => {}
      )
    ];

    // Protected Listeners (Only if logged in)
    if (user) {
      unsubscribers.push(
        onSnapshot(query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50)), 
          (s) => setApostas(s.docs.map(d => ({ id: d.id, ...d.data() }))),
          async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/apostas`, operation: 'list' }))
        ),
        onSnapshot(query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)), 
          (s) => setLedger(s.docs.map(d => ({ id: d.id, ...d.data() }))),
          async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/ledgerEntries`, operation: 'list' }))
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_bets'), 
          (s) => setSnookerBets(s.docs.map(d => ({ id: d.id, ...d.data() } as SnookerBet))),
          async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/snooker_bets`, operation: 'list' }))
        ),
        onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_automation'), 
          (s) => { if (s.exists()) setSnookerAutomationSettings(s.data() as SnookerAutomationSettings); },
          async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/snooker_automation`, operation: 'get' }))
        )
      );
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, currentBanca, user]);

  // --- Logic Implementations ---

  const syncJDBResults = useCallback(async () => {
    if (!user || !currentBanca?.id) {
      console.warn("[SYNC] Cancelado: Sem contexto de usuário ou banca.");
      return;
    }
    const bancaId = currentBanca.id;
    
    try {
      const results = await ResultsSyncService.getLatestResults();
      const dataFormatada = new Date().toLocaleDateString("pt-BR");

      console.log("[SYNC] Total Resultados Detectados:", results.length);

      for (const res of results) {
        const id = `${res.date}-${res.lotteryName}-${res.time}`.replace(/\s/g, "_").replace(/[^\w-]/g, "").toLowerCase();
        const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', id);
        
        setDoc(docRef, { ...res, id, bancaId, data: dataFormatada, createdAt: new Date().toISOString() }, { merge: true })
          .catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: docRef.path, 
            operation: 'write',
            requestResourceData: res
          })));
      }
    } catch (e: any) {
      console.error("[SYNC] Falha crítica na captura de resultados:", e.message);
    }
  }, [user, currentBanca, firestore]);

  const syncSnookerFromYoutube = useCallback(async (force = false) => {
    if (!user || !currentBanca?.id) return;
    setSnookerSyncState('syncing');
    try {
      const jogos = await SnookerSyncService.fetchFromMainSource();
      const bancaId = currentBanca.id;
      for (const jogo of jogos) {
        const docRef = doc(firestore, 'bancas', bancaId, 'snooker', jogo.id);
        setDoc(docRef, { ...jogo, bancaId, createdAt: new Date().toISOString() }, { merge: true })
          .catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write' })));
      }
      setSnookerSyncState('idle');
    } catch (e) {
      setSnookerSyncState('error');
    }
  }, [user, currentBanca, firestore]);

  const placeSnookerBet = (data: any) => {
    if (!user) return false;
    const bancaId = user.bancaId || 'default';
    const betId = `bet-${Date.now()}`;
    const docRef = doc(firestore, 'bancas', bancaId, 'snooker_bets', betId);
    
    setDoc(docRef, {
      ...data,
      id: betId,
      userId: user.id,
      userName: user.nome || user.terminal,
      status: 'open',
      createdAt: new Date().toISOString()
    }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
    
    return true;
  };

  const updateSnookerLiveConfig = (cfg: SnookerLiveConfig) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'configuracoes', 'snooker_live_config');
    setDoc(docRef, cfg).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
  };

  const updateSnookerChannel = (channel: any) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'snooker', channel.id);
    setDoc(docRef, channel, { merge: true }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
  };

  const deleteSnookerChannel = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'snooker', id);
    deleteDoc(docRef).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
  };

  const updateSnookerScoreboard = (channelId: string, scoreboard: any) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'snooker_scoreboards', channelId);
    setDoc(docRef, scoreboard, { merge: true }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
  };

  const sendSnookerChatMessage = (channelId: string, text: string) => {
    if (!user) return;
    const bancaId = user.bancaId || 'default';
    const msgId = `msg-${Date.now()}`;
    const docRef = doc(firestore, 'bancas', bancaId, 'snooker_chat', msgId);
    
    setDoc(docRef, {
      id: msgId,
      channelId,
      userId: user.id,
      userName: user.nome || user.terminal,
      text: filterProfanity(text),
      createdAt: new Date().toISOString()
    }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
  };

  const updateBingoSettings = (cfg: BingoSettings) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'configuracoes', 'bingo_settings');
    setDoc(docRef, cfg).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
  };

  const updateCasinoSettings = (cfg: CasinoSettings) => {
    const bancaId = user?.bancaId || 'default';
    const docRef = doc(firestore, 'bancas', bancaId, 'configuracoes', 'casino_settings');
    setDoc(docRef, cfg).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
  };

  const logout = () => {
    authLogout();
    setUser(null);
    router.push('/login');
  };

  const handleFinalizarAposta = async (aposta: any, valorTotal: number) => {
    if (!user) { router.push('/login'); return null; }
    const bancaId = user.bancaId || 'default';
    const pouleId = generatePoule();
    
    const result = await LedgerService.registerMovement({
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: aposta.loteria,
      type: 'BET_PLACED',
      amount: -valorTotal,
      referenceId: pouleId,
      description: `${aposta.loteria}: ${aposta.numeros}`
    });

    if (result.success) {
      const docRef = doc(firestore, 'bancas', bancaId, 'apostas', pouleId);
      setDoc(docRef, { ...aposta, id: pouleId, userId: user.id, bancaId, status: 'aguardando', createdAt: new Date().toISOString() })
        .catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
      return pouleId;
    }
    return null;
  };

  const processarResultados = async (data: any) => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    const id = `${data.data}-${data.loteria}-${data.horario}`.replace(/\s/g, "_").replace(/[^\w-]/g, "").toLowerCase();
    const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', id);
    
    setDoc(docRef, { ...data, id, bancaId, status: 'PUBLICADO', createdAt: new Date().toISOString() })
      .catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write' })));
  };

  const value: AppContextType = {
    user, allUsers, isLoading, currentBanca, subdomain,
    balance: user?.saldo || 0,
    bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, jdbResults, snookerChannels,
    postedResults: jdbResults,
    footballData, footballBets, betSlip,
    syncFootballAll: async () => {}, addBetToSlip: () => {}, removeBetFromSlip: () => {}, clearBetSlip: () => {}, 
    placeFootballBet: async () => null, updateLeagueConfig: () => {},
    snookerPresence, snookerSyncState, celebrationTrigger, snookerLiveConfig,
    snookerBets, snookerFinancialHistory, snookerChatMessages, snookerCashOutLog,
    snookerScoreboards, snookerScoreRecognitionSettings, snookerAutomationSettings, snookerPrimaryChannelId,
    snookerSyncLogs, snookerBetsFeed, snookerActivityFeed,
    casinoSettings, bingoSettings, bingoDraws, bingoTickets, bingoPayouts,
    liveMiniPlayerConfig,
    refreshData: () => { syncJDBResults(); syncSnookerFromYoutube(); }, 
    logout, handleFinalizarAposta,
    processarResultados,
    syncSnookerFromYoutube, 
    joinChannel: (c, u) => {}, leaveChannel: (c, u) => {}, 
    clearCelebration: () => setCelebrationTrigger(false), 
    sendSnookerChatMessage, sendSnookerReaction: (c, r) => {}, 
    placeSnookerBet, cashOutSnookerBet: (id) => {}, 
    settleSnookerRound: (c, w) => {}, 
    updateSnookerLiveConfig, updateSnookerChannel, deleteSnookerChannel, 
    addSnookerChannel: (c) => updateSnookerChannel(c), updateSnookerScoreboard,
    updateSnookerScoreRecognitionSettings: (cfg) => setSnookerScoreRecognitionSettings(cfg), 
    updateSnookerAutomationSettings: (cfg) => setSnookerAutomationSettings(cfg),
    updateSnookerAutomationSource: () => {}, toggleSnookerSource: () => {}, approveAutoSnookerChannel: () => {}, 
    archiveAutoSnookerChannel: () => {}, clearSnookerSyncLogs: () => setSnookerSyncLogs([]),
    setManualPrimarySnookerChannel: (id) => setSnookerPrimaryChannelId(id),
    updateBingoSettings, createBingoDraw: () => {}, startBingoDraw: () => {}, drawBingoBall: () => {}, 
    finishBingoDraw: () => {}, cancelBingoDraw: () => {}, buyBingoTickets: () => true, refundBingoTicket: () => {}, 
    payBingoPayout: () => {}, updateCasinoSettings,
    updateBanner: (b) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', b.id);
      setDoc(docRef, b).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
    },
    addBanner: (b) => {
      const id = `banner-${Date.now()}`;
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id);
      setDoc(docRef, { ...b, id }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
    },
    deleteBanner: (id) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id);
      deleteDoc(docRef).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
    },
    updatePopup: (p) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', p.id);
      setDoc(docRef, p).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
    },
    addPopup: (p) => {
      const id = `popup-${Date.now()}`;
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id);
      setDoc(docRef, { ...p, id }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
    },
    deletePopup: (id) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id);
      deleteDoc(docRef).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
    },
    updateNews: (n) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', n.id);
      setDoc(docRef, n).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
    },
    addNews: (n) => {
      const id = `news-${Date.now()}`;
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id);
      setDoc(docRef, { ...n, id }).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create' })));
    },
    deleteNews: (id) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id);
      deleteDoc(docRef).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })));
    },
    updateLiveMiniPlayerConfig: (cfg) => {
      const docRef = doc(firestore, 'bancas', user?.bancaId || 'default', 'configuracoes', 'mini_player');
      setDoc(docRef, cfg).catch(async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' })));
    },
    syncJDBResults,
    fullLedger: ledger
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};