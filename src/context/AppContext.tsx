'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard } from '@/utils/espn-normalizer';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { BetPermissionService } from '@/services/bet-permission-service';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';

// --- BINGO INTERFACES ---
export interface BingoWinner {
  category: 'quadra' | 'kina' | 'keno';
  userId: string;
  userName: string;
  terminalId: string;
  winningNumbers: number[];
  winAmount: number;
  wonAt: string;
  type: 'BOT_WIN' | 'USER_WIN';
}

export interface BingoDraw {
  id: string;
  drawNumber: number;
  status: 'scheduled' | 'waiting' | 'live' | 'finished' | 'cancelled';
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  ticketPrice: number;
  housePercent: number;
  prizeRules: {
    quadra: number;
    kina: number;
    keno: number;
  };
  drawnNumbers: number[];
  winnersFound: {
    quadra?: BingoWinner;
    kina?: BingoWinner;
    keno?: BingoWinner;
  };
  totalTickets: number;
  totalRevenue: number;
  payoutTotal: number;
  bancaId: string;
}

export interface BingoTicket {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  ticketNumbers: number[][];
  status: 'active' | 'won' | 'lost' | 'refunded';
  amountPaid: number;
  createdAt: string;
  bancaId: string;
  isBot?: boolean;
}

export interface BingoSettings {
  enabled: boolean;
  ticketPriceDefault: number;
  housePercentDefault: number;
  maxTicketsPerUserDefault: number;
  preDrawHoldSeconds: number;
  prizeDefaults: {
    quadra: number;
    kina: number;
    keno: number;
  };
  scheduleMode: 'manual' | 'auto';
  autoSchedule: {
    everyMinutes: number;
    startHour: number;
    endHour: number;
  };
  rtpEnabled: boolean;
  rtpPercent: number;
}

