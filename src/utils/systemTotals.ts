/**
 * @fileOverview Utilitário de agregação financeira global (Somente Leitura).
 * Consolida dados de todas as fontes do sistema para gerar KPIs administrativos.
 */

import { Aposta, BingoDraw, BingoTicket, SnookerBet, SnookerFinancialSummary } from '@/context/AppContext';

export interface SystemTotals {
  totalApostado: number;
  saldoUsuarios: number;
  saldoBonus: number;
  totalComissoes: number;
  totalPremios: number;
  lucroBanca: number;
}

const parseBRL = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
};

export function calculateSystemTotals(data: {
  apostas: Aposta[];
  bingoTickets: BingoTicket[];
  bingoDraws: BingoDraw[];
  snookerBets: SnookerBet[];
  snookerFinancialHistory: SnookerFinancialSummary[];
  balance: number;
  bonus: number;
}): SystemTotals {
  // 1. Total Apostado
  const betLoterias = (data.apostas || []).reduce((acc, a) => acc + parseBRL(a.valor), 0);
  const betBingo = (data.bingoTickets || []).filter(t => t.status !== 'refunded').reduce((acc, t) => acc + t.amountPaid, 0);
  const betSnooker = (data.snookerBets || []).filter(b => b.status !== 'refunded').reduce((acc, b) => acc + b.amount, 0);
  const totalApostado = betLoterias + betBingo + betSnooker;

  // 2. Total Prêmios
  const prizesBingo = (data.bingoDraws || []).reduce((acc, d) => acc + (d.payoutTotal || 0), 0);
  const prizesSnooker = (data.snookerFinancialHistory || []).reduce((acc, h) => acc + (h.totalPayout || 0), 0);
  
  const prizesLoterias = (data.apostas || []).filter(a => a.status === 'premiado').reduce((acc, a) => {
    const detailsPrize = Array.isArray(a.detalhes) 
      ? a.detalhes.reduce((sum: number, item: any) => sum + (item.retornoPossivel || 0), 0)
      : 0;
    return acc + (detailsPrize || (parseBRL(a.valor) * 10)); 
  }, 0);
  
  const totalPremios = prizesBingo + prizesSnooker + prizesLoterias;

  // 3. Total Comissões (Bancas/House Share)
  const commBingo = (data.bingoDraws || []).reduce((acc, d) => acc + (d.totalRevenue * (d.housePercent / 100)), 0);
  const commSnooker = (data.snookerFinancialHistory || []).reduce((acc, h) => acc + Math.max(0, h.houseProfit), 0);
  
  const totalComissoes = commBingo + commSnooker;

  // 4. Lucro da Banca (Operacional)
  const lucroBanca = totalApostado - totalPremios - totalComissoes;

  return {
    totalApostado,
    totalPremios,
    totalComissoes,
    lucroBanca,
    saldoUsuarios: data.balance || 0,
    saldoBonus: data.bonus || 0,
  };
}