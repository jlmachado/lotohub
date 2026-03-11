/**
 * @fileOverview AppContext Refatorado - Orquestrador Reativo de Dados.
 */

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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

export interface Banner {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  thumbUrl: string;
  linkUrl: string;
  position: number;
  active: boolean;
  startAt: string;
  endAt: string;
  imageMeta?: ImageMetadata;
}

export interface Popup {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbUrl: string;
  linkUrl: string;
  buttonText: string;
  active: boolean;
  priority: number;
  startAt: string;
  endAt: string;
  imageMeta?: ImageMetadata;
}

export interface NewsMessage {
  id: string;
  text: string;
  order: number;
  active: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

interface AppContextType {
  user: any;
  isLoading: boolean;
  balance: number;
  bonus: number;
  terminal: string;
  ledger: LedgerEntry[];
  dashboardTotals: any;
  apostas: any[];
  bingoDraws: any[];
  bingoTickets: any[];
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  banners: Banner[];
  popups: Popup[];
  news: NewsMessage[];
  betSlip: any[];
  isFullscreen: boolean;
  
  refreshData: () => void;
  logout: () => void;
  toggleFullscreen: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  handleFinalizarAposta: (aposta: any, totalValue: number) => string | null;
  registerCambistaMovement: (data: any) => void;
  
  // Banner/Status methods
  addBanner: (banner: Banner) => void;
  updateBanner: (banner: Banner) => void;
  deleteBanner: (id: string) => void;
  
  // Popup methods
  addPopup: (popup: Popup) => void;
  updatePopup: (popup: Popup) => void;
  deletePopup: (id: string) => void;

  // News methods
  addNews: (msg: NewsMessage) => void;
  updateNews: (msg: NewsMessage) => void;
  deleteNews: (id: string) => void;

  [key: string]: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // States
  const [user, setUser] = useState<any>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [apostas, setApostas] = useState<any[]>([]);
  const [bingoDraws, setBingoDraws] = useState<any[]>([]);
  const [bingoTickets, setBingoTickets] = useState<any[]>([]);
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [news, setNews] = useState<NewsMessage[]>([]);
  const [dashboardTotals, setDashboardTotals] = useState<any>(null);
  const [betSlip, setBetSlip] = useState<any[]>([]);

  const refreshData = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentUser = getCurrentUser();
    const ctx = getActiveContext();
    const users = getUsers();
    
    setUser(currentUser);
    const currentLedger = LedgerService.getEntries();
    setLedger(currentLedger);
    
    setApostas(getStorageItem('app:apostas:v1', []));
    setBingoDraws(getStorageItem('app:bingo_draws:v1', []));
    setBingoTickets(getStorageItem('app:bingo_tickets:v1', []));
    setJdbLoterias(getStorageItem('jogo_bicho:loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_lotteries:v1', INITIAL_GENERIC_LOTTERIES));
    setBanners(getStorageItem('app:banners:v1', []));
    setPopups(getStorageItem('app:popups:v1', []));
    setNews(getStorageItem('news_messages', []));

    const totals = getDashboardTotals({
      apostas: getStorageItem('app:apostas:v1', []),
      bingoTickets: getStorageItem('app:bingo_tickets:v1', []),
      bingoDraws: getStorageItem('app:bingo_draws:v1', []),
      snookerBets: [],
      snookerFinancialHistory: [],
      footballBets: getStorageItem('app:football_bets:v1', []),
      users: users,
      ledger: currentLedger
    }, {
      mode: ctx?.mode || 'GLOBAL',
      bancaId: ctx?.bancaId || null
    });

    setDashboardTotals(totals);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshData();

