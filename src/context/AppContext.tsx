/**
 * @fileOverview Contexto global gerenciando a arquitetura híbrida de Futebol e Apostas.
 * Integra ESPN (Estrutura) e Live Score API (Mercado/Live) com lógica de sportsbook.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { upsertUser } from '@/utils/usersStorage';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService } from '@/services/livescore-api-service';
import { LiveScoreMatch } from '@/utils/livescore-normalizer';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { RiskManagementService } from '@/services/risk-management-service';

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  unifiedMatches: MatchModel[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
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

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  // Imagens e CMS
  banners: any[];
  popups: any[];
  news: any[];
  liveMiniPlayerConfig: any;
  isFullscreen: boolean;
  toggleFullscreen: () => void;

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
  
  // Stubs para outros módulos
  bingoSettings: any;
  bingoDraws: any[];
  bingoTickets: any[];
  snookerChannels: any[];
  snookerBets: any[];
  snookerPresence: any;
  snookerScoreboards: any;
  snookerChatMessages: any[];
  snookerBetsFeed: any[];
  snookerActivityFeed: any[];
  snookerFinancialHistory: any[];
  snookerCashOutLog: any[];
  celebrationTrigger: boolean;
  clearCelebration: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  apostas: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  handleFinalizarAposta: (a: any, v: number) => string | null;
  depositos: any[];
  saques: any[];
  cambistaMovements: any[];
  registerCambistaMovement: (m: any) => void;
  userCommissions: any[];
  promoterCredits: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const syncInProgress = useRef(false);

  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballSyncData>({
    matches: [],
    unifiedMatches: [],
    standings: {},
    leagues: ESPN_LEAGUE_CATALOG,
    lastSync: null,
    syncStatus: 'idle'
  });

  const [banners, setBanners] = useState([]);
  const [popups, setPopups] = useState([]);
  const [news, setNews] = useState([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState(null);

  // Inicialização e Carregamento de Dados Persistidos
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    const savedLeagues = localStorage.getItem('app:football_leagues:v1');
    if (savedLeagues) setFootballData(prev => ({ ...prev, leagues: JSON.parse(savedLeagues) }));

    const savedFootballBets = localStorage.getItem('app:football_bets:v12');
    if (savedFootballBets) setFootballBets(JSON.parse(savedFootballBets));

    const savedBanners = localStorage.getItem('app:banners:v1');
    if (savedBanners) setBanners(JSON.parse(savedBanners) || []);

    const savedPopups = localStorage.getItem('app:popups:v1');
    if (savedPopups) setPopups(JSON.parse(savedPopups) || []);

    const savedNews = localStorage.getItem('news_messages');
    if (savedNews) setNews(JSON.parse(savedNews) || []);

    const savedPlayer = localStorage.getItem('app:mini_player:v1');
    if (savedPlayer) setLiveMiniPlayerConfig(JSON.parse(savedPlayer));

    syncFootballAll();
  }, []);

  const syncFootballAll = useCallback(async (manual = false) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allEspnMatches: NormalizedESPNMatch[] = [];
      const allStandings: Record<string, NormalizedESPNStanding[]> = {};

      // 1. Carregar Estrutura ESPN
      for (const league of activeLeagues) {
        const scoreboard = await espnService.getScoreboard(league.slug);
        if (scoreboard) {
          allEspnMatches = [...allEspnMatches, ...normalizeESPNScoreboard(scoreboard, league.slug)];
        }
        if (league.useStandings) {
          const table = await espnService.getStandings(league.slug);
          if (table) allStandings[league.slug] = normalizeESPNStandings(table);
        }
      }

      // 2. Carregar Mercado LiveScore
      const live = await liveScoreService.getLiveMatches();
      const history = await liveScoreService.getFixtures(); // Fixtures do dia
      const allLiveScore = [...(live || []), ...(history || [])];

      // 3. Unificar via Matching Engine
      const unified = MatchMapperService.mapEspnWithLiveScore(allEspnMatches, allLiveScore);

      setFootballData(prev => ({
        ...prev,
        matches: allEspnMatches,
        unifiedMatches: unified,
        standings: allStandings,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      }));

      if (manual) toast({ title: 'Mercado Atualizado', description: 'Dados de jogos e odds sincronizados.' });
    } catch (e: any) {
      console.error("[Sportsbook Sync Error]", e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      syncInProgress.current = false;
    }
  }, [footballData.leagues, toast]);

  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => {
      const updated = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l);
      localStorage.setItem('app:football_leagues:v1', JSON.stringify(updated));
      return { ...prev, leagues: updated };
    });
  };

  // --- Lógica de Apostas ---

  const addBetToSlip = (bet: BetSlipItem) => {
    setBetSlip(prev => {
      // Regra de Conflito: Remove seleção anterior do mesmo jogo para evitar apostas conflitantes (ex: 1 e X no mesmo jogo)
      const filtered = prev.filter(item => item.matchId !== bet.matchId);
      return [...filtered, bet];
    });
    
    // Feedback visual opcional
    const totalOdds = calculateTotalOdds([...betSlip.filter(i => i.matchId !== bet.matchId), bet]);
    toast({ 
      title: 'Seleção Adicionada', 
      description: `${bet.matchName}: ${bet.selection} (@${bet.odd.toFixed(2)})` 
    });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(item => item.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = (stake: number): boolean => {
    if (!user) { router.push('/login'); return false; }
    
    const totalOdds = calculateTotalOdds(betSlip);
    
    // Validação de Risco e Saldo
    const riskCheck = RiskManagementService.validateBet(stake, totalOdds, balance);
    if (!riskCheck.allowed) {
      toast({ variant: 'destructive', title: 'Aposta Recusada', description: riskCheck.reason });
      return false;
    }

    const potentialWin = calculatePotentialWin(stake, totalOdds);

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

    // Registrar aposta
    const updatedBets = [newBet, ...footballBets];
    setFootballBets(updatedBets);
    localStorage.setItem('app:football_bets:v12', JSON.stringify(updatedBets));

    // Debitar saldo
    const newBalance = balance - stake;
    setBalance(newBalance);
    upsertUser({ terminal: user.terminal, saldo: newBalance });

    clearBetSlip();
    toast({ 
      title: 'Bilhete Confirmado! ⚽', 
      description: `Pule: ${newBet.id.substring(7, 15)} | Retorno: R$ ${potentialWin.toFixed(2)}` 
    });
    
    return true;
  };

  const logout = () => { authLogout(); setUser(null); setBalance(0); setTerminal(''); router.push('/'); };
  const toggleFullscreen = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } };

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout,
      banners, popups, news, liveMiniPlayerConfig,
      isFullscreen, toggleFullscreen,
      footballBets, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      footballData, syncFootballAll, updateLeagueConfig,
      
      // Stubs
      bingoSettings: null, bingoDraws: [], bingoTickets: [], snookerChannels: [],
      snookerBets: [], snookerPresence: {}, snookerScoreboards: {}, snookerChatMessages: [],
      snookerBetsFeed: [], snookerActivityFeed: [], snookerFinancialHistory: [], snookerCashOutLog: [],
      celebrationTrigger: false, clearCelebration: () => {}, soundEnabled: true, toggleSound: () => {},
      apostas: [], jdbLoterias: [], genericLotteryConfigs: [], handleFinalizarAposta: () => null,
      depositos: [], saques: [], cambistaMovements: [], registerCambistaMovement: () => {},
      userCommissions: [], promoterCredits: []
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
