/**
 * @fileOverview Contexto global do sistema. Adaptado para TheSportsDB.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getCurrentUser, logout } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { 
  NormalizedMatch, 
  NormalizedStanding, 
  NormalizedLeague,
  fetchAllAvailableLeagues,
  syncFootballMatches as syncMatchesAction,
  syncFootballStandings as syncStandingsAction
} from '@/services/football-sync-service';

export interface FootballSyncData {
  todayMatches: NormalizedMatch[];
  nextMatches: NormalizedMatch[];
  pastMatches: NormalizedMatch[];
  standings: NormalizedStanding[];
  leagues: NormalizedLeague[];
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface AppContextType {
  user: any;
  balance: number;
  bonus: number;
  terminal: string;
  logout: () => void;

  apostas: any[];
  
  // Football
  footballData: FootballSyncData;
  updateFootballLeagues: (leagues: NormalizedLeague[]) => void;
  syncFootballAll: () => Promise<void>;
  
  // Mocks/Stubs para outros módulos (não alterados)
  news: any[]; banners: any[]; popups: any[]; jdbLoterias: any[]; postedResults: any[];
  genericLotteryConfigs: any[]; updateGenericLottery: (c: any) => void; casinoSettings: any; updateCasinoSettings: (s: any) => void;
  bingoSettings: any; updateBingoSettings: (s: any) => void; bingoDraws: any[]; bingoTickets: any[];
  snookerLiveConfig: any; updateSnookerLiveConfig: (c: any) => void; snookerChannels: any[]; snookerBets: any[];
  snookerFinancialHistory: any[]; snookerPresence: any; snookerChatMessages: any[]; snookerScoreboards: any;
  celebrationTrigger: boolean; clearCelebration: () => void; isFullscreen: boolean; toggleFullscreen: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [terminal, setTerminal] = useState('');

  const [footballData, setFootballData] = useState<FootballSyncData>({
    todayMatches: [],
    nextMatches: [],
    pastMatches: [],
    standings: [],
    leagues: [],
    lastSync: null,
    syncStatus: 'idle'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('app:football:v2');
    if (stored) setFootballData(JSON.parse(stored));

    const refreshSession = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setBalance(currentUser.saldo || 0);
        setBonus(currentUser.bonus || 0);
        setTerminal(currentUser.terminal || '');
      }
    };
    refreshSession();
    window.addEventListener('auth-change', refreshSession);
    return () => window.removeEventListener('auth-change', refreshSession);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('app:football:v2', JSON.stringify(footballData));
  }, [footballData]);

  const updateFootballLeagues = (leagues: NormalizedLeague[]) => {
    setFootballData(prev => ({ ...prev, leagues }));
  };

  const syncFootballAll = async () => {
    setFootballData(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      // 1. Garante que temos a lista de ligas se estiver vazia
      let currentLeagues = footballData.leagues;
      if (currentLeagues.length === 0) {
        currentLeagues = await fetchAllAvailableLeagues();
      }

      const activeLeagueIds = currentLeagues.filter(l => l.importar).map(l => l.id);
      
      if (activeLeagueIds.length === 0) {
        setFootballData(prev => ({ ...prev, leagues: currentLeagues, syncStatus: 'idle' }));
        toast({ variant: 'destructive', title: 'Nenhuma liga selecionada', description: 'Selecione pelo menos uma liga para importar.' });
        return;
      }

      // 2. Sincroniza Jogos e Classificação
      const [matches, standings] = await Promise.all([
        syncMatchesAction(activeLeagueIds),
        syncStandingsAction(activeLeagueIds)
      ]);

      setFootballData({
        leagues: currentLeagues,
        todayMatches: matches.today,
        nextMatches: matches.next,
        pastMatches: matches.past,
        standings,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle'
      });

      toast({ title: 'Sincronização Concluída', description: 'Dados do futebol atualizados com sucesso.' });
    } catch (e) {
      setFootballData(prev => ({ ...prev, syncStatus: 'error' }));
      toast({ variant: 'destructive', title: 'Erro no Sync', description: 'Falha ao conectar com o provedor.' });
    }
  };

  // Stubs para manter compatibilidade
  const value: AppContextType = {
    user, balance, bonus, terminal, logout: () => { logout(); setUser(null); router.push('/'); },
    apostas: [],
    footballData, updateFootballLeagues, syncFootballAll,
    news: [], banners: [], popups: [], jdbLoterias: [], postedResults: [],
    genericLotteryConfigs: [], updateGenericLottery: () => {}, casinoSettings: {}, updateCasinoSettings: () => {},
    bingoSettings: {} as any, updateBingoSettings: () => {}, bingoDraws: [], bingoTickets: [],
    snookerLiveConfig: {} as any, updateSnookerLiveConfig: () => {}, snookerChannels: [], snookerBets: [],
    snookerFinancialHistory: [], snookerPresence: {}, snookerChatMessages: [], snookerScoreboards: {},
    celebrationTrigger: false, clearCelebration: () => {}, isFullscreen: false, toggleFullscreen: () => {}
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