    window.addEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
    window.addEventListener(APP_EVENTS.AUTH_CHANGED, refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener(APP_EVENTS.DATA_CHANGED, refreshData);
      window.removeEventListener(APP_EVENTS.AUTH_CHANGED, refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, [refreshData]);

  const logout = () => {
    authLogout();
    setUser(null);
    router.push('/login');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // CRUD Banner
  const addBanner = (b: Banner) => {
    const list = [...banners, b];
    setStorageItem('app:banners:v1', list);
    notifyDataChange();
  };
  const updateBanner = (b: Banner) => {
    const list = banners.map(item => item.id === b.id ? b : item);
    setStorageItem('app:banners:v1', list);
    notifyDataChange();
  };
  const deleteBanner = (id: string) => {
    const list = banners.filter(item => item.id !== id);
    setStorageItem('app:banners:v1', list);
    notifyDataChange();
  };

  // CRUD Popup
  const addPopup = (p: Popup) => {
    const list = [...popups, p];
    setStorageItem('app:popups:v1', list);
    notifyDataChange();
  };
  const updatePopup = (p: Popup) => {
    const list = popups.map(item => item.id === p.id ? p : item);
    setStorageItem('app:popups:v1', list);
    notifyDataChange();
  };
  const deletePopup = (id: string) => {
    const list = popups.filter(item => item.id !== id);
    setStorageItem('app:popups:v1', list);
    notifyDataChange();
  };

  // CRUD News
  const addNews = (m: NewsMessage) => {
    const list = [...news, m];
    setStorageItem('news_messages', list);
    notifyDataChange();
  };
  const updateNews = (m: NewsMessage) => {
    const list = news.map(item => item.id === m.id ? m : item);
    setStorageItem('news_messages', list);
    notifyDataChange();
  };
  const deleteNews = (id: string) => {
    const list = news.filter(item => item.id !== id);
    setStorageItem('news_messages', list);
    notifyDataChange();
  };

  const placeFootballBet = async (stake: number): Promise<string | null> => {
    if (!user) { router.push('/login'); return null; }
    
    const pouleId = generatePoule();
    const totalOdds = parseFloat(betSlip.reduce((acc, item) => acc * (item.odd || 1), 1).toFixed(2));
    const potentialWin = parseFloat((stake * totalOdds).toFixed(2));

    const betResult = BetService.processBet(user, {
      userId: user.id,
      modulo: 'Futebol',
      valor: stake,
      retornoPotencial: potentialWin,
      descricao: `Futebol: ${betSlip.map(i => i.matchName).join(' | ')}`,
      referenceId: pouleId
    });

    if (betResult.success) {
      const apostaUnificada = {
        id: pouleId,
        userId: user.id,
        bancaId: user.bancaId || 'default',
        loteria: 'Futebol',
        concurso: 'Sportsbook',
        data: new Date().toLocaleString('pt-BR'),
        createdAt: new Date().toISOString(),
        valor: `R$ ${stake.toFixed(2).replace('.', ',')}`,
        numeros: betSlip.map(i => `${i.matchName}: ${i.pickLabel}`).join('; '),
        status: 'aguardando',
        isDescarga: betResult.isDescarga,
        detalhes: { selections: betSlip, totalOdds, potentialWin }
      };

      const currentApostas = getStorageItem('app:apostas:v1', []);
      setStorageItem('app:apostas:v1', [apostaUnificada, ...currentApostas]);
      
      const currentFootball = getStorageItem('app:football_bets:v1', []);
      setStorageItem('app:football_bets:v1', [{...apostaUnificada, stake, potentialWin, totalOdds, items: betSlip}, ...currentFootball]);

      setBetSlip([]);
      toast({ title: 'Aposta Realizada!' });
      notifyDataChange();
      return pouleId;
    }
    return null;
  };

  const handleFinalizarAposta = (aposta: any, totalValue: number): string | null => {
    if (!user) return null;
    const pouleId = generatePoule();
    const retorno = aposta.detalhes?.reduce((acc: number, i: any) => acc + (i.retornoPossivel || 0), 0) || 0;

    const betResult = BetService.processBet(user, {
      userId: user.id,
      modulo: aposta.loteria,
      valor: totalValue,
      retornoPotencial: retorno,
      descricao: `${aposta.loteria}: ${aposta.numeros}`,
      referenceId: pouleId,
      loteria: aposta.loteria
    });

    if (betResult.success) {
      const novaAposta = { 
        ...aposta, 
        id: pouleId, 
        createdAt: new Date().toISOString(), 
        userId: user.id, 
        bancaId: user.bancaId || 'default', 
        status: 'aguardando',
        isDescarga: betResult.isDescarga
      };
      const current = getStorageItem('app:apostas:v1', []);
      setStorageItem('app:apostas:v1', [novaAposta, ...current]);
      notifyDataChange();
      return pouleId;
    }
    return null;
  };

  const buyBingoTickets = (drawId: string, count: number) => {
    if (!user) return false;
    const price = 0.3;
    const total = count * price;

    const betResult = BetService.processBet(user, {
      userId: user.id,
      modulo: 'Bingo',
      valor: total,
      retornoPotencial: 0,
      descricao: `Compra de ${count} cartelas Bingo`,
      referenceId: `bin-${drawId}`
    });

    if (betResult.success) {
      const tickets = getStorageItem('app:bingo_tickets:v1', []);
      const newTickets = Array.from({ length: count }, () => ({
        id: `tk-${Math.random().toString(36).substr(2, 9)}`,
        drawId, userId: user.id, userName: user.nome || 'Usuário',
        terminalId: user.terminal, ticketNumbers: [[]],
        status: 'active', amountPaid: price, createdAt: new Date().toISOString(), bancaId: user.bancaId || 'default'
      }));
      setStorageItem('app:bingo_tickets:v1', [...tickets, ...newTickets]);
      notifyDataChange();
      return true;
    }
    return false;
  };

  const registerCambistaMovement = (data: { tipo: string, valor: number, modulo?: string, observacao?: string }) => {
    if (!user) return;
    
    let ledgerType: any = 'CASH_IN';
    if (data.tipo === 'RECOLHE') ledgerType = 'CASH_OUT_RECOLHE';
    if (data.tipo === 'FECHAMENTO_CAIXA') ledgerType = 'CASH_CLOSE';

    LedgerService.addEntry({
      bancaId: user.bancaId || 'default',
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: data.modulo || 'Caixa',
      type: ledgerType,
      amount: data.tipo === 'RECOLHE' ? -data.valor : data.valor,
      balanceBefore: user.saldo + user.bonus,
      balanceAfter: user.saldo + user.bonus,
      referenceId: `cash-${Date.now()}`,
      description: data.observacao || data.tipo
    });
    
    notifyDataChange();
  };

  return (
    <AppContext.Provider value={{
      user, isLoading, 
      balance: user?.saldo || 0, 
      bonus: user?.bonus || 0, 
      terminal: user?.terminal || '',
      ledger, dashboardTotals, apostas, bingoDraws, bingoTickets, jdbLoterias, genericLotteryConfigs,
      banners, popups, news,
      isFullscreen, toggleFullscreen,
      refreshData, logout,
      betSlip,
      addBetToSlip: (b) => setBetSlip(prev => [...prev.filter(i => i.matchId !== b.matchId), b]),
      removeBetFromSlip: (id) => setBetSlip(prev => prev.filter(i => i.id !== id)),
      clearBetSlip: () => setBetSlip([]),
      placeFootballBet,
      handleFinalizarAposta,
      buyBingoTickets,
      registerCambistaMovement,
      addBanner, updateBanner, deleteBanner,
      addPopup, updatePopup, deletePopup,
      addNews, updateNews, deleteNews,
      footballData: { unifiedMatches: [], leagues: [], syncStatus: 'idle' }
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
