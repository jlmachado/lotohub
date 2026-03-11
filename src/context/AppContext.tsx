'use client';

/**
 * @fileOverview AppContext - Orquestrador Central baseado em Storage Local.
 * Revertido totalmente para o modelo síncrono.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { getUserByTerminal, upsertUser, getUsers } from '@/utils/usersStorage';
import { LedgerService } from '@/services/ledger-service';
import { BetService } from '@/services/bet-service';
import { generatePoule } from '@/utils/generatePoule';
import { espnService } from '@/services/espn-api-service';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';

export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; imageMeta?: any; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

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
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  ledger: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: any[];
  liveMiniPlayerConfig: LiveMiniPlayerConfig;
  
  refreshData: () => void;
  logout: () => void;
  addBanner: (banner: Banner) => void;
  updateBanner: (banner: Banner) => void;
  deleteBanner: (id: string) => void;
  addPopup: (popup: Popup) => void;
  updatePopup: (popup: Popup) => void;
  deletePopup: (id: string) => void;
  addNews: (msg: NewsMessage) => void;
  updateNews: (msg: NewsMessage) => void;
  deleteNews: (id: string) => void;
  syncFootballAll: (force?: boolean) => Promise<void>;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  updateLiveMiniPlayerConfig: (config: LiveMiniPlayerConfig) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState<any>(null);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  
  // Local state mirrored from storage
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>({
    enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
    autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
    topHeight: 96, bubbleSize: 62
  });
  
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG, matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });

  const loadLocalData = useCallback(() => {
    const session = getSession();
    if (session) {
      const u = getUserByTerminal(session.terminal);
      setUser(u);
      setLedger(LedgerService.getByUser(u?.id || ''));
    } else {
      setUser(null);
      setLedger([]);
    }

    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    setFootballBets(getStorageItem('app:football_bets:v1', []));
    setLiveMiniPlayerConfig(getStorageItem('app:mini_player_cfg:v1', liveMiniPlayerConfig));
    setFootballData(prev => ({
      ...prev,
      ...getStorageItem('app:football:unified:v1', { matches: [], unifiedMatches: [], lastSyncAt: null })
    }));
  }, []);

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

  const refreshData = () => loadLocalData();

  const logout = () => {
    authLogout();
    setUser(null);
    notify();
    router.push('/login');
  };

  // --- CRUD RESTORED ---
  const addBanner = (b: Banner) => { const items = [...banners, b]; setStorageItem('app:banners:v1', items); setBanners(items); notify(); };
  const updateBanner = (b: Banner) => { const items = banners.map(i => i.id === b.id ? b : i); setStorageItem('app:banners:v1', items); setBanners(items); notify(); };
  const deleteBanner = (id: string) => { const items = banners.filter(i => i.id !== id); setStorageItem('app:banners:v1', items); setBanners(items); notify(); };

  const addPopup = (p: Popup) => { const items = [...popups, p]; setStorageItem('app:popups:v1', items); setPopups(items); notify(); };
  const updatePopup = (p: Popup) => { const items = popups.map(i => i.id === p.id ? p : i); setStorageItem('app:popups:v1', items); setPopups(items); notify(); };
  const deletePopup = (id: string) => { const items = popups.filter(i => i.id !== id); setStorageItem('app:popups:v1', items); setPopups(items); notify(); };

  const addNews = (m: NewsMessage) => { const items = [...news, m]; setStorageItem('news_messages', items); setNews(items); notify(); };
  const updateNews = (m: NewsMessage) => { const items = news.map(i => i.id === m.id ? m : i); setStorageItem('news_messages', items); setNews(items); notify(); };
  const deleteNews = (id: string) => { const items = news.filter(i => i.id !== id); setStorageItem('news_messages', items); setNews(items); notify(); };

  const updateLiveMiniPlayerConfig = (cfg: LiveMiniPlayerConfig) => { setStorageItem('app:mini_player_cfg:v1', cfg); setLiveMiniPlayerConfig(cfg); notify(); };

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
        const markets = FootballMarketsEngine.generateAllMarkets(probs);
        return { ...match, markets, hasOdds: true, isLive: match.status === 'LIVE', marketStatus: 'OPEN', odds: { home: markets[0].selections[0].odd, draw: markets[0].selections[1].odd, away: markets[0].selections[2].odd } };
      });

      const data = { matches: allMatches, unifiedMatches: unified, lastSyncAt: new Date().toISOString() };
      setStorageItem('app:football:unified:v1', data);
      setFootballData(prev => ({ ...prev, ...data, syncStatus: 'success' }));
      toast({ title: 'Sync Concluído' });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
    }
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const result = BetService.processBet(user, {
      userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`,
      referenceId: pouleId
    });

    if (result.success) {
      const bets = getStorageItem<FootballBet[]>('app:football_bets:v1', []);
      const newBet: FootballBet = { id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal, stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString() };
      bets.unshift(newBet);
      setStorageItem('app:football_bets:v1', bets);
      setBetSlip([]);
      notify();
      return pouleId;
    }
    return null;
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      ledger, banners, popups, news, footballData, footballBets, betSlip, liveMiniPlayerConfig,
      refreshData, logout, addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup,
      addNews, updateNews, deleteNews, syncFootballAll,
      addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet, updateLiveMiniPlayerConfig
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
