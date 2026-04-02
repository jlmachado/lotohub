'use client';

/**
 * @fileOverview AppContext Professional - Motor Multi-Banca com Liquidação Automática.
 * V12: Refatoração Jogo do Bicho para estrutura Estado > Bancas > Horários.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { initializeFirebase } from '@/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, setDoc, 
  deleteDoc, where, serverTimestamp, getDocs, updateDoc
} from 'firebase/firestore';
import { resolveCurrentBanca, getCurrentBancaId } from '@/utils/bancaContext';
import { LedgerService } from '@/services/ledger-service';
import { generatePoule } from '@/utils/generatePoule';
import { JDBNormalizedResult } from '@/types/result-types';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { isJDBItemEligible, checkSingleItemWinner } from '@/lib/draw-engine';

// --- Interfaces ---

export interface JDBBanca {
  id: string;
  nome: string;
  dias: Record<string, { selecionado: boolean; horarios: string[] }>;
}

export interface JDBEstado {
  id: string;
  bancaId: string; // Tenant
  nome: string;
  sigla: string;
  bancas: JDBBanca[];
  modalidades: { nome: string; multiplicador: number }[];
  updatedAt?: string;
}

export interface LotteryDefinition { id: string; nome: string; estado: string; ativo: boolean; horarios: { nome: string; hora: string; ativo: boolean; }[]; }
export interface GenericLotteryConfig { id: string; nome: string; status: 'Ativa' | 'Inativa'; horarios: { dia: string; horas: string }[]; multiplicadores: { modalidade: string; multiplicador: string }[]; }
export interface Banner { id: string; title: string; imageUrl: string; active: boolean; position: number; bancaId: string; content?: string; linkUrl?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; imageUrl: string; active: boolean; priority: number; bancaId: string; description?: string; linkUrl?: string; buttonText?: string; startAt?: string; endAt?: string; thumbUrl?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; bancaId: string; }
export interface FootballData { leagues: ESPNLeagueConfig[]; matches: any[]; unifiedMatches: any[]; syncStatus: 'idle' | 'syncing' | 'error'; lastSyncAt: string | null; }
export interface BetSlipItem { id: string; matchId: string; matchName: string; homeTeam: string; awayTeam: string; market: string; selection: string; pickLabel: string; odd: number; isLive: boolean; addedAt: number; }
export interface FootballBet { id: string; userId: string; bancaId: string; terminal: string; stake: number; potentialWin: number; status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED'; items: any[]; createdAt: string; isDescarga?: boolean; }
export interface CasinoSettings { casinoName: string; casinoStatus: boolean; bannerMessage: string; }
export interface BingoSettings { enabled: boolean; rtpEnabled: boolean; rtpPercent: number; ticketPriceDefault: number; housePercentDefault: number; maxTicketsPerUserDefault: number; preDrawHoldSeconds: number; prizeDefaults: { quadra: number; kina: number; keno: number; }; scheduleMode: 'manual' | 'auto'; autoSchedule: { everyMinutes: number; startHour: number; endHour: number; }; }
export interface BingoDraw { id: string; drawNumber: number; status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled'; scheduledAt: string; finishedAt?: string; ticketPrice: number; totalTickets: number; totalRevenue: number; payoutTotal: number; housePercent: number; drawnNumbers: number[]; winnersFound: { quadra?: any; kina?: any; keno?: any; }; prizeRules: { quadra: number; kina: number; keno: number; }; bancaId: string; }
export interface BingoTicket { id: string; drawId: string; userId: string; userName: string; terminalId: string; ticketNumbers: number[]; amountPaid: number; status: 'active' | 'won' | 'lost' | 'refunded'; createdAt: string; bancaId: string; isBot?: boolean; }
export interface SnookerBet { id: string; userId: string; userName: string; channelId: string; pick: 'A' | 'B' | 'EMPATE'; amount: number; oddsA: number; oddsB: number; oddsD: number; status: 'open' | 'won' | 'lost' | 'refunded' | 'cash_out'; createdAt: string; settledAt?: string; isPreMatch?: boolean; bancaId: string; }
export interface SnookerLiveConfig { enabled: boolean; defaultChannelId: string; showLiveBadge: boolean; betsEnabled: boolean; minBet: number; maxBet: number; cashOutMargin: number; chatEnabled: boolean; reactionsEnabled: boolean; profanityFilterEnabled: boolean; }

interface AppContextType {
  user: any; isLoading: boolean; balance: number; bonus: number;
  currentBanca: any; subdomain: string | null;
  ledger: any[]; banners: Banner[]; popups: Popup[]; news: NewsMessage[];
  apostas: any[]; snookerChannels: any[];
  jdbResults: JDBNormalizedResult[];
  postedResults: JDBNormalizedResult[];
  jdbLoterias: JDBEstado[];
  dbLoterias: LotteryDefinition[]; 
  genericLotteryConfigs: GenericLotteryConfig[];
  allUsers: any[];
  footballData: FootballData;
  footballMatches: any[];
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  syncFootballAll: (force?: boolean) => Promise<void>;
  addBetToSlip: (item: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  updateLeagueConfig: (id: string, updates: Partial<ESPNLeagueConfig>) => void;
  snookerPresence: any;
  snookerSyncState: 'idle' | 'syncing' | 'error';
  celebrationTrigger: boolean;
  snookerLiveConfig: SnookerLiveConfig | null;
  snookerBets: SnookerBet[];
  snookerFinancialHistory: any[];
  snookerChatMessages: any[];
  snookerCashOutLog: any[];
  snookerScoreboards: Record<string, any>;
  casinoSettings: CasinoSettings | null;
  bingoSettings: BingoSettings | null;
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoPayouts: any[];
  surebets: SurebetOpportunity[];
  surebetSettings: SurebetSettings | null;
  updateSurebetSettings: (cfg: SurebetSettings) => Promise<void>;
  refreshData: () => void; logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => Promise<string | null>;
  processarResultados: (data: any) => Promise<void>;
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
  updateBingoSettings: (cfg: BingoSettings) => void;
  createBingoDraw: (data: any) => void;
  startBingoDraw: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  updateCasinoSettings: (cfg: CasinoSettings) => void;
  updateBanner: (banner: Banner) => void;
  addBanner: (banner: Omit<Banner, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteBanner: (id: string) => void;
  updatePopup: (popup: Popup) => void;
  addPopup: (popup: Omit<Popup, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deletePopup: (id: string) => void;
  updateNews: (news: NewsMessage) => void;
  addNews: (news: Omit<NewsMessage, 'id' | 'bancaId'> & { id?: string }) => void;
  deleteNews: (id: string) => void;
  liveMiniPlayerConfig: any;
  updateLiveMiniPlayerConfig: (cfg: any) => void;
  syncJDBResults: () => Promise<void>;
  deleteJDBResult: (id: string) => Promise<void>;
  publishJDBResult: (id: string) => Promise<void>;
  fullLedger: any[];
  activeBancaId: string;
  addJDBLoteria: (loteria: any) => void;
  updateJDBLoteria: (loteria: any) => void;
  deleteJDBLoteria: (id: string) => void;
  updateGenericLottery: (cfg: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function normalizeFromFirebase(loterias: any[]): JDBEstado[] {
  return loterias.map(l => ({
    id: l.id,
    bancaId: l.bancaId || 'default',
    nome: l.nome || l.name || '',
    sigla: l.sigla || l.estado || '',
    bancas: l.bancas || [],
    modalidades: l.modalidades || [],
    updatedAt: l.updatedAt
  }));
}

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
  const [jdbLoterias, setJdbLoterias] = useState<JDBEstado[]>([]);
  const [dbLoterias, setDbLoterias] = useState<LotteryDefinition[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  const [footballLeagues, setFootballLeagues] = useState<ESPNLeagueConfig[]>([]);
  const [footballMatches, setFootballMatches] = useState<any[]>([]);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerSyncState, setSnookerSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [snookerBets, setSnookerBets] = useState<SnookerBet[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<Record<string, any>>({});
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [surebets, setSurebets] = useState<SurebetOpportunity[]>([]);
  const [surebetSettings, setSurebetSettings] = useState<SurebetSettings | null>(null);
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
      const unsubUser = onSnapshot(doc(firestore, 'bancas', bancaId, 'usuarios', session.userId), 
        (snap) => snap.exists() && setUser({ id: snap.id, ...snap.data() }),
        () => console.warn("[Snapshot] User profile blocked")
      );
      return () => unsubUser();
    } else { setIsLoading(false); }
  }, [firestore, contextTicker]);

  useEffect(() => {
    if (!firestore) return;
    const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
    const bancaPath = `bancas/${bancaId}`;
    const defaultPath = `bancas/default`;
    const unsubscribers: any[] = [];
    const handleSnapshotError = (col: string) => (err: any) => console.warn(`[Snapshot] Access to ${col} denied.`);

    unsubscribers.push(
      onSnapshot(query(collection(firestore, bancaPath, 'banners'), orderBy('position')), (s) => setBanners(s.docs.map(d => ({ id: d.id, ...d.data() } as Banner))), handleSnapshotError('banners')),
      onSnapshot(query(collection(firestore, bancaPath, 'popups'), orderBy('priority', 'desc')), (s) => setPopups(s.docs.map(d => ({ id: d.id, ...d.data() } as Popup))), handleSnapshotError('popups')),
      onSnapshot(query(collection(firestore, bancaPath, 'news_messages'), orderBy('order')), (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() } as NewsMessage))), handleSnapshotError('news')),
      onSnapshot(collection(firestore, bancaPath, 'loterias'), (s) => {
        if (!s.empty) setDbLoterias(s.docs.map(d => ({ id: d.id, ...d.data() } as LotteryDefinition)));
        else if (bancaId !== 'default') getDocs(collection(firestore, defaultPath, 'loterias')).then(snap => setDbLoterias(snap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryDefinition))));
      }, handleSnapshotError('loterias')),
      onSnapshot(collection(firestore, bancaPath, 'genericLotteryConfigs'), (s) => {
        if (!s.empty) setGenericLotteryConfigs(s.docs.map(d => ({ id: d.id, ...d.data() } as GenericLotteryConfig)));
        else if (bancaId !== 'default') getDocs(collection(firestore, defaultPath, 'genericLotteryConfigs')).then(snap => setGenericLotteryConfigs(snap.docs.map(d => ({ id: d.id, ...d.data() } as GenericLotteryConfig))));
      }, handleSnapshotError('genericLotteryConfigs')),
      onSnapshot(collection(firestore, bancaPath, 'snooker'), (s) => setSnookerChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('snooker')),
      onSnapshot(collection(firestore, bancaPath, 'jdbLoterias'),
        (s) => setJdbLoterias(normalizeFromFirebase(s.docs.map(d => ({ id: d.id, ...d.data() })))),
        handleSnapshotError('jdbLoterias')),
      onSnapshot(collection(firestore, bancaPath, 'jdbResults'), 
        (s) => setJdbResults(s.docs.map(d => ({ id: d.id, ...d.data() } as JDBNormalizedResult))),
        handleSnapshotError('jdbResults')),
      onSnapshot(collection(firestore, bancaPath, 'football_leagues'), (s) => { const loaded = s.docs.map(d => ({ id: d.id, ...d.data() } as ESPNLeagueConfig)); if (loaded.length > 0) setFootballLeagues(loaded); else setFootballLeagues(ESPN_LEAGUE_CATALOG); }, handleSnapshotError('football_leagues')),
      onSnapshot(collection(firestore, bancaPath, 'football_matches'), (s) => setFootballMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('football_matches')),
      onSnapshot(collection(firestore, bancaPath, 'surebets'), (s) => setSurebets(s.docs.map(d => ({ id: d.id, ...d.data() } as SurebetOpportunity))), handleSnapshotError('surebets')),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'surebet_settings'), (s) => s.exists() && setSurebetSettings(s.data() as any), handleSnapshotError('surebet_settings')),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'casino_settings'), (s) => s.exists() && setCasinoSettings(s.data() as any), handleSnapshotError('casino_settings')),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'bingo_settings'), (s) => s.exists() && setBingoSettings(s.data() as any), handleSnapshotError('bingo_settings')),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'snooker_live_config'), (s) => s.exists() && setSnookerLiveConfig(s.data() as any), handleSnapshotError('snooker_live_config')),
      onSnapshot(doc(firestore, bancaPath, 'configuracoes', 'mini_player'), (s) => s.exists() && setLiveMiniPlayerConfig(s.data()), handleSnapshotError('mini_player'))
    );

    if (user) {
      const isPrivileged = user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN';
      const bancaPathUser = `bancas/${user.bancaId || 'default'}`;
      const apostasQuery = isPrivileged ? query(collection(firestore, bancaPathUser, 'apostas'), orderBy('createdAt', 'desc'), limit(50)) : query(collection(firestore, bancaPathUser, 'apostas'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(50));
      const ledgerQuery = isPrivileged ? query(collection(firestore, bancaPathUser, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100)) : query(collection(firestore, bancaPathUser, 'ledgerEntries'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(100));
      const snookerBetsQuery = isPrivileged ? collection(firestore, bancaPathUser, 'snooker_bets') : query(collection(firestore, bancaPathUser, 'snooker_bets'), where('userId', '==', user.id));
      unsubscribers.push(onSnapshot(apostasQuery, (s) => setApostas(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('apostas')), onSnapshot(ledgerQuery, (s) => setLedger(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('ledger')), onSnapshot(snookerBetsQuery, (s) => setSnookerBets(s.docs.map(d => ({ id: d.id, ...d.data() } as SnookerBet))), handleSnapshotError('snooker_bets')));
      if (isPrivileged) { unsubscribers.push(onSnapshot(collection(firestore, bancaPathUser, 'usuarios'), (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleSnapshotError('all_users'))); }
    }
    return () => unsubscribers.forEach(unsub => unsub());
  }, [firestore, user, contextTicker]);

  // Motor de Liquidação Automática
  const settlePendingBets = async (results: JDBNormalizedResult[]) => {
    if (!user || !apostas.length || !results.length) return;
    const bancaId = user.bancaId || getCurrentBancaId() || 'default';
    const pendingBets = apostas.filter(a => a.status === 'aguardando');

    for (const aposta of pendingBets) {
      for (const result of results) {
        if (isJDBItemEligible(aposta.detalhes?.[0], result, aposta.createdAt)) {
          let totalPrize = 0;
          
          for (const item of (aposta.detalhes || [])) {
            const { isWinner, prize } = checkSingleItemWinner(item, result, jdbLoterias);
            if (isWinner) totalPrize += prize;
          }

          const newStatus = totalPrize > 0 ? 'premiado' : 'perdeu';
          const apostaRef = doc(firestore, `bancas/${bancaId}/apostas`, aposta.id);
          await updateDoc(apostaRef, { status: newStatus, settledAt: serverTimestamp() });

          if (totalPrize > 0) {
            await LedgerService.registerMovement({
              userId: aposta.userId,
              terminal: aposta.terminal || 'Digital',
              tipoUsuario: 'USUARIO',
              modulo: aposta.loteria,
              type: 'BET_WIN',
              amount: totalPrize,
              referenceId: aposta.id,
              description: `Prêmio Loteria: Bilhete #${aposta.id.substring(0,8)}`
            });
          }
        }
      }
    }
  };

  const syncJDBResults = async () => {
    const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
    try {
      const { PortalBrasilProvider } = await import('@/services/result-providers/portal-brasil-provider');
      const results = await PortalBrasilProvider.fetchResults();
      if (!results || results.length === 0) return;
      
      const batch = results.map((r: any) =>
        setDoc(doc(firestore, `bancas/${bancaId}/jdbResults`, r.id), { ...r, bancaId, status: 'PUBLICADO', importedAt: new Date().toISOString() }, { merge: true })
      );
      await Promise.all(batch);
      
      // Dispara apuração após sync
      await settlePendingBets(results);
    } catch (e) { console.error('[syncJDBResults] Falha:', e); }
  };

  const value: AppContextType = {
    user, allUsers, isLoading, currentBanca, subdomain: currentBanca?.subdomain || null, balance: user?.saldo || 0, bonus: user?.bonus || 0,
    ledger, banners, popups, news, apostas, jdbResults, postedResults: jdbResults, jdbLoterias, dbLoterias, genericLotteryConfigs,
    footballData: { leagues: footballLeagues, matches: footballMatches, unifiedMatches: footballMatches, syncStatus, lastSyncAt },
    footballMatches, footballBets: [], betSlip, syncFootballAll: async () => {}, addBetToSlip: (item) => setBetSlip(prev => [...prev, item]), removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]), placeFootballBet: async () => null, updateLeagueConfig: (id, updates) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/football_leagues`, id), updates, { merge: true }),
    snookerPresence, snookerSyncState, celebrationTrigger: false, snookerLiveConfig, snookerBets, snookerFinancialHistory: [], snookerChatMessages: [], snookerCashOutLog: [], snookerScoreboards,
    surebets, surebetSettings, updateSurebetSettings: async (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/surebet_settings`), cfg, { merge: true }),
    casinoSettings, bingoSettings, bingoDraws: [], bingoTickets: [], bingoPayouts: [], liveMiniPlayerConfig,
    refreshData: () => setContextTicker(t => t + 1), logout: () => { authLogout(); setUser(null); router.push('/login'); }, 
    handleFinalizarAposta: async (aposta, valorTotal) => { if (!user) { router.push('/login'); return null; } const bancaId = user.bancaId || 'default'; const pouleId = generatePoule(); const res = await LedgerService.registerMovement({ userId: user.id, terminal: user.terminal, tipoUsuario: user.tipoUsuario, modulo: aposta.loteria, type: 'BET_PLACED', amount: -valorTotal, referenceId: pouleId, description: `${aposta.loteria}: ${aposta.numeros}` }); if (res.success) { await setDoc(doc(firestore, 'bancas', bancaId, 'apostas', pouleId), { ...aposta, id: pouleId, userId: user.id, bancaId, status: 'aguardando', createdAt: new Date().toISOString() }); return pouleId; } return null; },
    processarResultados: async (data) => { const bancaId = user?.bancaId || getCurrentBancaId() || 'default'; const id = `manual-${data.loteria}-${data.data}-${data.horario}`; await setDoc(doc(firestore, `bancas/${bancaId}/jdbResults`, id), { ...data, id, status: 'PUBLICADO', importedAt: new Date().toISOString() }, { merge: true }); },
    syncSnookerFromYoutube: async () => {}, joinChannel: () => {}, leaveChannel: () => {}, clearCelebration: () => {}, sendSnookerChatMessage: () => {}, sendSnookerReaction: () => {}, placeSnookerBet: () => false, cashOutSnookerBet: () => {}, settleSnookerRound: () => {}, updateSnookerLiveConfig: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/snooker_live_config`), cfg, { merge: true }), updateSnookerChannel: () => {}, deleteSnookerChannel: () => {}, addSnookerChannel: () => {}, updateSnookerScoreboard: () => {}, updateBingoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/bingo_settings`), cfg, { merge: true }), createBingoDraw: () => {}, startBingoDraw: () => {}, finishBingoDraw: () => {}, buyBingoTickets: () => true, updateCasinoSettings: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/configuracoes/casino_settings`), cfg, { merge: true }),
    updateBanner: (b) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', b.id), b, { merge: true }), addBanner: (b) => { const id = b.id || `banner-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id), { ...b, id }, { merge: true }); }, deleteBanner: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'banners', id)), updatePopup: (p) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', p.id), p, { merge: true }), addPopup: (p) => { const id = p.id || `popup-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id), { ...p, id }, { merge: true }); }, deletePopup: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'popups', id)), updateNews: (n) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', n.id), n, { merge: true }), addNews: (n) => { const id = n.id || `news-${Date.now()}`; setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id), { ...n, id }, { merge: true }); }, deleteNews: (id) => deleteDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'news_messages', id)), updateLiveMiniPlayerConfig: (cfg) => setDoc(doc(firestore, 'bancas', user?.bancaId || 'default', 'configuracoes', 'mini_player'), cfg, { merge: true }),
    syncJDBResults, deleteJDBResult: async (id) => deleteDoc(doc(firestore, `bancas/${user?.bancaId || getCurrentBancaId() || 'default'}/jdbResults`, id)), publishJDBResult: async (id) => setDoc(doc(firestore, `bancas/${user?.bancaId || getCurrentBancaId() || 'default'}/jdbResults`, id), { status: 'PUBLICADO' }, { merge: true }),
    fullLedger: ledger, updateGenericLottery: (cfg) => setDoc(doc(firestore, `bancas/${user?.bancaId || 'default'}/genericLotteryConfigs`, cfg.id), cfg, { merge: true }), activeBancaId: user?.bancaId || getCurrentBancaId() || 'default',
    addJDBLoteria: async (l) => {
      const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
      await setDoc(doc(firestore, `bancas/${bancaId}/jdbLoterias`, l.id), { ...l, bancaId }, { merge: true });
    },
    updateJDBLoteria: async (l) => {
      const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
      await setDoc(doc(firestore, `bancas/${bancaId}/jdbLoterias`, l.id), { ...l, bancaId }, { merge: true });
    },
    deleteJDBLoteria: async (id) => {
      const bancaId = user?.bancaId || getCurrentBancaId() || 'default';
      await deleteDoc(doc(firestore, `bancas/${bancaId}/jdbLoterias`, id));
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => { const context = useContext(AppContext); if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider'); return context; };
