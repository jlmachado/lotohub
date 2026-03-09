'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { loadBichoLoterias, saveBichoLoterias } from '@/utils/bichoLoteriasStorage';
import { generatePoule as generatePouleUtil } from '@/utils/generatePoule';
import { User, getUsers, saveUsers } from '@/utils/usersStorage';
import { getSession, getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { resolveCurrentBanca, getActiveContext } from '@/utils/bancaContext';
import { syncFromApiFootball } from '@/services/football-sync-service';
import ApiFootballService from '@/services/api-football';

// --- Types ---
export interface FootballMatch {
  id: string;
  bancaId: string;
  championshipApiId: string;
  homeTeamId: string;
  awayTeamId: string;
  dateTime: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  odds: { home: number; draw: number; away: number };
  isImported: boolean;
  venue?: string;
  round?: string;
  score?: { home: number; away: number };
}

export interface FootballChampionship {
  id: string;
  apiId: string;
  name: string;
  logo: string;
  bancaId: string;
  importar: boolean;
  country?: string;
  type?: string;
  coverage?: any;
}

export interface FootballTeam {
  id: string;
  bancaId: string;
  name: string;
  logo: string;
  country?: string;
}

export interface FootballApiConfig {
  bancaId: string;
  provider: 'api-football' | 'api-futebol' | 'football-data';
  apiKey: string;
  baseUrl: string;
  mode: 'test' | 'live';
  lastSync?: string;
  status?: 'connected' | 'error' | 'disconnected';
  lastError?: string;
}

// ... Outras interfaces (Aposta, Bingo, Sinuca, etc) permanecem iguais ...
export interface Aposta { id: string; bancaId: string; userId?: string; loteria: string; concurso: string; data: string; createdAt: string; valor: string; numeros: string; status: 'premiado' | 'perdeu' | 'aguardando' | 'won' | 'lost' | 'cash_out'; detalhes: any; usadoSaldo?: number; usadoBonus?: number; isDescarga?: boolean; }
export interface PostedResult { bancaId: string; loteria: string; jogoDoBichoLoteria?: string; horario: string; data: string; resultados: any; }
export interface JDBLoteria { id: string; bancaId: string; nome: string; modalidades: any[]; dias: any; }
export interface NewsMessage { id: string; bancaId: string; text: string; order: number; active: boolean; }
export interface Banner { id: string; bancaId: string; title: string; imageUrl: string; position: number; active: boolean; linkUrl?: string; content?: string; }
export interface Popup { id: string; bancaId: string; title: string; active: boolean; priority: number; imageUrl?: string; linkUrl?: string; description?: string; buttonText?: string; }
export interface UserCommission { id: string; userId: string; apostaId: string; modulo: string; valorAposta: number; porcentagem: number; valorComissao: number; createdAt: string; }
export interface CambistaMovement { id: string; userId: string; terminal: string; tipo: string; valor: number; createdAt: string; modulo?: string; observacao?: string; }
export interface PromoterCreditLog { id: string; userId: string; terminal: string; valor: number; motivo: string; createdAt: string; }
export interface BingoWinner { userId: string; userName: string; terminalId: string; category: string; winAmount: number; winningNumbers: number[]; wonAt: string; type: string; }
export interface BingoDraw { id: string; bancaId: string; drawNumber: number; status: string; scheduledAt: string; ticketPrice: number; prizeRules: any; drawnNumbers: number[]; totalTickets: number; totalRevenue: number; housePercent: number; payoutTotal: number; updatedAt: string; winnersFound: any; }
export interface BingoTicket { id: string; bancaId: string; drawId: string; userId: string; userName: string; terminalId: string; quantity: number; amountPaid: number; createdAt: string; status: string; ticketNumbers: number[][]; isBot?: boolean; }
export interface BingoSettings { bancaId: string; enabled: boolean; ticketPriceDefault: number; housePercentDefault: number; prizeDefaults: any; scheduleMode: string; autoSchedule: any; maxTicketsPerUserDefault: number; preDrawHoldSeconds: number; rtpEnabled: boolean; rtpPercent: number; }
export interface SnookerLiveConfig { bancaId: string; enabled: boolean; defaultChannelId: string; showLiveBadge: boolean; betsEnabled: boolean; minBet: number; maxBet: number; cashOutMargin: number; chatEnabled: boolean; reactionsEnabled: boolean; profanityFilterEnabled: boolean; topHeight: number; bubbleSize: number; autoShow: boolean; defaultState: string; showOnHome: boolean; showOnSinuca: boolean; title: string; youtubeUrl: string; youtubeEmbedId: string; }
export interface SnookerChannel { id: string; bancaId: string; title: string; description: string; youtubeUrl: string; embedId: string; status: string; scheduledAt: string; startedAt?: string; finishedAt?: string; playerA: any; playerB: any; odds: any; scoreA: number; scoreB: number; bestOf: number; houseMargin: number; viewerCount: number; priority: number; enabled: boolean; createdAt: string; updatedAt: string; }
export interface SnookerBet { id: string; userId: string; userName: string; channelId: string; pick: string; amount: number; oddsA: number; oddsB: number; oddsD: number; status: string; createdAt: string; }
export interface SnookerFinancialSummary { id: string; channelId: string; channelTitle: string; totalPot: number; totalPayout: number; houseProfit: number; settledAt: string; }
export interface SnookerScoreboard { id: string; matchTitle: string; playerA: any; playerB: any; scoreA: number; scoreB: number; frame: number; statusText: string; round: any; }

interface AppContextType {
  user: User | null;
  balance: number;
  bonus: number;
  terminal: string;
  activeBancaId: string;
  isGlobalMode: boolean;
  logout: () => void;

  apostas: Aposta[];
  handleFinalizarAposta: (novaAposta: any, custo: number) => string | null;
  
  // Football
  footballApiConfig: FootballApiConfig;
  updateFootballApiConfig: (config: Partial<FootballApiConfig>) => void;
  testFootballConnection: () => Promise<boolean>;
  syncFootballData: (options?: any) => Promise<void>;
  footballMatches: FootballMatch[];
  footballChampionships: FootballChampionship[];
  footballTeams: FootballTeam[];
  updateChampionship: (id: string, data: Partial<FootballChampionship>) => void;
  deleteMatch: (id: string) => void;

  // Outros estados...
  news: NewsMessage[]; banners: Banner[]; popups: Popup[]; jdbLoterias: JDBLoteria[]; postedResults: PostedResult[];
  genericLotteryConfigs: any[]; updateGenericLottery: (c: any) => void; casinoSettings: any; updateCasinoSettings: (s: any) => void;
  bingoSettings: BingoSettings; updateBingoSettings: (s: any) => void; bingoDraws: BingoDraw[]; bingoTickets: BingoTicket[];
  snookerLiveConfig: SnookerLiveConfig; updateSnookerLiveConfig: (c: any) => void; snookerChannels: SnookerChannel[]; snookerBets: SnookerBet[];
  snookerFinancialHistory: SnookerFinancialSummary[]; snookerPresence: any; snookerChatMessages: any[]; snookerScoreboards: any;
  celebrationTrigger: boolean; clearCelebration: () => void; isFullscreen: boolean; toggleFullscreen: () => void;
  cambistaMovements: CambistaMovement[]; registerCambistaMovement: (m: any) => void; promoterCredits: PromoterCreditLog[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [activeCtx, setActiveCtx] = useState<any>(null);
  const currentBancaId = useMemo(() => activeCtx?.bancaId || 'default', [activeCtx]);
  const isGlobalMode = useMemo(() => activeCtx?.mode === 'GLOBAL', [activeCtx]);

  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  // Football States
  const [footballApiConfig, setFootballApiConfig] = useState<FootballApiConfig>({
    bancaId: 'global', provider: 'api-football', apiKey: '', baseUrl: 'https://v3.football.api-sports.io', mode: 'live'
  });
  const [footballMatches, setFootballMatches] = useState<FootballMatch[]>([]);
  const [footballChampionships, setFootballChampionships] = useState<FootballChampionship[]>([]);
  const [footballTeams, setFootballTeams] = useState<FootballTeam[]>([]);

  // Carregamento inicial
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = (key: string, def: any) => { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; };
    
    const ctx = getActiveContext();
    setActiveCtx(ctx);
    const bId = ctx?.bancaId || 'default';

    const loadConfig = (baseKey: string, def: any) => {
      const g = load(`${baseKey}:global`, def);
      if (ctx?.mode === 'GLOBAL') return g;
      const s = load(`${baseKey}:${bId}`, null);
      return s || g;
    };

    setFootballApiConfig(loadConfig('app:football_api_config:v1', footballApiConfig));
    setFootballMatches(load('app:football_matches:v1', []));
    setFootballChampionships(load('app:football_champs:v1', []));
    setFootballTeams(load('app:football_teams:v1', []));
    
    // ... Carregar outros estados (apostas, bingo, etc) ...
    setApostas(load('app:apostas:v1', []));
    setBanners(load('app:banners:v1', []));
    setPopups(load('app:popups:v1', []));
    setNews(load('news_messages', []));
    setJdbLoterias(loadBichoLoterias());

    const refreshSession = () => {
      const u = getCurrentUser();
      setUser(u);
      setBalance(u?.saldo || 0);
      setBonus(u?.bonus || 0);
      setTerminal(u?.terminal || '');
    };
    refreshSession();
    window.addEventListener('auth-change', refreshSession);
    window.addEventListener('banca-context-updated', () => setActiveCtx(getActiveContext()));
    return () => { window.removeEventListener('auth-change', refreshSession); };
  }, []);

  const save = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
  const getSaveKey = (base: string) => isGlobalMode ? `${base}:global` : `${base}:${currentBancaId}`;

  // --- Football Actions ---

  const updateFootballApiConfig = useCallback((upd: Partial<FootballApiConfig>) => {
    setFootballApiConfig(prev => {
      const next = { ...prev, ...upd };
      save(getSaveKey('app:football_api_config:v1'), next);
      return next;
    });
  }, [isGlobalMode, currentBancaId]);

  const testFootballConnection = async () => {
    try {
      const api = new ApiFootballService({ apiKey: footballApiConfig.apiKey, baseUrl: footballApiConfig.baseUrl });
      await api.testConnection();
      updateFootballApiConfig({ status: 'connected', lastError: undefined });
      toast({ title: 'Conexão estabelecida!', description: 'API-FOOTBALL validada com sucesso.' });
      return true;
    } catch (e: any) {
      updateFootballApiConfig({ status: 'error', lastError: e.message });
      toast({ variant: 'destructive', title: 'Falha na conexão', description: e.message });
      return false;
    }
  };

  const syncFootballData = async (options: any = { syncLeagues: true, syncTeams: true, syncFixtures: true }) => {
    const result = await syncFromApiFootball(footballApiConfig, {
      championships: footballChampionships,
      teams: footballTeams,
      matches: footballMatches
    }, options);

    if (result.success) {
      if (result.data.championships.length > 0) {
        const mergedChamps = [...footballChampionships];
        result.data.championships.forEach((nc: any) => {
          const idx = mergedChamps.findIndex(c => c.apiId === nc.apiId);
          if (idx >= 0) mergedChamps[idx] = { ...mergedChamps[idx], ...nc };
          else mergedChamps.push(nc);
        });
        setFootballChampionships(mergedChamps);
        save('app:football_champs:v1', mergedChamps);
      }

      if (result.data.teams.length > 0) {
        const mergedTeams = [...footballTeams];
        result.data.teams.forEach((nt: any) => {
          if (!mergedTeams.some(t => t.id === nt.id)) mergedTeams.push(nt);
        });
        setFootballTeams(mergedTeams);
        save('app:football_teams:v1', mergedTeams);
      }

      if (result.data.matches.length > 0) {
        const mergedMatches = [...footballMatches];
        result.data.matches.forEach((nm: any) => {
          const idx = mergedMatches.findIndex(m => m.id === nm.id);
          if (idx >= 0) mergedMatches[idx] = { ...mergedMatches[idx], ...nm };
          else mergedMatches.push(nm);
        });
        setFootballMatches(mergedMatches);
        save('app:football_matches:v1', mergedMatches);
      }

      updateFootballApiConfig({ lastSync: new Date().toISOString() });
      toast({ title: 'Sincronização Concluída', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Erro no Sync', description: result.message });
    }
  };

  const updateChampionship = (id: string, data: Partial<FootballChampionship>) => {
    setFootballChampionships(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data } : c);
      save('app:football_champs:v1', next);
      return next;
    });
  };

  const deleteMatch = (id: string) => {
    setFootballMatches(prev => {
      const next = prev.filter(m => m.id !== id);
      save('app:football_matches:v1', next);
      return next;
    });
  };

  // ... Outros estados e métodos ...
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);

  const contextValue = {
    user, balance, bonus, terminal, activeBancaId: currentBancaId, isGlobalMode,
    logout: () => { logout(); setUser(null); router.push('/'); },
    apostas, handleFinalizarAposta: () => null,
    
    footballApiConfig, updateFootballApiConfig, testFootballConnection, syncFootballData,
    footballMatches, footballChampionships, footballTeams, updateChampionship, deleteMatch,

    news, banners, popups, jdbLoterias, postedResults: [],
    genericLotteryConfigs: [], updateGenericLottery: () => {}, casinoSettings: {}, updateCasinoSettings: () => {},
    bingoSettings: {} as any, updateBingoSettings: () => {}, bingoDraws: [], bingoTickets: [],
    snookerLiveConfig: {} as any, updateSnookerLiveConfig: () => {}, snookerChannels: [], snookerBets: [],
    snookerFinancialHistory: [], snookerPresence: {}, snookerChatMessages: [], snookerScoreboards: {},
    celebrationTrigger: false, clearCelebration: () => {}, isFullscreen: false, toggleFullscreen: () => {},
    cambistaMovements: [], registerCambistaMovement: () => {}, promoterCredits: []
  };

  return <AppContext.Provider value={contextValue as any}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
