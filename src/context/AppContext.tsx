/**
 * @fileOverview Contexto global do sistema. Gerenciamento de Futebol via TheSportsDB e estados operacionais.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { 
  NormalizedMatch, 
  NormalizedStanding, 
  NormalizedLeague,
  fetchAllAvailableLeagues,
  syncFootballMatches as syncMatchesAction,
  syncFootballStandings as syncStandingsAction
} from '@/services/football-sync-service';

export interface FootballSyncData {
  todayMatches: NormalizedMatch[];
  nextMatches: NormalizedMatch[];
  pastMatches: NormalizedMatch[];
  standings: NormalizedStanding[];
  leagues: NormalizedLeague[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

// Interfaces básicas para outros módulos
export interface NewsMessage { id: string; text: string; active: boolean; order: number; }
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; }

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  apostas: any[];
  depositos: any[];
  saques: any[];
  
  // Football
  footballData: FootballSyncData;
  updateFootballLeagues: (leagues: NormalizedLeague[]) => void;
  syncFootballAll: () => Promise<void>;
  
  // Caixa e Comissões
  cambistaMovements: any[];
  registerCambistaMovement: (movement: any) => void;
  userCommissions: any[];
  promoterCredits: any[];
  
  // Loterias
  news: NewsMessage[];
  addNews: (n: any) => void;
  updateNews: (n: any) => void;
  deleteNews: (id: string) => void;
  banners: Banner[];
  addBanner: (b: any) => void;
  updateBanner: (b: any) => void;
  deleteBanner: (id: string) => void;
  popups: Popup[];
  addPopup: (p: any) => void;
  updatePopup: (p: any) => void;
  deletePopup: (id: string) => void;
  jdbLoterias: any[];
  addJDBLoteria: (l: any) => void;
  updateJDBLoteria: (l: any) => void;
  deleteJDBLoteria: (id: string) => void;
  postedResults: any[];
  processarResultados: (res: any) => void;
  genericLotteryConfigs: any[];
  updateGenericLottery: (c: any) => void;
  handleFinalizarAposta: (aposta: any, total: number) => string | null;
  activeBancaId: string;

  // Cassino e Bingo
  casinoSettings: any;
  updateCasinoSettings: (s: any) => void;
  bingoSettings: any;
  updateBingoSettings: (s: any) => void;
  bingoDraws: any[];
  bingoTickets: any[];
  createBingoDraw: (d: any) => void;
  startBingoDraw: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  cancelBingoDraw: (id: string, reason: string) => void;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  refundBingoTicket: (id: string) => void;
  
  // Sinuca
  snookerLiveConfig: any;
  updateSnookerLiveConfig: (c: any) => void;
  snookerChannels: any[];
  addSnookerChannel: (c: any) => void;
  updateSnookerChannel: (c: any) => void;
  deleteSnookerChannel: (id: string) => void;
  snookerBets: any[];
  placeSnookerBet: (bet: any) => boolean;
  cashOutSnookerBet: (id: string) => void;
  settleSnookerRound: (channelId: string, winner: string) => void;
  snookerFinancialHistory: any[];
  snookerPresence: any;
  joinChannel: (cid: string, uid: string) => void;
  leaveChannel: (cid: string, uid: string) => void;
  snookerChatMessages: any[];
  sendSnookerChatMessage: (cid: string, text: string) => void;
  deleteSnookerChatMessage: (id: string) => void;
  sendSnookerReaction: (cid: string, reaction: string) => void;
  snookerScoreboards: any;
  updateSnookerScoreboard: (id: string, sb: any) => void;
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerCashOutLog: any[];

  // Global UI
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  const [footballData, setFootballData] = useState<FootballSyncData>({
    todayMatches: [],
    nextMatches: [],
    pastMatches: [],
    standings: [],
    leagues: [],
    lastSync: null,
    syncStatus: 'idle'
  });

  // Outros estados operacionais (LocalStorage)
  const [apostas, setApostas] = useState<any[]>([]);
  const [cambistaMovements, setCambistaMovements] = useState<any[]>([]);
  const [userCommissions, setUserCommissions] = useState<any[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  const [casinoSettings, setCasinoSettings] = useState<any>({ casinoName: 'LotoHub Casino', casinoStatus: true, bannerMessage: 'Sua sorte está aqui!' });
  const [bingoSettings, setBingoSettings] = useState<any>({ enabled: true, rtpEnabled: false, rtpPercent: 10, ticketPriceDefault: 0.3, housePercentDefault: 10, maxTicketsPerUserDefault: 100, preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual', autoSchedule: { everyMinutes: 5, startHour: 8, endHour: 23 } });
  const [bingoDraws, setBingoDraws] = useState<any[]>([]);
  const [bingoTickets, setBingoTickets] = useState<any[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [snookerLiveConfig, setSnookerLiveConfig] = useState<any>({ defaultChannelId: '', showLiveBadge: true, betsEnabled: true, minBet: 1, maxBet: 1000, cashOutMargin: 5, chatEnabled: true, reactionsEnabled: true, profanityFilterEnabled: true });
  const [snookerFinancialHistory, setSnookerFinancialHistory] = useState<any[]>([]);
  const [snookerChatMessages, setSnookerChatMessages] = useState<any[]>([]);
  const [snookerScoreboards, setSnookerScoreboards] = useState<any>({});
  const [snookerBetsFeed, setSnookerBetsFeed] = useState<any[]>([]);
  const [snookerActivityFeed, setSnookerActivityFeed] = useState<any[]>([]);
  const [snookerCashOutLog, setSnookerCashOutLog] = useState<any[]>([]);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Carregar dados salvos
    const storedFootball = localStorage.getItem('app:football:v3');
    if (storedFootball) setFootballData(JSON.parse(storedFootball));

    const storedMovements = localStorage.getItem('app:cambista_movements:v1');
    if (storedMovements) setCambistaMovements(JSON.parse(storedMovements));

    const storedCommissions = localStorage.getItem('app:commissions:v1');
    if (storedCommissions) setUserCommissions(JSON.parse(storedCommissions));

    const storedApostas = localStorage.getItem('app:apostas:v1');
    if (storedApostas) setApostas(JSON.parse(storedApostas));

    // Carregar sessão
    const refreshSession = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setBalance(currentUser.saldo || 0);
        setBonus(currentUser.bonus || 0);
        setTerminal(currentUser.terminal || '');
      }
    };
    refreshSession();
    window.addEventListener('auth-change', refreshSession);
    return () => window.removeEventListener('auth-change', refreshSession);
  }, []);

  // Persistência de Futebol
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('app:football:v3', JSON.stringify(footballData));
  }, [footballData]);

  const updateFootballLeagues = (leagues: NormalizedLeague[]) => {
    setFootballData(prev => ({ ...prev, leagues }));
  };

  const syncFootballAll = async () => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      let currentLeagues = footballData.leagues;
      if (currentLeagues.length === 0) {
        currentLeagues = await fetchAllAvailableLeagues();
      }

      const activeLeagueIds = currentLeagues.filter(l => l.importar).map(l => l.id);
      
      if (activeLeagueIds.length === 0) {
        setFootballData(prev => ({ ...prev, leagues: currentLeagues, syncStatus: 'idle' }));
        toast({ variant: 'destructive', title: 'Nenhuma liga selecionada', description: 'Ative pelo menos uma liga brasileira para sincronizar.' });
        return;
      }

      const [matches, standings] = await Promise.all([
        syncMatchesAction(activeLeagueIds),
        syncStandingsAction(activeLeagueIds)
      ]);

      setFootballData({
        leagues: currentLeagues,
        todayMatches: matches.today,
        nextMatches: matches.next,
        pastMatches: matches.past,
        standings,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      });

      toast({ title: 'Sync Concluído', description: `Dados de ${activeLeagueIds.length} ligas brasileiras atualizados.` });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro no Sync', description: 'Falha ao conectar com TheSportsDB.' });
    }
  };

  const registerCambistaMovement = (movement: any) => {
    const newMovements = [{ ...movement, id: `mov-${Date.now()}`, createdAt: new Date().toISOString() }, ...cambistaMovements];
    setCambistaMovements(newMovements);
    localStorage.setItem('app:cambista_movements:v1', JSON.stringify(newMovements));
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const clearCelebration = () => setCelebrationTrigger(false);

  const value: AppContextType = {
    user, balance, bonus, terminal, logout: () => { logout(); setUser(null); router.push('/'); },
    apostas, depositos: [], saques: [],
    footballData, updateFootballLeagues, syncFootballAll,
    cambistaMovements, registerCambistaMovement, userCommissions, promoterCredits,
    news, addNews: (n) => setNews([...news, n]), updateNews: (n) => setNews(news.map(x => x.id === n.id ? n : x)), deleteNews: (id) => setNews(news.filter(x => x.id !== id)),
    banners, addBanner: (b) => setBanners([...banners, b]), updateBanner: (b) => setBanners(banners.map(x => x.id === b.id ? b : x)), deleteBanner: (id) => setBanners(banners.filter(x => x.id !== id)),
    popups, addPopup: (p) => setPopups([...popups, p]), updatePopup: (p) => setPopups(popups.map(x => x.id === p.id ? p : x)), deletePopup: (id) => setPopups(popups.filter(x => x.id !== id)),
    jdbLoterias, addJDBLoteria: (l) => setJdbLoterias([...jdbLoterias, l]), updateJDBLoteria: (l) => setJdbLoterias(jdbLoterias.map(x => x.id === l.id ? l : x)), deleteJDBLoteria: (id) => setJdbLoterias(jdbLoterias.filter(x => x.id !== id)),
    postedResults, processarResultados: (res) => setPostedResults([res, ...postedResults]),
    genericLotteryConfigs, updateGenericLottery: (c) => setGenericLotteryConfigs(genericLotteryConfigs.map(x => x.id === c.id ? c : x)),
    handleFinalizarAposta: (aposta, total) => {
      const id = `poule-${Date.now()}`;
      setApostas([{ ...aposta, id, createdAt: new Date().toISOString(), status: 'aguardando' }, ...apostas]);
      return id;
    },
    activeBancaId: 'default',
    casinoSettings, updateCasinoSettings: setCasinoSettings,
    bingoSettings, updateBingoSettings: setBingoSettings,
    bingoDraws, bingoTickets, 
    createBingoDraw: (d) => setBingoDraws([...bingoDraws, d]),
    startBingoDraw: (id) => setBingoDraws(bingoDraws.map(x => x.id === id ? { ...x, status: 'live' } : x)),
    finishBingoDraw: (id) => setBingoDraws(bingoDraws.map(x => x.id === id ? { ...x, status: 'finished' } : x)),
    cancelBingoDraw: (id) => setBingoDraws(bingoDraws.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)),
    buyBingoTickets: (did, count) => { setBingoTickets([...bingoTickets, { id: `bt-${Date.now()}`, drawId: did, userId: user?.id, amountPaid: count * 0.3, status: 'active' }]); return true; },
    refundBingoTicket: (id) => setBingoTickets(bingoTickets.map(x => x.id === id ? { ...x, status: 'refunded' } : x)),
    snookerLiveConfig, updateSnookerLiveConfig: setSnookerLiveConfig,
    snookerChannels, addSnookerChannel: (c) => setSnookerChannels([...snookerChannels, c]), updateSnookerChannel: (c) => setSnookerChannels(snookerChannels.map(x => x.id === c.id ? c : x)), deleteSnookerChannel: (id) => setSnookerChannels(snookerChannels.filter(x => x.id !== id)),
    snookerBets, placeSnookerBet: (b) => { setSnookerBets([...snookerBets, b]); return true; },
    cashOutSnookerBet: (id) => setSnookerBets(snookerBets.map(x => x.id === id ? { ...x, status: 'cash_out' } : x)),
    settleSnookerRound: (cid, w) => { /* logic */ },
    snookerFinancialHistory, snookerPresence: {}, joinChannel: () => {}, leaveChannel: () => {},
    snookerChatMessages, sendSnookerChatMessage: (cid, t) => setSnookerChatMessages([...snookerChatMessages, { id: `m-${Date.now()}`, channelId: cid, text: t, userId: user?.id }]), deleteSnookerChatMessage: (id) => setSnookerChatMessages(snookerChatMessages.filter(x => x.id !== id)),
    sendSnookerReaction: () => {},
    snookerScoreboards, updateSnookerScoreboard: (id, sb) => setSnookerScoreboards({ ...snookerScoreboards, [id]: sb }),
    snookerBetsFeed, snookerActivityFeed, snookerCashOutLog,
    celebrationTrigger, clearCelebration, isFullscreen, toggleFullscreen
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
