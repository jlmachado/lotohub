/**
 * @fileOverview Contexto global gerenciando a arquitetura híbrida de Futebol e Apostas.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { upsertUser } from '@/utils/usersStorage';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService, LiveScoreMatch } from '@/services/livescore-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { generatePoule } from '@/utils/generatePoule';

// --- TYPES ---

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
  liveMatches: LiveScoreMatch[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

export interface FootballBet {
  id: string;
  userId: string;
  terminal: string;
  items: BetSlipItem[];
  stake: number;
  totalOdds: number;
  potentialWin: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  bancaId: string;
}

export interface Banner { id: string; title: string; content?: string; imageUrl: string; linkUrl?: string; position: number; active: boolean; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description?: string; imageUrl?: string; linkUrl?: string; buttonText?: string; active: boolean; priority: number; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  // UI/General
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  liveMiniPlayerConfig: any;

  // Football & Betting
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => boolean;
  footballData: FootballSyncData;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  
  // Other modules (Bingo, Snooker, etc.)
  bingoDraws: any[];
  bingoTickets: any[];
  snookerChannels: any[];
  snookerBets: any[];
  snookerPresence: any;
  snookerScoreboards: any;
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  apostas: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  handleFinalizarAposta: (a: any, v: number) => string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  // Core User State
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  // Football State
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballSyncData>({
    matches: [],
    standings: {},
    leagues: ESPN_LEAGUE_CATALOG,
    liveMatches: [],
    lastSync: null,
    syncStatus: 'idle'
  });

  // Common Modules State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<any>(null);
  const [bingoDraws, setBingoDraws] = useState<any[]>([]);
  const [bingoTickets, setBingoTickets] = useState<any[]>([]);
  const [snookerChannels, setSnookerChannels] = useState<any[]>([]);
  const [snookerBets, setSnookerBets] = useState<any[]>([]);
  const [snookerPresence, setSnookerPresence] = useState<any>({});
  const [snookerScoreboards, setSnookerScoreboards] = useState<any>({});
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [apostas, setApostas] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    // Load data from localStorage
    const savedBanners = localStorage.getItem('app:banners:v1');
    if (savedBanners) setBanners(JSON.parse(savedBanners));

    const savedFootballBets = localStorage.getItem('app:football_bets:v1');
    if (savedFootballBets) setFootballBets(JSON.parse(savedFootballBets));

    const savedApostas = localStorage.getItem('apostas');
    if (savedApostas) setApostas(JSON.parse(savedApostas));

    const savedLeagues = localStorage.getItem('app:football_leagues:v1');
    if (savedLeagues) {
      try {
        const parsed = JSON.parse(savedLeagues);
        setFootballData(prev => ({ ...prev, leagues: parsed }));
      } catch (e) {
        console.error("Erro ao carregar ligas salvas", e);
      }
    }

    // Iniciar sync de futebol
    syncFootballAll();
  }, []);

  // --- SYNC ENGINE ---
  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allMatches: NormalizedESPNMatch[] = [];
      const allStandings: Record<string, NormalizedESPNStanding[]> = {};

      // 1. Dados Estruturais (ESPN)
      for (const league of activeLeagues) {
        const scoreboard = await espnService.getScoreboard(league.slug);
        if (scoreboard) {
          const normalized = normalizeESPNScoreboard(scoreboard, league.slug);
          allMatches = [...allMatches, ...normalized];
        }
        
        if (league.useStandings) {
          const table = await espnService.getStandings(league.slug);
          if (table) {
            allStandings[league.slug] = normalizeESPNStandings(table);
          }
        }
      }

      // 2. Dados de Mercado (Live Score API)
      const live = await liveScoreService.getLiveMatches();

      setFootballData(prev => ({
        ...prev,
        matches: allMatches,
        standings: allStandings,
        liveMatches: live,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Futebol Atualizado!', description: 'Dados da ESPN e LiveScore sincronizados.' });
    } catch (e: any) {
      console.error("[Football Sync Error]", e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      if (manual) toast({ variant: 'destructive', title: 'Erro na Sincronização' });
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => {
      const updatedLeagues = prev.leagues.map(l => 
        l.id === id ? { ...l, ...config } : l
      );
      localStorage.setItem('app:football_leagues:v1', JSON.stringify(updatedLeagues));
      return { ...prev, leagues: updatedLeagues };
    });
  };

  // --- BETTING ACTIONS ---
  const addBetToSlip = (bet: BetSlipItem) => {
    // Evita duplicatas da mesma partida no bilhete (acumulada de mercados diferentes da mesma partida pode ser limitada)
    if (betSlip.some(item => item.matchId === bet.matchId)) {
      setBetSlip(prev => prev.map(item => item.matchId === bet.matchId ? bet : item));
    } else {
      setBetSlip(prev => [...prev, bet]);
    }
    toast({ title: 'Adicionado ao bilhete', description: `${bet.matchName}: ${bet.selection}` });
  };

  const removeBetFromSlip = (id: string) => {
    setBetSlip(prev => prev.filter(item => item.id !== id));
  };

  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = (stake: number): boolean => {
    if (!user) {
      router.push('/login');
      return false;
    }

    if (balance < stake) {
      toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'Você não possui saldo para esta aposta.' });
      return false;
    }

    const totalOdds = calculateTotalOdds(betSlip);
    const potentialWin = stake * totalOdds;

    const newBet: FootballBet = {
      id: `bet-fb-${Date.now()}`,
      userId: user.id,
      terminal: user.terminal,
      items: [...betSlip],
      stake,
      totalOdds,
      potentialWin,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      bancaId: user.bancaId || 'default'
    };

    const updatedBets = [newBet, ...footballBets];
    setFootballBets(updatedBets);
    localStorage.setItem('app:football_bets:v1', JSON.stringify(updatedBets));

    // Debitar saldo
    const newBalance = balance - stake;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });

    clearBetSlip();
    toast({ title: 'Aposta Realizada!', description: `Bilhete ${newBet.id.substring(0, 8)} confirmado.` });
    return true;
  };

  // --- LOGOUT ---
  const logout = () => {
    authLogout();
    setUser(null);
    setBalance(0);
    setTerminal('');
    router.push('/');
  };

  // --- PLACEHOLDERS FOR OTHER MODULES ---
  const clearCelebration = () => setCelebrationTrigger(false);
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const handleFinalizarAposta = (a: any, v: number) => {
    if (!user) return null;
    const poule = generatePoule();
    const newAposta = { ...a, id: poule, userId: user.id, status: 'aguardando', createdAt: new Date().toISOString(), bancaId: 'default' };
    const newList = [newAposta, ...apostas];
    setApostas(newList);
    localStorage.setItem('apostas', JSON.stringify(newList));
    const newBalance = balance - v;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });
    return poule;
  };

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout,
      banners, popups, news, liveMiniPlayerConfig,
      footballBets, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      footballData, syncFootballAll, updateLeagueConfig,
      bingoDraws, bingoTickets, snookerChannels, snookerBets, snookerPresence, snookerScoreboards,
      celebrationTrigger, clearCelebration, soundEnabled, toggleSound,
      apostas, jdbLoterias, genericLotteryConfigs, handleFinalizarAposta
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
