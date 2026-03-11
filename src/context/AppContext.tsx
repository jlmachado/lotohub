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
  jdbLoterias: any[];
  genericLotteryConfigs: any[];
  isFullscreen: boolean;
  
  refreshData: () => void;
  logout: () => void;
  toggleFullscreen: () => void;
  placeFootballBet: (stake: number) => Promise<string | null>;
  buyBingoTickets: (drawId: string, count: number) => boolean;
  handleFinalizarAposta: (aposta: any, totalValue: number) => string | null;
  registerCambistaMovement: (data: any) => void;
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
  const [jdbLoterias, setJdbLoterias] = useState<any[]>([]);
  const [genericLotteryConfigs, setGenericLotteryConfigs] = useState<any[]>([]);
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
    setJdbLoterias(getStorageItem('jogo_bicho:loterias:v1', INITIAL_JDB_LOTERIAS));
    setGenericLotteryConfigs(getStorageItem('app:generic_lotteries:v1', INITIAL_GENERIC_LOTTERIES));

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
      balanceAfter: user.saldo + user.bonus, // Movimentação de caixa física não altera saldo virtual no protótipo
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
      ledger, dashboardTotals, apostas, bingoDraws, jdbLoterias, genericLotteryConfigs,
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