export interface BingoPayout {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  terminalId: string;
  type: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface JDBLoteria {
  id: string;
  bancaId: string;
  nome: string;
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

export interface UserCommission {
  id: string;
  userId: string;
  modulo: string;
  valorAposta: number;
  valorComissao: number;
  porcentagem: number;
  createdAt: string;
  bancaId?: string;
}

interface FootballSyncData {
  matches: any[];
  unifiedMatches: MatchModel[];
  standings: Record<string, any[]>;
  leagues: ESPNLeagueConfig[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;
  refreshUser: () => void;
  footballData: FootballSyncData;
  footballBets: any[];
  betSlip: any[];
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<boolean>;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  banners: any[];
  popups: any[];
  news: any[];
  liveMiniPlayerConfig: any;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  registerCambistaMovement: (m: any) => void;
  cambistaMovements: any[];
  userCommissions: UserCommission[];
  promoterCredits: any[];
  apostas: any[];
  postedResults: any[];
  jdbLoterias: JDBLoteria[];
  genericLotteryConfigs: GenericLotteryConfig[];
  handleFinalizarAposta: (aposta: any, totalValue: number) => string | null;
  processarResultados: (dados: any) => void;
  activeBancaId: string | null;
  updateGenericLottery: (config: GenericLotteryConfig) => void;
  addJDBLoteria: (l: JDBLoteria) => void;
  updateJDBLoteria: (l: JDBLoteria) => void;
  deleteJDBLoteria: (id: string) => void;
  
  // Bingo
  bingoDraws: BingoDraw[];
  bingoTickets: BingoTicket[];
  bingoSettings: BingoSettings | null;
  bingoPayouts: BingoPayout[];
  buyBingoTickets: (drawId: string, count: number) => boolean;
  startBingoDraw: (id: string) => void;
  finishBingoDraw: (id: string) => void;
  cancelBingoDraw: (id: string, reason: string) => void;
  refundBingoTicket: (id: string) => void;
  updateBingoSettings: (s: BingoSettings) => void;
  createBingoDraw: (d: any) => void;
  payBingoPayout: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // States
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [footballBets, setFootballBets] = useState<any[]>([]);
  const [footballData, setFootballData] = useState<FootballSyncData>({
    matches: [], unifiedMatches: [], standings: {}, leagues: ESPN_LEAGUE_CATALOG, lastSync: null, syncStatus: 'idle'
  });
  const [banners, setBanners] = useState<any[]>([]);
  const [popups, setPopups] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [userCommissions, setUserCommissions] = useState<UserCommission[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<JDBLoteria[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<GenericLotteryConfig[]>([]);
  const [bingoDraws, setBingoDraws] = useState<BingoDraw[]>([]);
  const [bingoTickets, setBingoTickets] = useState<BingoTicket[]>([]);
  const [bingoSettings, setBingoSettings] = useState<BingoSettings | null>(null);
  const [bingoPayouts, setBingoPayouts] = useState<BingoPayout[]>([]);

  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    } else {
      setUser(null); setBalance(0); setBonus(0); setTerminal('');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshUser();
    
    // Carregar do Storage Seguro com Fallbacks Iniciais Restaurados
    setBingoDraws(getStorageItem('app:bingo_draws:v1', []));
    setBingoTickets(getStorageItem('app:bingo_tickets:v1', []));
    setBingoSettings(getStorageItem('app:bingo_settings:v1', {
      enabled: true, ticketPriceDefault: 0.3, housePercentDefault: 10, maxTicketsPerUserDefault: 100,
      preDrawHoldSeconds: 10, prizeDefaults: { quadra: 60, kina: 90, keno: 150 }, scheduleMode: 'manual',
      autoSchedule: { everyMinutes: 5, startHour: 8, endHour: 23 }, rtpEnabled: false, rtpPercent: 20
    }));

    // RESTAURAÇÃO DE LOTERIAS PADRÃO
    const storedJdb = getStorageItem('jogo_bicho:loterias:v1', []);
    setJdbLoterias(storedJdb.length > 0 ? storedJdb : INITIAL_JDB_LOTERIAS);

    const storedGeneric = getStorageItem('app:generic_lotteries:v1', []);
    setGenericLotteryConfigs(storedGeneric.length > 0 ? storedGeneric : INITIAL_GENERIC_LOTTERIES);
    
    setIsLoading(false);
    const handleAuthChange = () => refreshUser();
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [refreshUser]);

  // Persistência Automática
  useEffect(() => { if (mounted) setStorageItem('app:bingo_draws:v1', bingoDraws); }, [bingoDraws, mounted]);
  useEffect(() => { if (mounted) setStorageItem('app:bingo_tickets:v1', bingoTickets); }, [bingoTickets, mounted]);
  useEffect(() => { if (mounted) setStorageItem('app:bingo_settings:v1', bingoSettings); }, [bingoSettings, mounted]);
  useEffect(() => { if (mounted) setStorageItem('app:generic_lotteries:v1', genericLotteryConfigs); }, [genericLotteryConfigs, mounted]);
  useEffect(() => { if (mounted) setStorageItem('jogo_bicho:loterias:v1', jdbLoterias); }, [jdbLoterias, mounted]);

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      let allMatches: any[] = [];
      for (const league of footballData.leagues.filter(l => l.active)) {
        const scoreboard = await espnService.getScoreboard(league.slug);
        if (scoreboard) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboard, league.slug)];
      }
      const unified = MatchMapperService.mapEspnWithLiveScore(allMatches, []);
      setFootballData(prev => ({ ...prev, matches: allMatches, unifiedMatches: unified, lastSync: new Date().toISOString(), syncStatus: 'idle' }));
      if (manual) toast({ title: 'Mercado Sincronizado' });
    } catch (e) { setFootballData(prev => ({ ...prev, syncStatus: 'error' })); }
    finally { syncInProgress.current = false; }
  }, [footballData.leagues, toast]);

  const placeFootballBet = async (stake: number) => {
    if (!user) { router.push('/login'); return false; }
    const permission = BetPermissionService.validate(user.tipoUsuario, balance, bonus, stake);
    if (!permission.allowed) { toast({ variant: 'destructive', title: 'Aposta Recusada', description: permission.reason }); return false; }
    toast({ title: 'Aposta Realizada!' });
    return true;
  };

  const logout = () => { authLogout(); setUser(null); setBalance(0); router.push('/'); };
  const toggleFullscreen = () => { 
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  // --- Bingo Functions ---
  const createBingoDraw = (draw: any) => {
    const newDraw: BingoDraw = {
      ...draw,
      id: `draw-${Date.now()}`,
      drawNumber: (bingoDraws[0]?.drawNumber || 1000) + 1,
      status: 'scheduled',
      drawnNumbers: [],
      winnersFound: {},
      totalTickets: 0,
      totalRevenue: 0,
      payoutTotal: 0,
      bancaId: user?.bancaId || 'default'
    };
    setBingoDraws(prev => [newDraw, ...(prev || [])]);
  };

  const buyBingoTickets = (drawId: string, count: number) => {
    if (!user) return false;
    const price = bingoSettings?.ticketPriceDefault || 0.3;
    const total = count * price;
    if (balance < total) { toast({ variant: 'destructive', title: 'Saldo insuficiente' }); return false; }
    const newTickets = Array.from({ length: count }, () => ({
      id: `tk-${Math.random().toString(36).substr(2, 9)}`,
      drawId, userId: user.id, userName: user.nome || 'Usuário',
      terminalId: user.terminal, ticketNumbers: [Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 1)],
      status: 'active' as const, amountPaid: price, createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
    }));
    setBingoTickets(prev => [...(prev || []), ...newTickets]);
    setBingoDraws(prev => prev.map(d => d.id === drawId ? { ...d, totalTickets: d.totalTickets + count, totalRevenue: d.totalRevenue + total } : d));
    setBalance(prev => prev - total);
    toast({ title: 'Cartelas compradas!' });
    return true;
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance, bonus, terminal, logout, refreshUser,
      footballData, footballBets, betSlip,
      addBetToSlip: (b) => setBetSlip(prev => [...(prev || []).filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => (prev || []).filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet, syncFootballAll,
      updateLeagueConfig: (id, cfg) => setFootballData(prev => ({ ...prev, leagues: prev.leagues.map(l => l.id === id ? { ...l, ...cfg } : l) })),
      banners, popups, news, liveMiniPlayerConfig, isFullscreen, toggleFullscreen,
      celebrationTrigger, clearCelebration: () => setCelebrationTrigger(false),
      soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled),
      registerCambistaMovement: () => {}, cambistaMovements: [], userCommissions, promoterCredits: [],
      apostas, postedResults: [], jdbLoterias, genericLotteryConfigs,
      handleFinalizarAposta: (a) => {
        const id = `ap-${Date.now()}`; setApostas(prev => [{ ...a, id }, ...(prev || [])]); return id;
      },
      processarResultados: () => {}, activeBancaId: user?.bancaId || null,
      updateGenericLottery: (cfg) => setGenericLotteryConfigs(prev => (prev || []).map(c => c.id === cfg.id ? cfg : c)),
      addJDBLoteria: (l) => setJdbLoterias(prev => [l, ...(prev || [])]),
      updateJDBLoteria: (l) => setJdbLoterias(prev => (prev || []).map(x => x.id === l.id ? l : x)),
      deleteJDBLoteria: (id) => setJdbLoterias(prev => (prev || []).filter(x => x.id !== id)),
      bingoDraws, bingoTickets, bingoSettings, bingoPayouts,
      buyBingoTickets,
      createBingoDraw,
      startBingoDraw: (id) => setBingoDraws(prev => prev.map(d => d.id === id ? { ...d, status: 'live', startedAt: new Date().toISOString() } : d)),
      finishBingoDraw: (id) => setBingoDraws(prev => prev.map(d => d.id === id ? { ...d, status: 'finished', finishedAt: new Date().toISOString() } : d)),
      cancelBingoDraw: (id) => setBingoDraws(prev => prev.map(d => d.id === id ? { ...d, status: 'cancelled' } : d)),
      refundBingoTicket: () => {},
      updateBingoSettings: (s) => setBingoSettings(s),
      payBingoPayout: () => {}
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
