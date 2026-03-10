/**
 * @fileOverview Utilitário de agregação financeira robusto e filtrado por contexto.
 * Consolida dados de Loterias, Bingo e Sinuca para todos os tipos de usuários.
 */

import { Aposta, BingoDraw, BingoTicket, SnookerBet, SnookerFinancialSummary, UserCommission, FootballBet } from '@/context/AppContext';
import { User } from './usersStorage';

export interface DashboardTotals {
  totalApostado: number;
  totalPremios: number;
  totalComissoes: number;
  lucroBanca: number;
  saldoUsuarios: number;
  saldoBonus: number;
}

/**
 * Converte valores em string (R$ 0,00) ou number para float puro.
 */
const parseCurrency = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
};

export function getDashboardTotals(
  data: {
    apostas: Aposta[];
    bingoTickets: BingoTicket[];
    bingoDraws: BingoDraw[];
    snookerBets: SnookerBet[];
    snookerFinancialHistory: SnookerFinancialSummary[];
    footballBets?: FootballBet[];
    userCommissions: UserCommission[];
    users: User[];
  },
  filter: { bancaId: string | null; mode: 'GLOBAL' | 'BANCA' }
): DashboardTotals {
  const { bancaId, mode } = filter;

  // Helper para filtrar por banca de forma segura
  const filterByBanca = <T extends { bancaId?: string }>(arr: T[]) => {
    if (!arr) return [];
    if (mode === 'GLOBAL' || !bancaId) return arr;
    return arr.filter(item => item.bancaId === bancaId);
  };

  // 1. Filtragem Inicial por Contexto
  const fApostasRaw = filterByBanca(data.apostas);
  const fBingoTickets = filterByBanca(data.bingoTickets);
  const fBingoDraws = filterByBanca(data.bingoDraws);
  const fFootballBets = filterByBanca(data.footballBets || []);
  const fSnookerBets = data.snookerBets || []; // Snooker ainda não tem bancaId, assume-se global
  const fSnookerHistory = data.snookerFinancialHistory || [];
  const fUsers = filterByBanca(data.users);
  
  // Commissions precisam ser filtradas pelo usuário que pertence àquela banca
  const validUserIds = new Set(fUsers.map(u => u.id));
  const fCommissions = (data.userCommissions || []).filter(c => validUserIds.has(c.userId));

  // 2. Cálculo: TOTAL APOSTADO (Respeitando Descarga por Item)
  const betLoterias = fApostasRaw.reduce((acc, a) => {
    if (mode === 'GLOBAL') return acc + parseCurrency(a.valor);
    const details = Array.isArray(a.detalhes) ? a.detalhes : [a.detalhes];
    const bancaAssumedValue = details.reduce((sum, item) => {
      if (item && !item.isDescarga) {
        const v = typeof item.valor === 'string' ? parseFloat(item.valor.replace(',', '.')) : (item.valor || 0);
        return sum + v;
      }
      return sum;
    }, 0);
    return acc + bancaAssumedValue;
  }, 0);

  const betFootball = fFootballBets.reduce((acc, b) => {
    if (mode === 'GLOBAL') return acc + b.stake;
    return acc + (b.isDescarga ? 0 : b.stake);
  }, 0);

  const betBingo = fBingoTickets.filter(t => t.status !== 'refunded').reduce((acc, t) => acc + t.amountPaid, 0);
  const betSnooker = fSnookerBets.filter(b => b.status !== 'refunded').reduce((acc, b) => acc + b.amount, 0);
  
  const totalApostado = betLoterias + betFootball + betBingo + betSnooker;

  // 3. Cálculo: TOTAL PRÊMIOS (Respeitando Descarga por Item)
  const prizesBingo = fBingoDraws.reduce((acc, d) => acc + (d.payoutTotal || 0), 0);
  const prizesSnooker = fSnookerHistory.reduce((acc, h) => acc + (h.totalPayout || 0), 0);
  
  const prizesLoterias = fApostasRaw.filter(a => a.status === 'premiado' || a.status === 'won').reduce((acc, a) => {
    const details = Array.isArray(a.detalhes) ? a.detalhes : [a.detalhes];
    const assumedPrize = details.reduce((sum: number, item: any) => {
      if (mode === 'BANCA' && item.isDescarga) return sum;
      return sum + (item.retornoPossivel || 0);
    }, 0);
    return acc + assumedPrize;
  }, 0);

  const prizesFootball = fFootballBets.filter(b => b.status === 'WON').reduce((acc, b) => {
    if (mode === 'BANCA' && b.isDescarga) return acc;
    return acc + b.potentialWin;
  }, 0);

  const totalPremios = prizesBingo + prizesSnooker + prizesLoterias + prizesFootball;

  // 4. Cálculo: TOTAL COMISSÕES (Ganhos de Promotores e Cambistas)
  const totalComissoes = fCommissions.reduce((acc, c) => acc + c.valorComissao, 0);

  // 5. Cálculo: LUCRO DA BANCA (Operacional)
  const lucroBanca = totalApostado - totalPremios - totalComissoes;

  // 6. Saldos Atuais (Snapshot)
  const saldoUsuarios = fUsers.reduce((acc, u) => acc + (u.saldo || 0), 0);
  const saldoBonus = fUsers.reduce((acc, u) => acc + (u.bonus || 0), 0);

  return {
    totalApostado,
    totalPremios,
    totalComissoes,
    lucroBanca,
    saldoUsuarios,
    saldoBonus,
  };
}
