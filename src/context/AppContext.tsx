/**
 * @fileOverview AppContext - Orquestrador Central Reativo via Firebase.
 */

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSession, logout as authLogout } from '@/utils/auth';
import { APP_EVENTS, notifyDataChange } from '@/services/event-bus';
import { espnService } from '@/services/espn-api-service';
import { MatchModel } from '@/services/match-mapper-service';
import { ESPN_LEAGUE_CATALOG, ESPNLeagueConfig } from '@/utils/espn-league-catalog';
import { normalizeESPNScoreboard, normalizeESPNStandings } from '@/utils/espn-normalizer';
import { FootballOddsEngine } from '@/services/football-odds-engine';
import { FootballMarketsEngine } from '@/services/football-markets-engine';
import { MigrationService } from '@/services/migration-service';
import { usersRepo } from '@/repositories/users-repository';
import { bancasRepo } from '@/repositories/bancas-repository';
import { ledgerRepo } from '@/repositories/ledger-repository';
import { BaseRepository } from '@/repositories/base-repository';
import { onSnapshot, collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { generatePoule } from '@/utils/generatePoule';
import { BetService } from '@/services/bet-service';

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
  isDescarga?: boolean;
}

export interface FootballData {
  leagues: ESPNLeagueConfig[];
  matches: any[];
  unifiedMatches: MatchModel[];
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
  
  refreshData: () => Promise<void>;
  logout: () => void;
  addBanner: (banner: Banner) => Promise<void>;
  updateBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  addPopup: (popup: Popup) => Promise<void>;
  updatePopup: (popup: Popup) => Promise<void>;
  deletePopup: (id: string) => Promise<void>;
  addNews: (msg: NewsMessage) => Promise<void>;
  updateNews: (msg: NewsMessage) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  syncFootballAll: (force?: boolean) => Promise<void>;
  updateLeagueConfig: (id: string, config: Partial<ESPNLeagueConfig>) => Promise<void>;
  addBetToSlip: (bet: any) => void;
  removeBetFromSlip: (id: string) => void;
  clearBetSlip: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  updateLiveMiniPlayerConfig: (config: LiveMiniPlayerConfig) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [betSlip, setBetSlip] = useState<any[]>([]);
  const [footballBets, setFootballBets] = useState<FootballBet[]>([]);
  const [liveMiniPlayerConfig, setLiveMiniPlayerConfig] = useState<LiveMiniPlayerConfig>({
    enabled: true, youtubeUrl: '', youtubeEmbedId: '', title: 'Sinuca ao Vivo',
    autoShow: true, defaultState: 'open', showOnHome: true, showOnSinuca: true,
    topHeight: 96, bubbleSize: 62
  });
  
  const [footballData, setFootballData] = useState<FootballData>({
    leagues: ESPN_LEAGUE_CATALOG, matches: [], unifiedMatches: [], syncStatus: 'idle', lastSyncAt: null
  });

  const refreshData = useCallback(async () => {
    const session = getSession();
    if (session) {
      const u = await usersRepo.getById(session.userId);
      setUser(u);
    } else {
      setUser(null);
    }
  }, []);

  // --- Realtime Listeners ---
  useEffect(() => {
    if (!mounted) return;

    // Listeners Globais
    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      setBanners(snap.docs.map(d => ({ ...d.data(), id: d.id } as Banner)).sort((a,b) => a.position - b.position));
    });

    const unsubPopups = onSnapshot(collection(db, 'popups'), (snap) => {
      setPopups(snap.docs.map(d => ({ ...d.data(), id: d.id } as Popup)).sort((a,b) => b.priority - a.priority));
    });

    const unsubNews = onSnapshot(collection(db, 'newsMessages'), (snap) => {
      setNews(snap.docs.map(d => ({ ...d.data(), id: d.id } as NewsMessage)).sort((a,b) => a.order - b.order));
    });

    const unsubConfig = onSnapshot(doc(db, 'systemConfigs', 'miniPlayer'), (doc) => {
      if (doc.exists()) setLiveMiniPlayerConfig(doc.data() as LiveMiniPlayerConfig);
    });

