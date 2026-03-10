/**
 * @fileOverview Contexto global refinado para Sportsbook Profissional.
 * Gerencia autenticação, saldo, dados de futebol e estados de múltiplos módulos.
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
import { BetPermissionService } from '@/services/bet-permission-service';
import { registerDescarga } from '@/utils/descargaStorage';
import { resolveCurrentBanca } from '@/utils/bancaContext';

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

export interface FootballBet {
  id: string;
  userId: string;
  terminal: string;
  stake: number;
  potentialWin: number;
  totalOdds: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  items: BetSlipItem[];
  bancaId: string;
  isDescarga?: boolean;
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
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;
  refreshUser: () => void;

  // Sportsbook Frontend
  footballData: FootballSyncData;
  footballBets: FootballBet[];
  betSlip: BetSlipItem[];
  addBetToSlip: (bet: BetSlipItem) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<boolean>;
  syncFootballAll: (manual?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;

  // CMS & Outros
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
  
  // Módulos e Históricos
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
  const [isLoading, setIsLoading] = useState(true);
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

  const [banners, setBanners] = useState<any[]>([]);
  const [popups, setPopups] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [cambistaMovements, setCambistaMovements] = useState<any[]>([]);
  const [userCommissions, setUserCommissions] = useState<any[]>([]);
  const [promoterCredits, setPromoterCredits] = useState<any[]>([]);

  // Função para atualizar os dados do usuário a partir da sessão atual
  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setBalance(currentUser.saldo || 0);
      setBonus(currentUser.bonus || 0);
      setTerminal(currentUser.terminal || '');
    } else {
      setUser(null);
      setBalance(0);
      setBonus(0);
      setTerminal('');
    }
  }, []);

  useEffect(() => {
    // Sincronização inicial
    refreshUser();

    // Listeners para mudanças de autenticação
    const handleAuthChange = () => {
      refreshUser();
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'app:session:v1') handleAuthChange();
    });

    // Carregamento de dados persistidos
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

    const savedFBets = localStorage.getItem('app:football_bets:v1');
    if (savedFBets) setFootballBets(JSON.parse(savedFBets) || []);

    const savedMovements = localStorage.getItem('app:cambista_movements:v1');
    if (savedMovements) setCambistaMovements(JSON.parse(savedMovements) || []);

    syncFootballAll();
    
    // Finaliza carregamento inicial
    setIsLoading(false);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [refreshUser]);

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

      // LiveScore data
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
      const filtered = prev.filter(item => item.matchId !== bet.matchId);
      return [...filtered, bet];
    });
    toast({ title: 'Seleção adicionada', description: `${bet.matchName}: ${bet.pickLabel}` });
  };

  const removeBetFromSlip = (id: string) => setBetSlip(prev => prev.filter(item => item.id !== id));
  const clearBetSlip = () => setBetSlip([]);

  const registerCambistaMovement = (movement: any) => {
    const newMovement = {
      ...movement,
      id: `mov-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newMovement, ...cambistaMovements];
    setCambistaMovements(updated);
    localStorage.setItem('app:cambista_movements:v1', JSON.stringify(updated));
  };

  const placeFootballBet = async (stake: number): Promise<boolean> => {
    if (!user) { 
      router.push('/login'); 
      return false; 
    }

    // 1. Validação de Permissão e Perfil (Padronização)
    const permission = BetPermissionService.validate(user.tipoUsuario, balance, bonus, stake);
    if (!permission.allowed) {
      toast({ variant: 'destructive', title: 'Aposta Bloqueada', description: permission.reason });
      return false;
    }

    // 2. Re-validação final de horário pré-confirmação
    const now = new Date();
    for (const item of betSlip) {
      const match = footballData.unifiedMatches.find(m => m.id === item.matchId);
      if (match) {
        const kickoff = new Date(match.kickoff);
        if (now >= kickoff && !match.isLive) {
          toast({ variant: 'destructive', title: 'Aposta Recusada', description: `O jogo ${match.homeTeam} já começou.` });
          return false;
        }
        if (match.isFinished) {
          toast({ variant: 'destructive', title: 'Aposta Recusada', description: `O jogo ${match.homeTeam} já terminou.` });
          return false;
        }
      }
    }

    try {
      const totalOdds = betSlip.reduce((acc, item) => acc * item.odd, 1);
      const potentialWin = stake * totalOdds;
      const currentBanca = resolveCurrentBanca();
      const bancaId = user.bancaId || 'default';

      let isDescarga = false;

      // 3. Lógica de Descarga para Cambistas
      if (user.tipoUsuario === 'CAMBISTA' && currentBanca) {
        if (currentBanca.descargaConfig.ativo && potentialWin > currentBanca.descargaConfig.limitePremio) {
          isDescarga = true;
          registerDescarga({
            bancaId: currentBanca.id,
            bancaNome: currentBanca.nome,
            apostaId: `fb-${Date.now()}`,
            userId: user.id,
            terminal: user.terminal,
            nomeUsuario: user.nome || 'Cambista',
            tipoUsuario: user.tipoUsuario,
            modulo: 'Futebol',
            valorApostado: stake,
            retornoPossivel: potentialWin,
            status: 'EM_DESCARGA'
          });
        }

        // Registrar movimento de caixa para o cambista (Venda)
        registerCambistaMovement({
          userId: user.id,
          terminal: user.terminal,
          tipo: 'APOSTA',
          valor: stake,
          modulo: 'Futebol',
          observacao: `Venda Futebol - Pule: fb-${Date.now()}`
        });
      }

      const response = await fetch('/api/betting/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stake, 
          items: betSlip, 
          balance,
          bonus,
          userType: user.tipoUsuario 
        })
      });

      const result = await response.json();
      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Falha na aposta', description: result.message });
        return false;
      }

      const newBet: FootballBet = {
        id: `fb-${Date.now()}`,
        userId: user.id,
        terminal: user.terminal,
        stake,
        totalOdds,
        potentialWin,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        items: [...betSlip],
        bancaId,
        isDescarga
      };

      const updatedBets = [newBet, ...footballBets];
      setFootballBets(updatedBets);
      localStorage.setItem('app:football_bets:v1', JSON.stringify(updatedBets));

      // 4. Atualização de saldo (Apenas se não for Cambista)
      if (user.tipoUsuario !== 'CAMBISTA') {
        const newBalance = balance - stake;
        setBalance(newBalance);
        upsertUser({ terminal: user.terminal, saldo: newBalance });
      }

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
  const toggleFullscreen = () => { 
    if (!document.fullscreenElement) { 
      document.documentElement.requestFullscreen(); 
      setIsFullscreen(true); 
    } else { 
      document.exitFullscreen(); 
      setIsFullscreen(false); 
    } 
  };
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const clearCelebration = () => setCelebrationTrigger(false);

  return (
    <AppContext.Provider value={{
      user, isLoading, balance, bonus, terminal, logout, refreshUser,
      footballData, footballBets, betSlip, addBetToSlip, removeBetFromSlip, clearBetSlip, placeFootballBet,
      syncFootballAll, updateLeagueConfig,
      banners, popups, news, liveMiniPlayerConfig, isFullscreen, toggleFullscreen,
      celebrationTrigger, clearCelebration, soundEnabled, toggleSound,
      
      // Módulos e stubs
      bingoSettings: null, bingoDraws: [], bingoTickets: [], snookerChannels: [],
      snookerBets: [], snookerPresence: {}, snookerScoreboards: {}, snookerChatMessages: [],
      snookerBetsFeed: [], snookerActivityFeed: [], snookerFinancialHistory: [], snookerCashOutLog: [],
      apostas: [], jdbLoterias: [], genericLotteryConfigs: [],
      depositos: [], saques: [], cambistaMovements, registerCambistaMovement,
      userCommissions, promoterCredits
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
