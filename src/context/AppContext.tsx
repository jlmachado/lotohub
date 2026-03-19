'use client';

/**
 * @fileOverview AppContext Professional - Motor de Tempo Real Multi-Tenant.
 * Versão V14: Correção de caminhos de coleção e implementação de processarResultados.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, setDoc, 
  deleteDoc, where, getFirestore, Firestore 
} from 'firebase/firestore';
import { resolveCurrentBanca, getSubdomain } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { CommissionService } from '@/services/advanced/CommissionService';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard } from '@/utils/espn-normalizer';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { SnookerSyncService } from '@/services/snooker-sync-service';
import { ResultsSyncService } from '@/services/results-sync-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

// --- Interfaces de Tipagem ---

export interface Banner { id: string; title: string; imageUrl: string; active: boolean; position: number; bancaId: string; content?: string; linkUrl?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; imageUrl: string; active: boolean; priority: number; bancaId: string; description?: string; linkUrl?: string; buttonText?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[];
  unifiedMatches: MatchModel[];
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

export interface BingoPayout {
  id: string;
  userId: string;
  drawId: string;
  amount: number;
  type: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
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

export interface SnookerAutomationSource {
  id: string;
  name: string;
  channelId: string;
  enabled: boolean;
  priority: number;
  parseProfile: 'tv_snooker_brasil' | 'junior_snooker' | 'generic';
  autoCreateChannels: boolean;
  autoUpdateChannels: boolean;
  requireAdminApproval: boolean;
}

export interface SnookerAutomationSettings {
  enabled: boolean;
  intervalMinutes: number;
  sources: SnookerAutomationSource[];
  manualPrimaryChannelId: string | null;
  nextRunAt?: string;
  lastRunAt?: string;
  status: 'idle' | 'running' | 'error';
}

export interface SnookerSyncLog {
  id: string;
  message: string;
  status: 'success' | 'error' | 'warning';
  sourceName?: string;
  createdAt: string;
}

export interface SnookerScoreReading {
  channelId: string;
  playerA: string;
  playerB: string;
  scoreA: number;
  scoreB: number;
  confidence: number;
  stableCount: number;
  capturedAt: string;
  rawText?: string;
}

export interface SnookerScoreboard {
  channelId: string;
  playerA: { name: string };
  playerB: { name: string };
  scoreA: number;
  scoreB: number;
  statusText?: string;
}

export interface SnookerScoreRecognitionSettings {
  enabled: boolean;
  mode: 'manual' | 'auto_assistido';
  autoApplyScore: boolean;
  minConfidenceToAutoApply: number;
  requiredStableReads: number;
  captureIntervalSeconds: number;
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
  snookerBets: any[];
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
  updateSnookerLiveConfig: (cfg: any) => void;
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
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
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
      
      const unsubUser = onSnapshot(userRef, 
        (snap) => {
          if (snap.exists()) {
            setUser({ id: snap.id, ...snap.data() });
          } else if (activeBancaId !== 'default') {
            const masterRef = doc(firestore, 'bancas', 'default', 'usuarios', session.userId);
            onSnapshot(masterRef, (mSnap) => {
              if (mSnap.exists()) setUser({ id: mSnap.id, ...mSnap.data() });
            });
          }
          setIsLoading(false);
        },
        async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
          } satisfies SecurityRuleContext));
        }
      );
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore]);

  // --- Firestore Listeners ---

  useEffect(() => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    const bancaPath = `bancas/${bancaId}`;

    // Listener para Resultados Multi-Banca
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR");
    
    const unsubResults = onSnapshot(
      query(collection(firestore, bancaPath, 'jdbResults'), where("data", "==", dataFormatada)), 
      (s) => {
        const results = s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult));
        setJdbResults(results);
      },
      async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `${bancaPath}/jdbResults`,
          operation: 'list',
        } satisfies SecurityRuleContext));
      }
    );

    if (bancaId === 'default' && (!user || (user.tipoUsuario !== 'SUPER_ADMIN' && user.role !== 'superadmin'))) {
      // return () => unsubResults(); // Don't return yet, we need more listeners
    }
    
    const unsubscribers = [
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), 
        (s) => setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/banners`, operation: 'list' }))
      ),
      
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), 
        (s) => setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/popups`, operation: 'list' }))
      ),
      
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), 
        (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/news_messages`, operation: 'list' }))
      ),

      onSnapshot(query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50)), 
        (s) => setApostas(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/apostas`, operation: 'list' }))
      ),

      onSnapshot(query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)), 
        (s) => setLedger(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/ledgerEntries`, operation: 'list' }))
      ),

      onSnapshot(collection(firestore, bancaPath, 'snooker'), 
        (s) => setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/snooker`, operation: 'list' }))
      ),

      onSnapshot(collection(firestore, bancaPath, 'usuarios'), 
        (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/usuarios`, operation: 'list' }))
      ),

      onSnapshot(collection(firestore, bancaPath, 'football_bets'), 
        (s) => setFootballBets(s.docs.map(d => ({ id: d.id, ...d.data() } as FootballBet))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/football_bets`, operation: 'list' }))
      ),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), 
        (s) => { if (s.exists()) setCasinoSettings(s.data() as CasinoSettings); },
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/casino_settings`, operation: 'get' }))
      ),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), 
        (s) => { if (s.exists()) setBingoSettings(s.data() as BingoSettings); },
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/bingo_settings`, operation: 'get' }))
      ),

      onSnapshot(collection(firestore, bancaPath, 'bingo_draws'), 
        (s) => setBingoDraws(s.docs.map(d => ({ id: d.id, ...d.data() } as BingoDraw))),
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/bingo_draws`, operation: 'list' }))
      ),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), 
        (s) => { if (s.exists()) setSnookerLiveConfig(s.data() as SnookerLiveConfig); },
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/snooker_live_config`, operation: 'get' }))
      ),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_automation'), 
        (s) => { if (s.exists()) setSnookerAutomationSettings(s.data() as SnookerAutomationSettings); },
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/snooker_automation`, operation: 'get' }))
      ),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_ocr'), 
        (s) => { if (s.exists()) setSnookerScoreRecognitionSettings(s.data() as SnookerScoreRecognitionSettings); },
        async (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${bancaPath}/configuracoes/snooker_ocr`, operation: 'get' }))
      )
    ];

    return () => {
      unsubResults();
      unsubscribers.forEach(unsub => unsub());
    };
  }, [firestore, currentBanca, user]);

  // --- Sync Logic Definitiva ---

  const syncJDBResults = useCallback(async () => {
    if (!user || (!user.id && !user.uid) || !currentBanca?.id) return;

    const bancaId = currentBanca.id;
    const results = await ResultsSyncService.getLatestResults();
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR");

    for (const resultado of results) {
      if (!resultado) continue;
      const idBase = `${resultado.date}-${resultado.lotteryName}-${resultado.time}`;
      const safeId = idBase.replace(/\s/g, "_").replace(/[^\w-]/g, "").toLowerCase();
      const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', safeId);
      
      const docData = {
        ...resultado,
        id: safeId,
        bancaId,
        data: dataFormatada,
        createdAt: (resultado as any).createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setDoc(docRef, docData, { merge: true })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: docData
          } satisfies SecurityRuleContext));
        });
    }
  }, [user, currentBanca, firestore]);

  const syncSnookerFromYoutube = useCallback(async (force = false) => {
    if (!user || !currentBanca?.id) return;
    
    const bancaId = currentBanca.id;
    setSnookerSyncState('syncing');

    try {
      let jogos = [];
      try {
        jogos = await SnookerSyncService.fetchFromMainSource(); 
      } catch (e) {
        jogos = await SnookerSyncService.fetchFromFallbackSource();
      }

      for (const jogo of jogos) {
        const docRef = doc(firestore, 'bancas', bancaId, 'snooker', jogo.id);
        const docData = { ...jogo, bancaId, createdAt: new Date().toISOString() };
        
        setDoc(docRef, docData, { merge: true })
          .catch(async (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: docRef.path,
              operation: 'write',
              requestResourceData: docData
            } satisfies SecurityRuleContext));
          });
      }
      setSnookerSyncState('idle');
    } catch (e) {
      setSnookerSyncState('error');
    }
  }, [user, currentBanca, firestore]);

  // --- Gatilho de Sincronização baseado em Auth e Banca ---
  useEffect(() => {
    if (user && currentBanca) {
      syncJDBResults();
      syncSnookerFromYoutube();
    }
  }, [user, currentBanca, syncJDBResults, syncSnookerFromYoutube]);

  // --- Generic Handlers ---

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
      const apostaRef = doc(firestore, 'bancas', bancaId, 'apostas', pouleId);
      const apostaData = {
        ...aposta,
        id: pouleId,
        userId: user.id,
        bancaId: bancaId,
        status: 'aguardando',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setDoc(apostaRef, apostaData)
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: apostaRef.path,
            operation: 'create',
            requestResourceData: apostaData
          } satisfies SecurityRuleContext));
        });

      await CommissionService.processarComissao(bancaId, user.id, user.tipoUsuario, valorTotal, pouleId);
      return pouleId;
    } else {
      toast({ variant: 'destructive', title: "Erro Financeiro", description: result.message });
      return null;
    }
  };

  const processarResultados = async (data: any) => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    const id = `${data.data}-${data.loteria}-${data.horario}`.replace(/\s/g, "_").replace(/[^\w-]/g, "").toLowerCase();
    const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', id);
    
    const resultDoc = {
      ...data,
      id,
      bancaId,
      status: 'PUBLICADO',
      sourceType: 'MANUAL',
      sourceName: user?.nome || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(docRef, resultDoc).catch(err => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: resultDoc
       }));
    });
  };

  const syncFootballAll = useCallback(async (force = false) => {
    if (footballData.syncStatus === 'syncing' && !force) return;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      const allMatches: MatchModel[] = [];
      const rawMatches: any[] = [];
      for (const league of activeLeagues) {
        const data = await espnService.getScoreboard(league.slug);
        if (data?.events) {
          const normalized = normalizeESPNScoreboard(data, league.slug);
          rawMatches.push(...normalized);
          const bettable = normalized.map(MatchMapperService.transformEspnToBettable);
          allMatches.push(...bettable);
        }
      }
      setFootballData(prev => ({ ...prev, matches: rawMatches, unifiedMatches: allMatches, syncStatus: 'idle', lastSyncAt: new Date().toISOString() }));
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, [footballData.leagues, footballData.syncStatus]);

  const addBetToSlip = (item: BetSlipItem) => {
    setBetSlip(prev => {
      const exists = prev.some(i => i.matchId === item.matchId && i.market === item.market && i.selection === item.selection);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(i => i.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = async (stake: number) => {
    if (!user) { router.push('/login'); return null; }
    const bancaId = user.bancaId || 'default';
    const totalOdds = betSlip.reduce((acc, i) => acc * i.odd, 1);
    const potentialWin = stake * totalOdds;
    const betId = `FB-${Date.now()}`;

    const result = await LedgerService.registerMovement({
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: 'Futebol',
      type: 'BET_PLACED',
      amount: -stake,
      referenceId: betId,
      description: `Aposta Futebol (${betSlip.length} seleções)`
    });

    if (result.success) {
      const betRef = doc(firestore, 'bancas', bancaId, 'football_bets', betId);
      const betData = {
        id: betId,
        userId: user.id,
        bancaId,
        terminal: user.terminal,
        stake,
        potentialWin,
        status: 'OPEN',
        items: betSlip,
        createdAt: new Date().toISOString()
      };

      setDoc(betRef, betData)
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: betRef.path,
            operation: 'create',
            requestResourceData: betData
          } satisfies SecurityRuleContext));
        });
      clearBetSlip();
      return betId;
    }
    return null;
  };

  const updateLeagueConfig = (id: string, updates: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => ({
      ...prev,
      leagues: prev.leagues.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const updateSnookerLiveConfig = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'configuracoes', 'snooker_live_config');
    setDoc(ref, cfg, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: cfg }));
    });
  };

  const updateSnookerChannel = (channel: any) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'snooker', channel.id);
    setDoc(ref, channel, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: channel }));
    });
  };

  const deleteSnookerChannel = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'snooker', id);
    deleteDoc(ref).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'delete' }));
    });
  };

  const updateSnookerScoreboard = (channelId: string, scoreboard: any) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'snooker_scoreboards', channelId);
    setDoc(ref, scoreboard, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: scoreboard }));
    });
  };

  const updateCasinoSettings = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'configuracoes', 'casino_settings');
    setDoc(ref, cfg, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: cfg }));
    });
  };

  const updateBingoSettings = (cfg: BingoSettings) => {
    const bancaId = user?.bancaId || 'default';
    const ref = doc(firestore, 'bancas', bancaId, 'configuracoes', 'bingo_settings');
    setDoc(ref, cfg, { merge: true }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: cfg }));
    });
  };

  const logout = () => {
    authLogout();
    setUser(null);
  }

  const value: AppContextType = {
    user, allUsers, isLoading, currentBanca, subdomain,
    balance: user?.saldo || 0,
    bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, jdbResults, snookerChannels,
    postedResults: jdbResults,
    footballData, footballBets, betSlip,
    syncFootballAll, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet, updateLeagueConfig,
    snookerPresence, snookerSyncState, celebrationTrigger, snookerLiveConfig,
    snookerBets, snookerFinancialHistory, snookerChatMessages, snookerCashOutLog,
    snookerScoreboards, snookerScoreRecognitionSettings, snookerAutomationSettings, snookerPrimaryChannelId,
    snookerSyncLogs, snookerBetsFeed, snookerActivityFeed,
    casinoSettings, bingoSettings, bingoDraws, bingoTickets, bingoPayouts,
    liveMiniPlayerConfig,
    refreshData: () => { syncJDBResults(); syncSnookerFromYoutube(); }, 
    logout, handleFinalizarAposta,
    processarResultados,
    syncSnookerFromYoutube, joinChannel: () => {}, leaveChannel: () => {}, clearCelebration: () => setCelebrationTrigger(false), 
    sendSnookerChatMessage: () => {}, sendSnookerReaction: () => {}, placeSnookerBet: () => true, cashOutSnookerBet: () => {}, 
    settleSnookerRound: () => {}, updateSnookerLiveConfig, updateSnookerChannel, deleteSnookerChannel, 
    addSnookerChannel: (c) => updateSnookerChannel(c), updateSnookerScoreboard,
    updateSnookerScoreRecognitionSettings: (cfg) => {
      const b = user?.bancaId || 'default';
      setDoc(doc(firestore, b, 'configuracoes', 'snooker_ocr'), cfg, { merge: true });
    },
    updateSnookerAutomationSettings: (cfg) => {
      const b = user?.bancaId || 'default';
      setDoc(doc(firestore, b, 'configuracoes', 'snooker_automation'), cfg, { merge: true });
    },
    updateSnookerAutomationSource: () => {}, toggleSnookerSource: () => {}, approveAutoSnookerChannel: () => {}, 
    archiveAutoSnookerChannel: () => {}, clearSnookerSyncLogs: () => setSnookerSyncLogs([]),
    setManualPrimarySnookerChannel: (id) => updateSnookerAutomationSettings({ ...snookerAutomationSettings, manualPrimaryChannelId: id }),
    updateBingoSettings, createBingoDraw: () => {}, startBingoDraw: () => {}, drawBingoBall: () => {}, 
    finishBingoDraw: () => {}, cancelBingoDraw: () => {}, buyBingoTickets: () => true, refundBingoTicket: () => {}, 
    payBingoPayout: () => {}, updateCasinoSettings,
    updateBanner: (b) => {
      const bid = user?.bancaId || 'default';
      setDoc(doc(firestore, 'bancas', bid, 'banners', b.id), b, { merge: true });
    },
    addBanner: (b) => {
      const bid = user?.bancaId || 'default';
      const id = b.id || `banner-${Date.now()}`;
      setDoc(doc(firestore, 'bancas', bid, 'banners', id), { ...b, id, bancaId: bid });
    },
    deleteBanner: (id) => {
      const bid = user?.bancaId || 'default';
      deleteDoc(doc(firestore, 'bancas', bid, 'banners', id));
    },
    updatePopup: (p) => {
      const bid = user?.bancaId || 'default';
      setDoc(doc(firestore, 'bancas', bid, 'popups', p.id), p, { merge: true });
    },
    addPopup: (p) => {
      const bid = user?.bancaId || 'default';
      const id = p.id || `popup-${Date.now()}`;
      setDoc(doc(firestore, 'bancas', bid, 'popups', id), { ...p, id, bancaId: bid });
    },
    deletePopup: (id) => {
      const bid = user?.bancaId || 'default';
      deleteDoc(doc(firestore, 'bancas', bid, 'popups', id));
    },
    updateNews: (n) => {
      const bid = user?.bancaId || 'default';
      setDoc(doc(firestore, 'bancas', bid, 'news_messages', n.id), n, { merge: true });
    },
    addNews: (n) => {
      const bid = user?.bancaId || 'default';
      const id = n.id || `news-${Date.now()}`;
      setDoc(doc(firestore, 'bancas', bid, 'news_messages', id), { ...n, id, bancaId: bid });
    },
    deleteNews: (id) => {
      const bid = user?.bancaId || 'default';
      deleteDoc(doc(firestore, 'bancas', bid, 'news_messages', id));
    },
    updateLiveMiniPlayerConfig: (cfg) => {
      const bid = user?.bancaId || 'default';
      setDoc(doc(firestore, 'bancas', bid, 'configuracoes', 'mini_player'), cfg, { merge: true });
    },
    syncJDBResults
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