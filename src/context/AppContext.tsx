/**
 * @fileOverview AppContext - Orquestrador Central.
 * Atualizado para gerenciar Polling Live e Suspensão de Mercados.
 */

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout as authLogout } from '@/utils/auth';
import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { generatePoule } from '@/utils/generatePoule';
import { BetService } from '@/services/bet-service';
import { LedgerService, LedgerEntry } from '@/services/ledger-service';
import { APP_EVENTS, notifyDataChange } from '@/services/event-bus';
import { espnService } from '@/services/espn-api-service';
import { MatchModel } from '@/services/match-mapper-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { FootballLiveEngine } from '@/services/football-live-engine';

export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; }
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
  isDescarga?: boolean;
}

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[];
  unifiedMatches: MatchModel[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncAt: string | null;
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  ledger: LedgerEntry[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  footballData: FootballData;
  footballBets: FootballBet[];
  betSlip: any[];
  
  refreshData: () => void;
  logout: () => void;
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => void;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
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
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG,
    matches: [],
    unifiedMatches: [],
    syncStatus: 'idle',
    lastSyncAt: null
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const refreshData = useCallback(() => {
    if (typeof window === 'undefined') return;
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLedger(LedgerService.getEntries());
    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));
    setFootballBets(getStorageItem('app:football_bets:v1', []));
    
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

  // --- LIVE POLLING LOGIC ---
  const runLiveUpdate = useCallback(async () => {
    const liveMatches = footballData.unifiedMatches.filter(m => m.isLive);
    if (liveMatches.length === 0) return;

    const leaguesToSync = [...new Set(liveMatches.map(m => m.leagueSlug))];
    let hasChanges = false;
    let newUnified = [...footballData.unifiedMatches];

    for (const slug of leaguesToSync) {
      const scoreboard = await espnService.getScoreboard(slug);
      if (!scoreboard?.events) continue;

      const normalized = normalizeESPNScoreboard(scoreboard, slug);
      
      normalized.forEach(matchData => {
        const idx = newUnified.findIndex(m => m.id === matchData.id);
        if (idx !== -1) {
          const oldMatch = newUnified[idx];
          const updatedMatch = FootballLiveEngine.processUpdate(oldMatch, matchData);
          
          if (JSON.stringify(oldMatch) !== JSON.stringify(updatedMatch)) {
            newUnified[idx] = updatedMatch;
            hasChanges = true;
          }
        }
      });
    }

    // Reabertura de mercados suspensos por tempo
    const now = Date.now();
    newUnified = newUnified.map(m => {
      // Se estava suspenso e o tempo de reabertura (fictício p/ protótipo) passou
      // No mundo real, usaríamos a propriedade 'nextReopenAt' detectada no processUpdate
      if (m.marketStatus === 'SUSPENDED' && m.isLive) {
        // Simulação: reabre se não houve mudança crítica no último ciclo
        return { ...m, marketStatus: 'OPEN' };
      }
      return m;
    });

    if (hasChanges) {
      setFootballData(prev => ({ ...prev, unifiedMatches: newUnified }));
      setStorageItem('app:football:unified:v1', newUnified);
      window.dispatchEvent(new Event(APP_EVENTS.DATA_CHANGED));
    }
  }, [footballData.unifiedMatches]);

  useEffect(() => {
    if (!mounted) return;
    
    // Inicia polling apenas se houver jogos live
    const hasLive = footballData.unifiedMatches.some(m => m.isLive);
    if (hasLive && !pollingRef.current) {
      pollingRef.current = setInterval(runLiveUpdate, 30000); // 30s
    } else if (!hasLive && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [mounted, footballData.unifiedMatches, runLiveUpdate]);

  useEffect(() => {
    setMounted(true);
    refreshData();
    window.addEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
    return () => window.removeEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
  }, [refreshData]);

  const syncFootballAll = async (force: boolean = false) => {
    if (footballData.syncStatus === 'syncing') return;
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

      const unified: MatchModel[] = allMatches.map(match => {
        const probs = FootballOddsEngine.calculateMatchProbabilities(
          match.homeTeam.id, match.awayTeam.id, leagueStandings[match.leagueSlug] || []
        );
        const internalMarkets = FootballMarketsEngine.generateAllMarkets(probs);
        const resultMarket = internalMarkets.find(m => m.id === '1X2');

        return {
          id: match.id,
          espnId: match.id,
          league: match.leagueName,
          leagueSlug: match.leagueSlug,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          homeLogo: match.homeTeam.logo,
          awayLogo: match.awayTeam.logo,
          kickoff: match.date,
          status: match.status,
          minute: match.clock || '',
          scoreHome: match.homeTeam.score,
          scoreAway: match.awayTeam.score,
          hasOdds: true,
          odds: {
            home: resultMarket?.selections.find(s => s.id === 'home')?.odd || 2.0,
            draw: resultMarket?.selections.find(s => s.id === 'draw')?.odd || 3.2,
            away: resultMarket?.selections.find(s => s.id === 'away')?.odd || 2.8
          },
          markets: internalMarkets,
          isLive: match.status === 'LIVE',
          isFinished: match.status === 'FINISHED',
          marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'OPEN'
        };
      });

      const now = new Date().toISOString();
      setFootballData(prev => ({ 
        ...prev, 
        matches: allMatches, 
        unifiedMatches: unified, 
        syncStatus: 'success', 
        lastSyncAt: now 
      }));
      
      setStorageItem('app:football:unified:v1', unified);
      setStorageItem('app:football:last_sync:v1', now);
      notifyDataChange();
      toast({ title: 'Sincronização Concluída', description: 'Jogos e Odds atualizados.' });
    } catch (error) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização' });
    }
  };

  const updateLeagueConfig = (id: string, config: Partial<ESPNLeagueConfig>) => {
    setFootballData(prev => {
      const newLeagues = prev.leagues.map(l => l.id === id ? { ...l, ...config } : l);
      setStorageItem('app:football:leagues:v1', newLeagues);
      return { ...prev, leagues: newLeagues };
    });
    notifyDataChange();
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    
    // VALIDACAO LIVE: Impede aposta se o mercado estiver suspenso ou fechado
    const invalidSelection = betSlip.find(item => {
      const liveMatch = footballData.unifiedMatches.find(m => m.id === item.matchId);
      return liveMatch?.marketStatus !== 'OPEN';
    });

    if (invalidSelection) {
      const match = footballData.unifiedMatches.find(m => m.id === invalidSelection.matchId);
      toast({ 
        variant: 'destructive', 
        title: 'Mercado Suspenso', 
        description: `As apostas para ${match?.homeTeam} vs ${match?.awayTeam} foram suspensas temporariamente.` 
      });
      return null;
    }

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
      const newBet: FootballBet = { 
        id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal,
        stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString()
      };
      setStorageItem('app:football_bets:v1', [newBet, ...currentBets]);
      setBetSlip([]);
      notifyDataChange();
      return pouleId;
    }
    return null;
  };

  const logout = () => { authLogout(); setUser(null); router.push('/login'); };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      ledger, banners, popups, news, footballData, footballBets, betSlip,
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
