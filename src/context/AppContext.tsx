'use client';

/**
 * @fileOverview AppContext - Orquestrador Central Síncrono (Master).
 * Controla o estado de todos os módulos exatamente como no preview.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { getUserByTerminal, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { MatchMapperService } from '@/services/match-mapper-service';

// --- INTERFACES ---
export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface Aposta {
  id: string;
  userId: string;
  bancaId: string;
  loteria: string;
  concurso: string;
  data: string;
  valor: string;
  numeros: string;
  status: 'aguardando' | 'premiado' | 'perdeu' | 'won' | 'lost' | 'cash_out';
  detalhes?: any;
  createdAt: string;
}

export interface FootballBet {
  id: string;
  userId: string;
  bancaId: string;
  terminal: string;
  stake: number;
  potentialWin: number;
  items: any[];
  status: 'OPEN' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
  isDescarga?: boolean;
}

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[];
  unifiedMatches: any[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncAt: string | null;
}

export interface LiveMiniPlayerConfig {
  enabled: boolean;
  youtubeUrl: string;
  youtubeEmbedId: string;
  title: string;
  autoShow: boolean;
  defaultState: 'open' | 'minimized';
  showOnHome: boolean;
  showOnSinuca: boolean;
  topHeight: number;
  bubbleSize: number;
  showLiveBadge?: boolean;
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  activeBancaId: string;
  ledger: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  apostas: Aposta[];
  postedResults: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: any[];
  liveMiniPlayerConfig: LiveMiniPlayerConfig;
  refreshData: () => void;
  logout: () => void;
  handleFinalizarAposta: (aposta: any, valorTotal: number) => string | null;
  processarResultados: (dados: any) => void;
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: any) => void;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  addBanner: (b: Banner) => void;
  updateBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  addPopup: (p: Popup) => void;
  updatePopup: (p: Popup) => void;
  deletePopup: (id: string) => void;
  addNews: (m: NewsMessage) => void;
  updateNews: (m: NewsMessage) => void;
  deleteNews: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState<any>(null);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [postedResults, setPostedResults] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG, matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>({
    enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
    autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
    topHeight: 96, bubbleSize: 62
  });

  const loadLocalData = useCallback(() => {
    const session = getSession();
    if (session) {
      const u = getUserByTerminal(session.terminal);
      setUser(u);
      if (u) setLedger(LedgerService.getByUser(u.id));
    } else {
      setUser(null);
      setLedger([]);
    }

    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    setApostas(getStorageItem('app:apostas:v1', []));
    setPostedResults(getStorageItem('app:posted_results:v1', []));
    setFootballBets(getStorageItem('app:football_bets:v1', []));
    setJdbLoterias(getStorageItem('app:jdb_loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_loterias:v1', INITIAL_GENERIC_LOTTERIES));
    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', liveMiniPlayerConfig));

    const savedFootball = getStorageItem('app:football:unified:v1', null);
    if (savedFootball && Array.isArray(savedFootball.unifiedMatches)) {
      // Saneamento defensivo: se houver objetos complexos onde deveria haver strings, limpa o cache
      const isCorrupted = savedFootball.unifiedMatches.some((m: any) => typeof m.homeTeam === 'object' || typeof m.awayTeam === 'object');
      if (isCorrupted) {
        console.warn('[AppContext] Dados de futebol corrompidos detectados. Limpando cache...');
        localStorage.removeItem('app:football:unified:v1');
      } else {
        setFootballData(prev => ({ ...prev, ...savedFootball }));
      }
    }
  }, [liveMiniPlayerConfig]);

  useEffect(() => {
    setMounted(true);
    loadLocalData();
    setIsLoading(false);

    const handleDataChange = () => loadLocalData();
    window.addEventListener('app:data-changed', handleDataChange);
    window.addEventListener('auth-change', handleDataChange);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChange);
      window.removeEventListener('auth-change', handleDataChange);
    };
  }, [loadLocalData]);

  const notify = () => window.dispatchEvent(new Event('app:data-changed'));

  const logout = () => { authLogout(); setUser(null); notify(); router.push('/login'); };

  const handleFinalizarAposta = (aposta: any, valorTotal: number): string | null => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const result = BetService.processBet(user, {
      userId: user.id, modulo: aposta.loteria, valor: valorTotal, retornoPotencial: 0,
      descricao: `${aposta.loteria}: ${aposta.numeros}`, referenceId: pouleId
    });

    if (result.success) {
      const newAposta: Aposta = { ...aposta, id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', status: 'aguardando', createdAt: new Date().toISOString() };
      const items = [newAposta, ...apostas];
      setStorageItem('app:apostas:v1', items);
      notify();
      return pouleId;
    }
    return null;
  };

  const processarResultados = (dados: any) => {
    const items = [dados, ...postedResults];
    setStorageItem('app:posted_results:v1', items);
    notify();
  };

  const syncFootballAll = async (force = false) => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allMatches: any[] = [];
      const leagueStandings: Record<string, any[]> = {};

      for (const league of activeLeagues) {
        const [standingsData, scoreboardData] = await Promise.all([
          espnService.getStandings(league.slug),
          espnService.getScoreboard(league.slug)
        ]);
        if (standingsData) leagueStandings[league.slug] = normalizeESPNStandings(standingsData);
        if (scoreboardData) allMatches = [...allMatches, ...normalizeESPNScoreboard(scoreboardData, league.slug)];
      }

      const unified = allMatches.map(match => {
        const probs = FootballOddsEngine.calculateMatchProbabilities(match.homeTeam.id, match.awayTeam.id, leagueStandings[match.leagueSlug] || []);
        const baseModel = MatchMapperService.transformEspnToBettable(match);
        const markets = FootballMarketsEngine.generateAllMarkets(probs);
        return { 
          ...baseModel, // MatchModel já garante homeTeam e awayTeam como strings
          markets, hasOdds: true, isLive: match.status === 'LIVE', 
          marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'OPEN', 
          odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } 
        };
      });

      const data = { matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      toast({ title: 'Sync Concluído' });
    } catch (e) {
      console.error(e);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    }
  };

  const updateLeagueConfig = (id: string, config: any) => {
    const leagues = footballData.leagues.map(l => l.id === id ? { ...l, ...config } : l);
    setFootballData(prev => ({ ...prev, leagues }));
    notify();
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`, referenceId: pouleId
    });

    if (result.success) {
      const newBet: FootballBet = { id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() };
      const items = [newBet, ...footballBets];
      setStorageItem('app:football_bets:v1', items);
      setBetSlip([]);
      notify();
      return pouleId;
    }
    return null;
  };

  const addBanner = (b: Banner) => { const items = [...banners, b]; setStorageItem('app:banners:v1', items); notify(); };
  const updateBanner = (b: Banner) => { const items = banners.map(i => i.id === b.id ? b : i); setStorageItem('app:banners:v1', items); notify(); };
  const deleteBanner = (id: string) => { const items = banners.filter(i => i.id !== id); setStorageItem('app:banners:v1', items); notify(); };

  const addPopup = (p: Popup) => { const items = [...popups, p]; setStorageItem('app:popups:v1', items); notify(); };
  const updatePopup = (p: Popup) => { const items = popups.map(i => i.id === p.id ? p : i); setStorageItem('app:popups:v1', items); notify(); };
  const deletePopup = (id: string) => { const items = popups.filter(i => i.id !== id); setStorageItem('app:popups:v1', items); notify(); };

  const addNews = (m: NewsMessage) => { const items = [...news, m]; setStorageItem('news_messages', items); notify(); };
  const updateNews = (m: NewsMessage) => { const items = news.map(i => i.id === m.id ? m : i); setStorageItem('news_messages', items); notify(); };
  const deleteNews = (id: string) => { const items = news.filter(i => i.id !== id); setStorageItem('news_messages', items); notify(); };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      activeBancaId: user?.bancaId || 'default', ledger, banners, popups, news, apostas, postedResults, 
      jdbLoterias, genericLotteryConfigs, footballData, footballBets, betSlip, liveMiniPlayerConfig,
      refreshData: loadLocalData, logout, handleFinalizarAposta, processarResultados, syncFootballAll, 
      updateLeagueConfig, addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)), clearBetSlip: () => setBetSlip([]),
      placeFootballBet, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup, addNews, updateNews, deleteNews
    }}>
      {mounted && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};
