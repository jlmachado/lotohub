'use client';

/**
 * @fileOverview AppContext Professional - Motor Multi-Banca em Tempo Real com Fallback Híbrido.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, setDoc, 
  deleteDoc, where, updateDoc, increment, arrayUnion, arrayRemove,
  Timestamp, serverTimestamp
} from 'firebase/firestore';
import { resolveCurrentBanca, getCurrentBancaId } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { SnookerSyncService } from '@/services/snooker-sync-service';
import { ResultsSyncService } from '@/services/results-sync-service';
import { filterProfanity } from '@/utils/profanity-filter';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MigrationService } from '@/services/migration-service';

// --- Interfaces ---
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
  const [currentBanca, setCurrentBanca] = useState<any>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  
  // Resultados Escopados
  const [tenantJdbResults, setTenantJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [globalJdbResults, setGlobalJdbResults] = useState<JDBNormalizedResult[]>([]);
  
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  
  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings | null>(null);
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig | null>(null);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);

  const activeBancaIdRef = useRef<string>('default');

  // --- Multi-Tenant Context Resolution ---

  useEffect(() => {
    if (firestore) {
      MigrationService.syncToCloud(firestore);
    }

    const session = getSession();
    const bancaId = getCurrentBancaId();
    activeBancaIdRef.current = bancaId;
    setCurrentBanca(resolveCurrentBanca());

    if (session?.userId) {
      const userRef = doc(firestore, 'bancas', session.bancaId || 'default', 'usuarios', session.userId);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          setUser({ id: snap.id, ...userData });
          activeBancaIdRef.current = userData.bancaId || bancaId;
        }
        setIsLoading(false);
      }, (err) => {
        console.warn("[Auth] Fallback session lookup failed:", err.message);
        setIsLoading(false);
      });
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore]);

  // --- Real-time Listeners Híbridos (Global + Tenant) ---

  useEffect(() => {
    const bancaId = activeBancaIdRef.current;
    const bancaPath = `bancas/${bancaId}`;

    console.log(`[Multi-Banca] Sincronizando dados em: ${bancaPath}`);

    const handlePermError = (path: string, op: string) => {
      // Only emit if user is logged in, otherwise it's expected during initial load
      if (user) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: op as any }));
      }
    };

    const unsubscribers = [
      // 🔓 DADOS PÚBLICOS
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), 
        (s) => setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner))),
        (err) => handlePermError(`${bancaPath}/banners`, 'list')
      ),
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), 
        (s) => setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup))),
        (err) => handlePermError(`${bancaPath}/popups`, 'list')
      ),
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), 
        (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage))),
        (err) => handlePermError(`${bancaPath}/news_messages`, 'list')
      ),
      onSnapshot(collection(firestore, bancaPath, 'snooker'), 
        (s) => setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => handlePermError(`${bancaPath}/snooker`, 'list')
      ),
      onSnapshot(collection(firestore, bancaPath, 'jdbResults'), 
        (s) => setTenantJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))),
        (err) => handlePermError(`${bancaPath}/jdbResults`, 'list')
      ),
      onSnapshot(collection(firestore, 'jdbResults'), 
        (s) => setGlobalJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))),
        (err) => handlePermError(`jdbResults`, 'list')
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), 
        (s) => s.exists() && setCasinoSettings(s.data() as CasinoSettings),
        (err) => handlePermError(`${bancaPath}/configuracoes/casino_settings`, 'get')
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), 
        (s) => s.exists() && setBingoSettings(s.data() as BingoSettings),
        (err) => handlePermError(`${bancaPath}/configuracoes/bingo_settings`, 'get')
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), 
        (s) => s.exists() && setSnookerLiveConfig(s.data() as SnookerLiveConfig),
        (err) => handlePermError(`${bancaPath}/configuracoes/snooker_live_config`, 'get')
      ),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'mini_player'), 
        (s) => s.exists() && setLiveMiniPlayerConfig(s.data()),
        (err) => handlePermError(`${bancaPath}/configuracoes/mini_player`, 'get')
      ),
      onSnapshot(collection(firestore, bancaPath, 'snooker_scoreboards'), 
        (s) => {
          const boards: Record<string, any> = {};
          s.docs.forEach(d => { boards[d.id] = d.data(); });
          setSnookerScoreboards(boards);
        },
        (err) => handlePermError(`${bancaPath}/snooker_scoreboards`, 'list')
      ),
      onSnapshot(collection(firestore, bancaPath, 'bingo_draws'), 
        (s) => { /* setBingoDraws(s.docs.map(d => ({id: d.id, ...d.data()}))) */ },
        (err) => handlePermError(`${bancaPath}/bingo_draws`, 'list')
      )
    ];

    // 🔒 DADOS PROTEGIDOS (Apenas Logado)
    if (user) {
      unsubscribers.push(
        onSnapshot(query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50)), 
          (s) => setApostas(s.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => handlePermError(`${bancaPath}/apostas`, 'list')
        ),
        onSnapshot(query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)), 
          (s) => setLedger(s.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => handlePermError(`${bancaPath}/ledgerEntries`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_bets'), 
          (s) => setSnookerBets(s.docs.map(d => ({ id: d.id, ...d.data() } as SnookerBet))),
          (err) => handlePermError(`${bancaPath}/snooker_bets`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'football_bets'), 
          (s) => { /* setFootballBets(...) */ },
          (err) => handlePermError(`${bancaPath}/football_bets`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'bingo_tickets'), 
          (s) => { /* setBingoTickets(...) */ },
          (err) => handlePermError(`${bancaPath}/bingo_tickets`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_chat'), 
          (s) => { /* setSnookerChatMessages(...) */ },
          (err) => handlePermError(`${bancaPath}/snooker_chat`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_presence'), 
          (s) => { /* setSnookerPresence(...) */ },
          (err) => handlePermError(`${bancaPath}/snooker_presence`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_sync_logs'), 
          (s) => { /* setSnookerSyncLogs(...) */ },
          (err) => handlePermError(`${bancaPath}/snooker_sync_logs`, 'list')
        ),
        onSnapshot(collection(firestore, bancaPath, 'snooker_cashout_log'), 
          (s) => { /* setSnookerCashOutLog(...) */ },
          (err) => handlePermError(`${bancaPath}/snooker_cashout_log`, 'list')
        )
      );

      // Listen to users if Admin
      if (user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN') {
        unsubscribers.push(
          onSnapshot(collection(firestore, bancaPath, 'usuarios'), 
            (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            (err) => handlePermError(`${bancaPath}/usuarios`, 'list')
          )
        );
      }
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, user, currentBanca]);

  // Consolidar resultados para a UI
  const jdbResults = React.useMemo(() => {
    const map = new Map<string, JDBNormalizedResult>();
    globalJdbResults.forEach(r => map.set(r.id, r));
    tenantJdbResults.forEach(r => map.set(r.id, r));
    
    return Array.from(map.values()).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  }, [globalJdbResults, tenantJdbResults]);

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
        .catch(async (err) => handlePermError(docRef.path, 'create'));
      return pouleId;
    }
    return null;
  };

  const processarResultados = async (data: any) => {
    if (!user) return;
    const bancaId = user.bancaId || 'default';
    
    const id = `manual-${data.data}-${data.loteria}-${data.horario}`.replace(/\s/g, '-').toLowerCase();
    const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', id);
    
    const result: JDBNormalizedResult = {
      id, bancaId, stateCode: data.loteria === 'jogo-do-bicho' ? 'RJ' : 'UN',
      stateName: data.loteria === 'jogo-do-bicho' ? 'Rio de Janeiro' : 'Nacional',
      lotteryId: data.loteria, lotteryName: data.loteria, extractionName: data.jogoDoBichoLoteria || 'Oficial',
      date: data.data, time: data.horario, status: 'PUBLICADO', sourceType: 'MANUAL', sourceName: 'Administrador',
      prizes: data.resultados, checksum: Date.now().toString(), isDivergent: false,
      importedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString(),
      createdBy: user.nome || user.terminal
    };

    try {
      await setDoc(docRef, result);
      toast({ title: "Resultado publicado!" });
    } catch (e: any) {
      handlePermError(docRef.path, 'write');
    }
  };

  const syncJDBResults = useCallback(async () => {
    if (!user) return;
    const bancaId = user.bancaId || 'default';
    try {
      const imported = await ResultsSyncService.getLatestResults();
      for (const res of imported) {
        const docRef = doc(firestore, 'bancas', bancaId, 'jdbResults', res.id);
        setDoc(docRef, { ...res, bancaId }, { merge: true }).catch(e => {});
      }
    } catch (e: any) {}
  }, [user, firestore]);

  const value: AppContextType = {
    user, allUsers, isLoading, currentBanca, subdomain: currentBanca?.subdomain || null,
    balance: user?.saldo || 0,
    bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, 
    jdbResults, 
    postedResults: jdbResults,
    footballData: { leagues: [], matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null },
    footballBets: [], betSlip: [],
    syncFootballAll: async () => {}, addBetToSlip: () => {}, removeBetFromSlip: () => {}, clearBetSlip: () => {}, 
    placeFootballBet: async () => null, updateLeagueConfig: () => {},
    snookerPresence: {}, snookerSyncState, celebrationTrigger: false, snookerLiveConfig,
    snookerBets, snookerFinancialHistory: [], snookerChatMessages: [], snookerCashOutLog: [],
    snookerScoreboards, snookerScoreRecognitionSettings: { enabled: false, mode: 'manual', autoApplyScore: false, minConfidenceToAutoApply: 0.8, requiredStableReads: 3, captureIntervalSeconds: 10 }, 
    snookerAutomationSettings: { enabled: true, intervalMinutes: 5, sources: [], manualPrimaryChannelId: null, status: 'idle' }, 
    snookerPrimaryChannelId: null,
    snookerSyncLogs: [], snookerBetsFeed: [], snookerActivityFeed: [],
    casinoSettings, bingoSettings, bingoDraws: [], bingoTickets: [], bingoPayouts: [],
    liveMiniPlayerConfig,
    refreshData: () => {}, logout, handleFinalizarAposta,
    processarResultados,
    syncSnookerFromYoutube: async () => {}, joinChannel: () => {}, leaveChannel: () => {}, 
    clearCelebration: () => {}, sendSnookerChatMessage: () => {}, sendSnookerReaction: () => {}, 
    placeSnookerBet: () => false, cashOutSnookerBet: () => {}, settleSnookerRound: () => {}, 
    updateSnookerLiveConfig: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/snooker_live_config`), cfg), 
    updateSnookerChannel: () => {}, deleteSnookerChannel: () => {}, addSnookerChannel: () => {}, updateSnookerScoreboard: () => {},
    updateSnookerScoreRecognitionSettings: () => {}, updateSnookerAutomationSettings: () => {},
    updateSnookerAutomationSource: () => {}, toggleSnookerSource: () => {}, approveAutoSnookerChannel: () => {}, 
    archiveAutoSnookerChannel: () => {}, clearSnookerSyncLogs: () => {}, setManualPrimarySnookerChannel: () => {},
    updateBingoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/bingo_settings`), cfg), 
    createBingoDraw: () => {}, startBingoDraw: () => {}, drawBingoBall: () => {}, 
    finishBingoDraw: () => {}, cancelBingoDraw: () => {}, buyBingoTickets: () => true, refundBingoTicket: () => {}, 
    payBingoPayout: () => {}, updateCasinoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/casino_settings`), cfg),
    updateBanner: (b) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', b.id), b),
    addBanner: (b) => { const id = `banner-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id), { ...b, id }); },
    deleteBanner: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id)),
    updatePopup: (p) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', p.id), p),
    addPopup: (p) => { const id = `popup-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id), { ...p, id }); },
    deletePopup: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id)),
    updateNews: (n) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', n.id), n),
    addNews: (n) => { const id = `news-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id), { ...n, id }); },
    deleteNews: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id)),
    updateLiveMiniPlayerConfig: (cfg) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'configuracoes', 'mini_player'), cfg),
    syncJDBResults,
    fullLedger: ledger
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
