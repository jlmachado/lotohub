/**
 * @fileOverview Contexto global atualizado para lógica de Sportsbook Profissional.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { upsertUser } from '@/utils/usersStorage';
import { useRouter } from 'next/navigation';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService } from '@/services/livescore-api-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNMatch, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';

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

  // Sportsbook
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<boolean>;
  footballData: FootballSyncData;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;

  // CMS & Outros
  banners: any[];
  popups: any[];
  news: any[];
  liveMiniPlayerConfig: any;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  
  // Stubs preservados
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

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    }

    // Hydrate data
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

      const live = await liveScoreService.getLiveMatches();
      const history = await liveScoreService.getFixtures();
      const allLiveScore = [...(live || []), ...(history || [])];

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

  const addBetToSlip = (bet: BetSlipItem) => {
    setBetSlip(prev => {
      // Regra de Conflito: Um jogo por bilhete
      const filtered = prev.filter(item => item.matchId !== bet.matchId);
      return [...filtered, bet];
    });
    toast({ title: 'Adicionado ao bilhete', description: `${bet.matchName}: ${bet.selection}` });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(item => item.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = async (stake: number): Promise<boolean> => {
    if (!user) { router.push('/login'); return false; }

    try {
      // Validação Server-Side
      const response = await fetch('/api/betting/place-bet', {
        method: 'POST',
        body: JSON.stringify({ stake, items: betSlip, balance })
      });

      const result = await response.json();

      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Erro na Aposta', description: result.message });
        return false;
      }

      // Registro Local
      const totalOdds = calculateTotalOdds(betSlip);
      const newBet: FootballBet = {
        id: `bet-fb-${Date.now()}`,
        userId: user.id,
        terminal: user.terminal,
        items: [...betSlip],
        stake,
        totalOdds,
        potentialWin: stake * totalOdds,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        bancaId: user.bancaId || 'default'
      };

      const updatedBets = [newBet, ...footballBets];
      setFootballBets(updatedBets);
      localStorage.setItem('app:football_bets:v12', JSON.stringify(updatedBets));

      const newBalance = balance - stake;
      setBalance(newBalance);
      upsertUser({ terminal: user.terminal, saldo: newBalance });

      clearBetSlip();
      toast({ title: 'Bilhete Confirmado! ⚽', description: `Pule: ${newBet.id.substring(7, 15)}` });
      return true;

    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha de Conexão', description: 'Não foi possível registrar a aposta.' });
      return false;
    }
  };

  const logout = () => { authLogout(); setUser(null); setBalance(0); setTerminal(''); router.push('/'); };
  const toggleFullscreen = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } };

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout,
      banners, popups, news, liveMiniPlayerConfig, isFullscreen, toggleFullscreen,
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
