/**
 * @fileOverview AppContext Refatorado - Orquestrador Central de Futebol e Dados.
 */

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { INITIAL_GENERIC_LOTTERIES, INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';
import { generatePoule } from '@/utils/generatePoule';
import { BetService } from '@/services/bet-service';
import { LedgerService, LedgerEntry } from '@/services/ledger-service';
import { APP_EVENTS, notifyDataChange } from '@/services/event-bus';
import { getActiveContext } from '@/utils/bancaContext';
import { getDashboardTotals } from '@/utils/dashboardTotals';
import { getUsers } from '@/utils/usersStorage';
import { espnService } from '@/services/espn-api-service';
import { liveScoreService } from '@/services/livescore-api-service';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard } from '@/utils/espn-normalizer';

export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[]; // Raw ESPN
  liveScoreMatches: any[]; // Raw LiveScore
  unifiedMatches: MatchModel[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncAt: string | null;
  providerStatus: {
    espn: 'online' | 'offline';
    livescore: 'online' | 'offline';
  };
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  ledger: LedgerEntry[];
  dashboardTotals: any;
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  footballData: FootballData;
  betSlip: any[];
  
  refreshData: () => void;
  logout: () => void;
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  [key: string]: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState<any>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG,
    matches: [],
    liveScoreMatches: [],
    unifiedMatches: [],
    syncStatus: 'idle',
    lastSyncAt: null,
    providerStatus: { espn: 'online', livescore: 'online' }
  });

  const refreshData = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLedger(LedgerService.getEntries());
    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    
    // Football Reidration
    const savedLeagues = getStorageItem('app:football:leagues:v1', ESPN_LEAGUE_CATALOG);
    const savedUnified = getStorageItem('app:football:unified:v1', []);
    setFootballData(prev => ({
      ...prev,
      leagues: savedLeagues,
      unifiedMatches: savedUnified,
      lastSyncAt: getStorageItem('app:football:last_sync:v1', null)
    }));

    setIsLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshData();
    window.addEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
    return () => window.removeEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
  }, [refreshData]);

  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => {
      const newLeagues = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l);
      setStorageItem('app:football:leagues:v1', newLeagues);
      return { ...prev, leagues: newLeagues };
    });
    notifyDataChange();
  };

  const syncFootballAll = async (force: boolean = false) => {
    if (footballData.syncStatus === 'syncing') return;

    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allEspnMatches: any[] = [];
      let allLiveScoreMatches: any[] = [];

      // 1. Fetch ESPN Scoreboards
      for (const league of activeLeagues) {
        const data = await espnService.getScoreboard(league.slug);
        if (data) {
          const normalized = normalizeESPNScoreboard(data, league.slug);
          allEspnMatches = [...allEspnMatches, ...normalized];
        }
      }

      // 2. Fetch LiveScore Data (Live and Fixtures)
      const liveMatches = await liveScoreService.getLiveMatches();
      allLiveScoreMatches = [...liveMatches];

      // 3. Map and Unify
      const unified = MatchMapperService.mapEspnWithLiveScore(allEspnMatches, allLiveScoreMatches);

      // 4. Update State and Storage
      const now = new Date().toISOString();
      setFootballData(prev => ({
        ...prev,
        matches: allEspnMatches,
        liveScoreMatches: allLiveScoreMatches,
        unifiedMatches: unified,
        syncStatus: 'success',
        lastSyncAt: now
      }));

      setStorageItem('app:football:unified:v1', unified);
      setStorageItem('app:football:last_sync:v1', now);
      
      toast({ title: 'Sincronização Concluída', description: `${unified.length} partidas unificadas.` });
      notifyDataChange();

    } catch (error) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: 'Falha ao conectar com os provedores.' });
    }
  };

  const logout = () => { authLogout(); setUser(null); router.push('/login'); };

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
      const currentBets = getStorageItem('app:football_bets:v1', []);
      setStorageItem('app:football_bets:v1', [{ id: pouleId, createdAt: new Date().toISOString(), stake, potentialWin, items: betSlip, status: 'OPEN' }, ...currentBets]);
      setBetSlip([]);
      notifyDataChange();
      return pouleId;
    }
    return null;
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      ledger, banners, popups, news, footballData, betSlip,
      refreshData, logout, syncFootballAll, updateLeagueConfig,
      addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet
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
