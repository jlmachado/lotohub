
'use client';

/**
 * @fileOverview AppContext Professional - Motor de Tempo Real Multi-Tenant.
 * Versão V7: Sincronização Corrigida para Resultados do Bicho e Sinuca com Fallback.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, addDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
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

export interface SnookerWinner {
  userName: string;
  terminalId: string;
  winAmount: number;
  category: string;
  winningNumbers: number[];
  wonAt: string;
  type: string;
}

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number;
  currentBanca: any; subdomain: string | null;
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[];
  apostas: any[]; snookerChannels: any[];
  jdbResults: JDBNormalizedResult[];
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
      
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() });
        } else if (activeBancaId !== 'default') {
          const masterRef = doc(firestore, 'bancas', 'default', 'usuarios', session.userId);
          onSnapshot(masterRef, (mSnap) => {
            if (mSnap.exists()) setUser({ id: mSnap.id, ...mSnap.data() });
          });
        }
        setIsLoading(false);
      });
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
    
    const unsubResults = onSnapshot(query(
      collection(firestore, bancaPath, 'resultados'), 
      where("data", "==", dataFormatada)
    ), (s) => {
      const results = s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult));
      setJdbResults(results);
      console.log(`[SYNC][${bancaId}] Resultados recuperados:`, results.length);
    });

    if (bancaId === 'default' && (!user || (user.tipoUsuario !== 'SUPER_ADMIN' && user.role !== 'superadmin'))) {
      return;
    }
    
    const unsubscribers = [
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), (s) => 
        setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner)))),
      
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), (s) => 
        setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup)))),
      
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), (s) => 
        setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage)))),

      onSnapshot(query(collection(firestore, bancaPath, 'apostas'), orderBy('createdAt', 'desc'), limit(50)), (s) => 
        setApostas(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(query(collection(firestore, bancaPath, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)), (s) => 
        setLedger(s.docs.map(d => ({ id: d.id, ...d.data() })))),

      onSnapshot(collection(firestore, bancaPath, 'snooker'), (s) => {
        const channels = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setSnookerChannels(channels);
        console.log(`[SYNC][${bancaId}] Canais Sinuca recuperados:`, channels.length);
      }),

      onSnapshot(collection(firestore, bancaPath, 'usuarios'), (s) => {
        setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }),

      onSnapshot(collection(firestore, bancaPath, 'football_bets'), (s) => {
        setFootballBets(s.docs.map(d => ({ id: d.id, ...d.data() } as FootballBet)));
      }),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), (s) => {
        if (s.exists()) setCasinoSettings(s.data() as CasinoSettings);
      }),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), (s) => {
        if (s.exists()) setBingoSettings(s.data() as BingoSettings);
      }),

      onSnapshot(collection(firestore, bancaPath, 'bingo_draws'), (s) => {
        setBingoDraws(s.docs.map(d => ({ id: d.id, ...d.data() } as BingoDraw)));
      }),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), (s) => {
        if (s.exists()) setSnookerLiveConfig(s.data() as SnookerLiveConfig);
      }),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_automation'), (s) => {
        if (s.exists()) setSnookerAutomationSettings(s.data() as SnookerAutomationSettings);
      }),

      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_ocr'), (s) => {
        if (s.exists()) setSnookerScoreRecognitionSettings(s.data() as SnookerScoreRecognitionSettings);
      })
    ];

    return () => {
      unsubResults();
      unsubscribers.forEach(unsub => unsub());
    };
  }, [firestore, currentBanca, user]);

  // --- Sync Logic Corrected ---

  const syncJDBResults = useCallback(async () => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    if (!bancaId) return;

    try {
      const hoje = new Date();
      const dataFormatada = hoje.toLocaleDateString("pt-BR");
      
      const summary = await ResultsSyncService.syncToday();
      const results = await ResultsSyncService.getLatestResults();
      
      console.log(`[SYNC][${bancaId}] Sincronizando Resultados:`, results);

      for (const res of results) {
        const docId = `jdb-${res.date}-${res.time}-${res.stateCode.toLowerCase()}-${res.extractionName.toLowerCase().replace(/\s/g, '-')}`;
        await setDoc(doc(firestore, 'bancas', bancaId, 'resultados', docId), {
          ...res,
          bancaId,
          data: dataFormatada,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e: any) {
      console.error("[SYNC] Falha nos resultados do bicho:", e.message);
    }
  }, [user, currentBanca, firestore]);

  const syncSnookerFromYoutube = useCallback(async (force = false) => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    if (!bancaId) return;

    setSnookerSyncState('syncing');
    try {
      console.log(`[SYNC][${bancaId}] Iniciando captura de Sinuca...`);
      
      // Fallback Strategy
      let jogos = [];
      try {
        jogos = await SnookerSyncService.fetchFromMainSource(); 
      } catch (e) {
        console.warn("[SYNC] Fonte 1 falhou, tentando Fallback...");
        jogos = await SnookerSyncService.fetchFromFallbackSource();
      }

      console.log(`[SYNC][${bancaId}] Eventos encontrados:`, jogos.length);

      for (const jogo of jogos) {
        await setDoc(doc(firestore, 'bancas', bancaId, 'snooker', jogo.id), {
          ...jogo,
          bancaId,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
      setSnookerSyncState('idle');
    } catch (e: any) {
      console.error("[SYNC] Erro Sinuca:", e.message);
      setSnookerSyncState('error');
    }
  }, [user, currentBanca, firestore]);

  // Auto-Sync Trigger
  useEffect(() => {
    const bancaId = user?.bancaId || currentBanca?.id || 'default';
    if (bancaId) {
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
      try {
        const apostaRef = doc(firestore, 'bancas', bancaId, 'apostas', pouleId);
        await setDoc(apostaRef, {
          ...aposta,
          id: pouleId,
          userId: user.id,
          bancaId: bancaId,
          status: 'aguardando',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await CommissionService.processarComissao(bancaId, user.id, user.tipoUsuario, valorTotal, pouleId);
        return pouleId;
      } catch (e: any) {
        toast({ variant: 'destructive', title: "Erro ao Salvar", description: "Aposta paga mas não registrada." });
        return null;
      }
    } else {
      toast({ variant: 'destructive', title: "Erro Financeiro", description: result.message });
      return null;
    }
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

      setFootballData(prev => ({
        ...prev,
        matches: rawMatches,
        unifiedMatches: allMatches,
        syncStatus: 'idle',
        lastSyncAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error("[AppContext] Sync Football Error:", e);
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
      await setDoc(doc(firestore, 'bancas', bancaId, 'football_bets', betId), {
        id: betId,
        userId: user.id,
        bancaId,
        terminal: user.terminal,
        stake,
        potentialWin,
        status: 'OPEN',
        items: betSlip,
        createdAt: new Date().toISOString()
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

  // --- Placeholders for Chat & Interaction ---
  const joinChannel = (channelId: string, userId: string) => {};
  const leaveChannel = (channelId: string, userId: string) => {};
  const clearCelebration = () => setCelebrationTrigger(false);
  const sendSnookerChatMessage = (channelId: string, text: string) => {};
  const sendSnookerReaction = (channelId: string, reaction: string) => {};
  const placeSnookerBet = (data: any) => true;
  const cashOutSnookerBet = (betId: string) => {};
  const settleSnookerRound = (channelId: string, winner: string) => {};
  
  const updateSnookerLiveConfig = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'snooker_live_config'), cfg, { merge: true });
  };
  const updateSnookerChannel = (channel: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'snooker', channel.id), channel, { merge: true });
  };
  const deleteSnookerChannel = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    deleteDoc(doc(firestore, 'bancas', bancaId, 'snooker', id));
  };
  const addSnookerChannel = (channel: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'snooker', channel.id), channel);
  };
  const updateSnookerScoreboard = (channelId: string, scoreboard: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'snooker_scoreboards', channelId), scoreboard, { merge: true });
  };
  const updateSnookerScoreRecognitionSettings = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'snooker_ocr'), cfg, { merge: true });
  };
  const updateSnookerAutomationSettings = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'snooker_automation'), cfg, { merge: true });
  };
  const updateSnookerAutomationSource = (id: string, source: any) => {};
  const toggleSnookerSource = (id: string, enabled: boolean) => {};
  const approveAutoSnookerChannel = (id: string) => {};
  const archiveAutoSnookerChannel = (id: string) => {};
  const clearSnookerSyncLogs = () => setSnookerSyncLogs([]);
  const setManualPrimarySnookerChannel = (id: string | null) => {
    updateSnookerAutomationSettings({ ...snookerAutomationSettings, manualPrimaryChannelId: id });
  };

  const updateCasinoSettings = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'casino_settings'), cfg, { merge: true });
  };
  const updateBingoSettings = (cfg: BingoSettings) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'bingo_settings'), cfg, { merge: true });
  };
  const createBingoDraw = (data: any) => {};
  const startBingoDraw = (id: string) => {};
  const drawBingoBall = (id: string) => {};
  const finishBingoDraw = (id: string) => {};
  const cancelBingoDraw = (id: string, r: string) => {};
  const buyBingoTickets = (d: string, c: number) => true;
  const refundBingoTicket = (id: string) => {};
  const payBingoPayout = (id: string) => {};
  
  const updateBanner = (banner: Banner) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'banners', banner.id), banner, { merge: true });
  };
  const addBanner = (banner: any) => {
    const bancaId = user?.bancaId || 'default';
    const id = banner.id || `banner-${Date.now()}`;
    setDoc(doc(firestore, 'bancas', bancaId, 'banners', id), { ...banner, id, bancaId });
  };
  const deleteBanner = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    deleteDoc(doc(firestore, 'bancas', bancaId, 'banners', id));
  };
  const updatePopup = (popup: Popup) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'popups', popup.id), popup, { merge: true });
  };
  const addPopup = (popup: any) => {
    const bancaId = user?.bancaId || 'default';
    const id = popup.id || `popup-${Date.now()}`;
    setDoc(doc(firestore, 'bancas', bancaId, 'popups', id), { ...popup, id, bancaId });
  };
  const deletePopup = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    deleteDoc(doc(firestore, 'bancas', bancaId, 'popups', id));
  };
  const updateNews = (msg: NewsMessage) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'news_messages', msg.id), msg, { merge: true });
  };
  const addNews = (msg: any) => {
    const bancaId = user?.bancaId || 'default';
    const id = msg.id || `news-${Date.now()}`;
    setDoc(doc(firestore, 'bancas', bancaId, 'news_messages', id), { ...msg, id, bancaId });
  };
  const deleteNews = (id: string) => {
    const bancaId = user?.bancaId || 'default';
    deleteDoc(doc(firestore, 'bancas', bancaId, 'news_messages', id));
  };
  
  const updateLiveMiniPlayerConfig = (cfg: any) => {
    const bancaId = user?.bancaId || 'default';
    setDoc(doc(firestore, 'bancas', bancaId, 'configuracoes', 'mini_player'), cfg, { merge: true });
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
    
    footballData, footballBets, betSlip,
    syncFootballAll, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet, updateLeagueConfig,

    snookerPresence, snookerSyncState, celebrationTrigger, snookerLiveConfig,
    snookerBets, snookerFinancialHistory, snookerChatMessages, snookerCashOutLog,
    snookerScoreboards, snookerScoreRecognitionSettings, snookerAutomationSettings, snookerPrimaryChannelId,
    snookerSyncLogs, snookerBetsFeed, snookerActivityFeed,

    casinoSettings, bingoSettings, bingoDraws, bingoTickets, bingoPayouts,
    liveMiniPlayerConfig,

    refreshData: () => {
      syncJDBResults();
      syncSnookerFromYoutube();
    }, 
    logout,
    handleFinalizarAposta,
    
    syncSnookerFromYoutube, joinChannel, leaveChannel, clearCelebration, sendSnookerChatMessage,
    sendSnookerReaction, placeSnookerBet, cashOutSnookerBet, settleSnookerRound, updateSnookerLiveConfig,
    updateSnookerChannel, deleteSnookerChannel, addSnookerChannel, updateSnookerScoreboard,
    updateSnookerScoreRecognitionSettings, updateSnookerAutomationSettings, updateSnookerAutomationSource,
    toggleSnookerSource, approveAutoSnookerChannel, archiveAutoSnookerChannel, clearSnookerSyncLogs,
    setManualPrimarySnookerChannel,

    updateBingoSettings, createBingoDraw, startBingoDraw, drawBingoBall, finishBingoDraw, cancelBingoDraw,
    buyBingoTickets, refundBingoTicket, payBingoPayout,
    updateCasinoSettings,
    updateBanner, addBanner, deleteBanner, updatePopup, addPopup, deletePopup, updateNews, addNews, deleteNews,
    updateLiveMiniPlayerConfig,
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
