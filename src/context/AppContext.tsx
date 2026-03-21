'use client';

/**
 * @fileOverview AppContext Professional - Motor Multi-Banca em Tempo Real.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, setDoc, 
  deleteDoc, where, updateDoc, increment, arrayUnion, arrayRemove,
  Timestamp, serverTimestamp, getDocs
} from 'firebase/firestore';
import { resolveCurrentBanca, getCurrentBancaId } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard } from '@/utils/espn-normalizer';

// --- Interfaces ---
export interface JDBLoteria {
  id: string;
  bancaId: string;
  nome: string;
  stateName?: string;
  stateCode?: string;
  modalidades: { nome: string; multiplicador: string }[];
  dias: Record<string, { selecionado: boolean; horarios: string[] }>;
}

export interface GenericLotteryConfig {
  id: string;
  nome: string;
  status: 'Ativa' | 'Inativa';
  horarios: { dia: string; horas: string }[];
  multiplicadores: { modalidade: string; multiplicador: string }[];
}

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
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  category: 'quadra' | 'kina' | 'keno';
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
  jdbLoterias: JDBLoteria[];
  genericLotteryConfigs: GenericLotteryConfig[];
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
  getMatchesCollection: (id: string) => void;
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
  finishBingoDraw: (id: string) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;

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
  deleteJDBResult: (id: string) => Promise<void>;
  publishJDBResult: (id: string) => Promise<void>;
  fullLedger: any[];
  genericLotteryConfigs: any[];
  updateGenericLottery: (cfg: any) => void;
  activeBancaId: string;
  addJDBLoteria: (loteria: any) => void;
  updateJDBLoteria: (loteria: any) => void;
  deleteJDBLoteria: (id: string) => void;
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
  const [jdbResults, setJdbResults] = useState<JDBNormalizedResult[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  
  // Football
  const [footballLeagues, setFootballLeagues] = useState<ESPNLeagueConfig[]>([]);
  const [footballMatches, setFootballMatches] = useState<any[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Snooker
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [snookerSyncLogs, setSnookerSyncLogs] = useState<SnookerSyncLog[]>([]);
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  
  const [casinoSettings, setCasinoSettings] = useState<CasinoSettings | null>(null);
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<SnookerLiveConfig | null>(null);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);

  const [contextTicker, setContextTicker] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setContextTicker(t => t + 1);
    window.addEventListener('banca-context-updated', handleUpdate);
    window.addEventListener('app:data-changed', handleUpdate);
    return () => {
      window.removeEventListener('banca-context-updated', handleUpdate);
      window.removeEventListener('app:data-changed', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const session = getSession();
    setCurrentBanca(resolveCurrentBanca());

    if (session?.userId) {
      const bancaId = session.bancaId || getCurrentBancaId() || 'default';
      const userRef = doc(firestore, 'bancas', bancaId, 'usuarios', session.userId);
      const unsubUser = onSnapshot(userRef, 
        (snap) => snap.exists() && setUser({ id: snap.id, ...snap.data() }),
        (err) => console.warn("[Snapshot] User profile blocked")
      );
      return () => unsubUser();
    } else {
      setIsLoading(false);
    }
  }, [firestore, contextTicker]);

  // Real-time Listeners
  useEffect(() => {
    if (!firestore) return;
    const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
    const bancaPath = `bancas/${bancaId}`;

    const unsubscribers: any[] = [];

    const handleSnapshotError = (collectionName: string) => (err: any) => {
      console.warn(`[Snapshot] Access to ${collectionName} denied or pending auth.`);
    };

    // --- Public Listeners ---
    unsubscribers.push(
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), 
        (s) => setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner))),
        handleSnapshotError('banners')),
      
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), 
        (s) => setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup))),
        handleSnapshotError('popups')),
      
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), 
        (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage))),
        handleSnapshotError('news')),
      
      onSnapshot(collection(firestore, bancaPath, 'snooker'), 
        (s) => setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        handleSnapshotError('snooker')),
      
      onSnapshot(collection(firestore, bancaPath, 'jdbResults'), 
        (s) => setJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))),
        handleSnapshotError('jdbResults')),
      
      onSnapshot(collection(firestore, bancaPath, 'jdbLoterias'), 
        (s) => setJdbLoterias(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBLoteria))),
        handleSnapshotError('jdbLoterias')),
      
      onSnapshot(collection(firestore, bancaPath, 'genericLotteryConfigs'), 
        (s) => setGenericLotteryConfigs(s.docs.map(d => ({ id: d.id, ...d.data() } as GenericLotteryConfig))),
        handleSnapshotError('genericLotteryConfigs')),
      
      onSnapshot(collection(firestore, bancaPath, 'football_leagues'), 
        (s) => {
          const loaded = s.docs.map(d => ({ id: d.id, ...d.data() } as ESPNLeagueConfig));
          if (loaded.length > 0) setFootballLeagues(loaded);
          else setFootballLeagues(ESPN_LEAGUE_CATALOG);
        },
        handleSnapshotError('football_leagues')),

      onSnapshot(collection(firestore, bancaPath, 'football_matches'), 
        (s) => {
          const loaded = s.docs.map(d => ({ id: d.id, ...d.data() }));
          console.log(`[Snapshot] ${loaded.length} matches loaded for ${bancaId}`);
          setFootballMatches(loaded);
        },
        handleSnapshotError('football_matches')),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), 
        (s) => s.exists() && setCasinoSettings(s.data() as CasinoSettings),
        handleSnapshotError('casino_settings')),
      
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), 
        (s) => s.exists() && setBingoSettings(s.data() as BingoSettings),
        handleSnapshotError('bingo_settings')),
      
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), 
        (s) => s.exists() && setSnookerLiveConfig(s.data() as SnookerLiveConfig),
        handleSnapshotError('snooker_live_config')),
      
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'mini_player'), 
        (s) => s.exists() && setLiveMiniPlayerConfig(s.data()),
        handleSnapshotError('mini_player'))
    );

    // --- Protected Listeners (Apenas se logado) ---
    if (user) {
      const isPrivileged = user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN';
      
      const apostasQuery = isPrivileged 
        ? query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50))
        : query(collection(firestore, bancaPath, 'apostas'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(50));

      const ledgerQuery = isPrivileged
        ? query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100))
        : query(collection(firestore, bancaPath, 'ledgerEntries'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(100));

      const snookerBetsQuery = isPrivileged
        ? collection(firestore, bancaPath, 'snooker_bets')
        : query(collection(firestore, bancaPath, 'snooker_bets'), where('userId', '==', user.id));

      unsubscribers.push(
        onSnapshot(apostasQuery, (s) => setApostas(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('apostas')),
        onSnapshot(ledgerQuery, (s) => setLedger(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('ledger')),
        onSnapshot(snookerBetsQuery, (s) => setSnookerBets(s.docs.map(d => ({ id: d.id, ...d.data() } as SnookerBet))), handleSnapshotError('snooker_bets'))
      );

      if (isPrivileged) {
        unsubscribers.push(
          onSnapshot(collection(firestore, bancaPath, 'usuarios'), (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('all_users')),
          onSnapshot(collection(firestore, bancaPath, 'snooker_sync_logs'), (s) => setSnookerSyncLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as SnookerSyncLog))), handleSnapshotError('sync_logs'))
        );
      }
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, user, contextTicker]);

  // Actions
  const addJDBLoteria = (loteria: any) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/jdbLoterias`, loteria.id), loteria, { merge: true });
  const updateJDBLoteria = (loteria: any) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/jdbLoterias`, loteria.id), loteria, { merge: true });
  const deleteJDBLoteria = (id: string) => deleteDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/jdbLoterias`, id));
  const updateGenericLottery = (cfg: any) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/genericLotteryConfigs`, cfg.id), cfg, { merge: true });

  const logout = () => { authLogout(); setUser(null); router.push('/login'); };

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
      await setDoc(doc(firestore, 'bancas', bancaId, 'apostas', pouleId), { ...aposta, id: pouleId, userId: user.id, bancaId, status: 'aguardando', createdAt: new Date().toISOString() });
      return pouleId;
    }
    return null;
  };

  const syncFootballAll = async (force = false) => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
    
    try {
      console.log(`[Sync] Starting Global Football Sync for ${bancaId}...`);
      
      // 1. Sync Leagues config first
      const activeLeagues = footballLeagues.length > 0 ? footballLeagues : ESPN_LEAGUE_CATALOG;
      for (const league of activeLeagues) {
        await setDoc(doc(firestore, `bancas/${bancaId}/football_leagues`, league.id), league, { merge: true });
        
        // 2. Fetch matches for each active league
        if (league.active) {
          console.log(`[Sync] Fetching matches for ${league.name} (${league.slug})...`);
          const rawData = await espnService.getScoreboard(league.slug);
          if (rawData) {
            const matches = normalizeESPNScoreboard(rawData, league.slug);
            console.log(`[Sync] Found ${matches.length} matches for ${league.name}`);
            
            // 3. Save each match individually to football_matches subcollection
            for (const match of matches) {
              const matchRef = doc(firestore, `bancas/${bancaId}/football_matches`, match.id);
              await setDoc(matchRef, {
                ...match,
                leagueId: league.slug,
                leagueName: league.name,
                bancaId,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
              }, { merge: true });
            }
          }
        }
      }

      setLastSyncAt(new Date().toISOString());
      setSyncStatus('idle');
      toast({ title: "Sincronização concluída", description: "Jogos e ligas atualizados com sucesso." });
    } catch (e: any) {
      console.error("[Sync Error]", e);
      setSyncStatus('error');
      toast({ variant: 'destructive', title: "Erro no Sync", description: e.message });
    }
  };

  const value: AppContextType = {
    user, allUsers, isLoading, currentBanca, subdomain: currentBanca?.subdomain || null,
    balance: user?.saldo || 0, bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, 
    jdbResults, postedResults: jdbResults, jdbLoterias, genericLotteryConfigs,
    
    footballData: { 
      leagues: footballLeagues, 
      matches: footballMatches, 
      unifiedMatches: footballMatches, 
      syncStatus, 
      lastSyncAt 
    },
    footballBets: [], betSlip,
    syncFootballAll,
    addBetToSlip: (item) => setBetSlip(prev => [...prev, item]),
    removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
    clearBetSlip: () => setBetSlip([]),
    placeFootballBet: async () => null,
    updateLeagueConfig: (id, updates) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/football_leagues`, id), updates, { merge: true }),

    snookerPresence, snookerSyncState, celebrationTrigger: false, snookerLiveConfig,
    snookerBets, snookerFinancialHistory: [], snookerChatMessages: [], snookerCashOutLog: [],
    snookerScoreboards, snookerSyncLogs, snookerBetsFeed, snookerActivityFeed,
    snookerScoreRecognitionSettings: { enabled: false, mode: 'manual', autoApplyScore: false, minConfidenceToAutoApply: 0.8, requiredStableReads: 3, captureIntervalSeconds: 10 }, 
    snookerAutomationSettings: { enabled: true, intervalMinutes: 5, sources: [], manualPrimaryChannelId: null, status: 'idle' }, 
    snookerPrimaryChannelId: null,
    
    casinoSettings, bingoSettings, bingoDraws: [], bingoTickets: [], bingoPayouts: [],
    liveMiniPlayerConfig,
    
    refreshData: () => setContextTicker(t => t + 1), 
    logout, handleFinalizarAposta,
    processarResultados: async (data) => {
      const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
      const id = `manual-${data.loteria}-${data.data}-${data.horario}`;
      await setDoc(doc(firestore, `bancas/${bancaId}/jdbResults`, id), { ...data, id, status: 'PUBLICADO', importedAt: new Date().toISOString() }, { merge: true });
    },
    syncSnookerFromYoutube: async () => {}, joinChannel: () => {}, leaveChannel: () => {}, 
    clearCelebration: () => {}, sendSnookerChatMessage: () => {}, sendSnookerReaction: () => {}, 
    placeSnookerBet: () => false, cashOutSnookerBet: () => {}, settleSnookerRound: () => {}, 
    updateSnookerLiveConfig: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/snooker_live_config`), cfg, { merge: true }), 
    updateSnookerChannel: () => {}, deleteSnookerChannel: () => {}, addSnookerChannel: () => {}, updateSnookerScoreboard: () => {},
    updateSnookerScoreRecognitionSettings: () => {}, updateSnookerAutomationSettings: () => {},
    updateSnookerAutomationSource: () => {}, toggleSnookerSource: () => {}, approveAutoSnookerChannel: () => {}, 
    archiveAutoSnookerChannel: () => {}, clearSnookerSyncLogs: () => {}, setManualPrimarySnookerChannel: () => {},
    updateBingoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/bingo_settings`), cfg, { merge: true }),
    createBingoDraw: () => {}, startBingoDraw: () => {}, finishBingoDraw: () => {}, buyBingoTickets: () => true,
    updateCasinoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/casino_settings`), cfg, { merge: true }),
    updateBanner: (b) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', b.id), b, { merge: true }),
    addBanner: (b) => { const id = b.id || `banner-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id), { ...b, id }, { merge: true }); },
    deleteBanner: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id)),
    updatePopup: (p) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', p.id), p, { merge: true }),
    addPopup: (p) => { const id = p.id || `popup-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id), { ...p, id }, { merge: true }); },
    deletePopup: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id)),
    updateNews: (n) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', n.id), n, { merge: true }),
    addNews: (n) => { const id = n.id || `news-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id), { ...n, id }, { merge: true }); },
    deleteNews: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id)),
    updateLiveMiniPlayerConfig: (cfg) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'configuracoes', 'mini_player'), cfg, { merge: true }),
    syncJDBResults: async () => {}, deleteJDBResult: async () => {}, publishJDBResult: async () => {},
    fullLedger: ledger,
    updateGenericLottery, activeBancaId: user?.bancaId || getCurrentBancaId() || 'default',
    addJDBLoteria, updateJDBLoteria, deleteJDBLoteria
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