    return () => {
      unsubBanners(); unsubPopups(); unsubNews(); unsubConfig();
    };
  }, [mounted]);

  // Listeners de Usuário (Ledger e Bets)
  useEffect(() => {
    if (!user?.id) return;

    const qLedger = query(collection(db, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(100));
    const unsubLedger = onSnapshot(qLedger, (snap) => {
      setLedger(snap.docs.map(d => ({ ...d.data(), id: d.id } as any)).filter(e => e.userId === user.id));
    });

    const unsubUser = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (snap.exists()) setUser(snap.data());
    });

    return () => { unsubLedger(); unsubUser(); };
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setMounted(true);
      await MigrationService.run();
      await refreshData();
      setIsLoading(false);
    };
    init();
  }, [refreshData]);

  // --- Actions ---
  const bannerRepo = new BaseRepository<Banner>('banners');
  const popupRepo = new BaseRepository<Popup>('popups');
  const newsRepo = new BaseRepository<NewsMessage>('newsMessages');

  const addBanner = (b: Banner) => bannerRepo.save(b);
  const updateBanner = (b: Banner) => bannerRepo.update(b.id, b);
  const deleteBanner = (id: string) => bannerRepo.delete(id);

  const addPopup = (p: Popup) => popupRepo.save(p);
  const updatePopup = (p: Popup) => popupRepo.update(p.id, p);
  const deletePopup = (id: string) => popupRepo.delete(id);

  const addNews = (m: NewsMessage) => newsRepo.save(m);
  const updateNews = (m: NewsMessage) => newsRepo.update(m.id, m);
  const deleteNews = (id: string) => newsRepo.delete(id);

  const updateLiveMiniPlayerConfig = async (cfg: LiveMiniPlayerConfig) => {
    await setDoc(doc(db, 'systemConfigs', 'miniPlayer'), cfg);
  };

  const syncFootballAll = async (force: boolean = false) => {
    if (footballData.syncStatus === 'syncing') return;
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      // Nota: No Firestore, podemos salvar o catálogo customizado por banca ou global
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
          id: match.id, espnId: match.id, league: match.leagueName, leagueSlug: match.leagueSlug,
          homeTeam: match.homeTeam.name, awayTeam: match.awayTeam.name,
          homeLogo: match.homeTeam.logo, awayLogo: match.awayTeam.logo,
          kickoff: match.date, status: match.status, minute: match.clock || '',
          scoreHome: match.homeTeam.score, scoreAway: match.awayTeam.score,
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
      setFootballData(prev => ({ ...prev, matches: allMatches, unifiedMatches: unified, syncStatus: 'success', lastSyncAt: now }));
      toast({ title: 'Sincronização Concluída' });
    } catch (error) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro na Sincronização' });
    }
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    
    const invalidSelection = betSlip.find(item => {
      const liveMatch = footballData.unifiedMatches.find(m => m.id === item.matchId);
      return liveMatch?.marketStatus !== 'OPEN';
    });

    if (invalidSelection) {
      toast({ variant: 'destructive', title: 'Mercado Suspenso' });
      return null;
    }

    const pouleId = generatePoule();
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const result = await BetService.processBet(user, {
      userId: user.id, modulo: 'Futebol', valor: stake, retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`,
      referenceId: pouleId
    });

    if (result.success) {
      const betRepo = new BaseRepository<FootballBet>('footballBets');
      await betRepo.save({ 
        id: pouleId, userId: user.id, bancaId: user.bancaId || 'default', terminal: user.terminal,
        stake, potentialWin, items: betSlip, status: 'OPEN', createdAt: new Date().toISOString()
      } as any);
      setBetSlip([]);
      return pouleId;
    }
    return null;
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, balance: user?.saldo || 0, bonus: user?.bonus || 0, terminal: user?.terminal || '',
      ledger, banners, popups, news, footballData, footballBets, betSlip, liveMiniPlayerConfig,
      refreshData, logout: () => { authLogout(); setUser(null); router.push('/login'); },
      addBanner, updateBanner, deleteBanner, addPopup, updatePopup, deletePopup,
      addNews, updateNews, deleteNews, syncFootballAll,
      updateLeagueConfig: async (id, cfg) => { /* logic to update leagues in DB */ },
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
