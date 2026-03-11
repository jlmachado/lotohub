/**
 * @fileOverview AppContext Refatorado - Orquestrador Central de Futebol e Dados.
 * Gerencia sincronização ESPN, motor de odds interno e estado global.
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
import { espnService } from '@/services/espn-api-service';
import { MatchMapperService, MatchModel } from '@/services/match-mapper-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings, NormalizedESPNStanding } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine, BettingMarket } from '@/services/football-markets-engine';

export interface Banner { id: string; title: string; content: string; imageUrl: string; active: boolean; position: number; linkUrl?: string; startAt?: string; endAt?: string; }
export interface Popup { id: string; title: string; description: string; imageUrl: string; active: boolean; priority: number; buttonText?: string; linkUrl?: string; startAt?: string; endAt?: string; }
export interface NewsMessage { id: string; text: string; order: number; active: boolean; }

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[]; // Raw ESPN Matches
  standings: Record<string, NormalizedESPNStanding[]>; // Classificações por Liga
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
  
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG,
    matches: [],
    standings: {},
    unifiedMatches: [],
    syncStatus: 'idle',
    lastSyncAt: null
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
    const savedStandings = getStorageItem('app:football:standings:v1', {});
    
    setFootballData(prev => ({
      ...prev,
      leagues: savedLeagues,
      unifiedMatches: savedUnified,
      standings: savedStandings,
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

  /**
   * Sincronização Global ESPN com Precificação Interna.
   */
  const syncFootballAll = async (force: boolean = false) => {
    if (footballData.syncStatus === 'syncing') return;

    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const activeLeagues = footballData.leagues.filter(l => l.active);
      let allMatches: any[] = [];
      const leagueStandings: Record<string, NormalizedESPNStanding[]> = {};

      // 1. Fetch ESPN Standings & Scoreboards
      for (const league of activeLeagues) {
        // Classificação (Vital para as odds)
        const standingsData = await espnService.getStandings(league.slug);
        if (standingsData) {
          leagueStandings[league.slug] = normalizeESPNStandings(standingsData);
        }

        // Jogos
        const scoreboardData = await espnService.getScoreboard(league.slug);
        if (scoreboardData) {
          const normalized = normalizeESPNScoreboard(scoreboardData, league.slug);
          allMatches = [...allMatches, ...normalized];
        }
      }

      // 2. Mapeamento e Precificação Interna
      const unified: MatchModel[] = allMatches.map(match => {
        const standings = leagueStandings[match.leagueSlug] || [];
        
        // Gerar Probabilidades via Odds Engine
        const probs = FootballOddsEngine.calculateMatchProbabilities(
          match.homeTeam.id,
          match.awayTeam.id,
          standings
        );

        // Gerar Mercados via Markets Engine
        const internalMarkets = FootballMarketsEngine.generateAllMarkets(probs);
        
        // Extrair odd 1X2 para exibição rápida no card
        const resultMarket = internalMarkets.find(m => m.id === '1X2');
        const odds = {
          home: resultMarket?.selections.find(s => s.id === 'home')?.odd || 2.0,
          draw: resultMarket?.selections.find(s => s.id === 'draw')?.odd || 3.2,
          away: resultMarket?.selections.find(s => s.id === 'away')?.odd || 2.8
        };

        const isFinished = match.status === 'FINISHED';

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
          odds,
          markets: internalMarkets,
          isLive: match.status === 'LIVE',
          isFinished,
          marketStatus: isFinished ? 'CLOSED' : 'OPEN'
        };
      });

      // 3. Update State and Storage
      const now = new Date().toISOString();
      setFootballData(prev => ({
        ...prev,
        matches: allMatches,
        standings: leagueStandings,
        unifiedMatches: unified,
        syncStatus: 'success',
        lastSyncAt: now
      }));

      setStorageItem('app:football:unified:v1', unified);
      setStorageItem('app:football:standings:v1', leagueStandings);
      setStorageItem('app:football:last_sync:v1', now);
      
      toast({ title: 'Sincronização Concluída', description: `${unified.length} partidas precificadas internamente.` });
      notifyDataChange();

    } catch (error) {
      console.error("[Football Sync Error]", error);
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: 'Falha ao processar dados da ESPN.' });
    }
  };

  const logout = () => { authLogout(); setUser(null); router.push('/login'); };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    const pouleId = generatePoule();
    
    // O cálculo de retorno agora usa as odds calculadas internamente presentes no slip
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const result = BetService.processBet(user, {
      userId: user.id, 
      modulo: 'Futebol', 
      valor: stake, 
      retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`,
      referenceId: pouleId
    });

    if (result.success) {
      const currentBets = getStorageItem('app:football_bets:v1', []);
      const newBet = { 
        id: pouleId, 
        createdAt: new Date().toISOString(), 
        stake, 
        potentialWin, 
        items: betSlip, 
        status: 'OPEN',
        bancaId: user.bancaId || 'default',
        terminal: user.terminal
      };
      setStorageItem('app:football_bets:v1', [newBet, ...currentBets]);
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
