/**
 * @fileOverview Contexto global refinado para Sportsbook Profissional.
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
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';

export interface BetSlipItem {
  id: string; // selectionKey + matchId
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

export interface FootballSyncData {
  matches: NormalizedESPNMatch[];
  unifiedMatches: MatchModel[];
  standings: Record<string, NormalizedESPNStanding[]>;
  leagues: ESPNLeagueConfig[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'partial';
}

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  // Sportsbook Frontend
  footballData: FootballSyncData;
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<boolean>;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;

  // CMS & Outros (Restauração)
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
  apostas: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
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
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
      // Regra de Conflito: Uma seleção por jogo (Sportsbook Standard)
      // Remove seleções anteriores do mesmo jogo para dar lugar à nova
      const filtered = prev.filter(item => item.matchId !== bet.matchId);
      return [...filtered, bet];
    });
    toast({ title: 'Seleção adicionada', description: `${bet.matchName}: ${bet.pickLabel}` });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(item => item.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const placeFootballBet = async (stake: number): Promise<boolean> => {
    if (!user) { router.push('/login'); return false; }
    if (stake > balance) { toast({ variant: 'destructive', title: 'Saldo insuficiente' }); return false; }

    try {
      const response = await fetch('/api/betting/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stake, items: betSlip, balance })
      });

      const result = await response.json();
      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Falha na aposta', description: result.message });
        return false;
      }

      const newBalance = balance - stake;
      setBalance(newBalance);
      upsertUser({ terminal: user.terminal, saldo: newBalance });
      clearBetSlip();
      setCelebrationTrigger(true);
      toast({ title: 'Bilhete Confirmado! ⚽', description: 'Sua aposta foi registrada com sucesso.' });
      return true;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Tente novamente em instantes.' });
      return false;
    }
  };

  const logout = () => { authLogout(); setUser(null); setBalance(0); setTerminal(''); router.push('/'); };
  const toggleFullscreen = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } };
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const clearCelebration = () => setCelebrationTrigger(false);

  return (
    <AppContext.Provider value={{
      user, balance, bonus, terminal, logout,
      footballData, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      syncFootballAll, updateLeagueConfig,
      banners, popups, news, liveMiniPlayerConfig, isFullscreen, toggleFullscreen,
      celebrationTrigger, clearCelebration, soundEnabled, toggleSound,
      
      // Stubs
      bingoSettings: null, bingoDraws: [], bingoTickets: [], snookerChannels: [],
      snookerBets: [], snookerPresence: {}, snookerScoreboards: {}, snookerChatMessages: [],
      snookerBetsFeed: [], snookerActivityFeed: [], snookerFinancialHistory: [], snookerCashOutLog: [],
      apostas: [], jdbLoterias: [], genericLotteryConfigs: [],
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
