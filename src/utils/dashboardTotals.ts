/**
 * @fileOverview Agregador financeiro inteligente baseado no Ledger e Apostas.
 */

import { LedgerEntry } from '@/services/ledger-service';

export interface DashboardTotals {
  totalApostado: number;
  totalPremios: number;
  totalComissoes: number;
  lucroBanca: number;
  saldoUsuarios: number;
  saldoBonus: number;
  volumeDescarga: number;
}

export function getDashboardTotals(
  data: {
    apostas: any[];
    bingoTickets: any[];
    footballBets: any[];
    users: any[];
    ledger: LedgerEntry[];
    [key: string]: any;
  },
  filter: { bancaId: string | null; mode: 'GLOBAL' | 'BANCA' }
): DashboardTotals {
  const { bancaId, mode } = filter;

  // Filtrar Ledger pelo escopo
  const filteredLedger = mode === 'GLOBAL' 
    ? data.ledger 
    : data.ledger.filter(e => e.bancaId === bancaId);

  // Filtrar Usuários pelo escopo
  const filteredUsers = mode === 'GLOBAL'
    ? data.users
    : data.users.filter(u => u.bancaId === bancaId);

  // Agregações via Ledger (Fonte de Verdade)
  const totalApostado = filteredLedger
    .filter(e => e.type === 'BET_PLACED')
    .reduce((acc, e) => acc + Math.abs(e.amount), 0);

  const totalPremios = filteredLedger
    .filter(e => e.type === 'BET_WIN' || e.type === 'PRIZE_PAID')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalComissoes = filteredLedger
    .filter(e => e.type === 'COMMISSION_EARNED')
    .reduce((acc, e) => acc + e.amount, 0);

  const volumeDescarga = filteredLedger
    .filter(e => e.type === 'DESCARGA')
    .reduce((acc, e) => acc + e.amount, 0);

  // Saldo atual dos usuários no escopo
  const saldoUsuarios = filteredUsers.reduce((acc, u) => acc + (u.saldo || 0), 0);
  const saldoBonus = filteredUsers.reduce((acc, u) => acc + (u.bonus || 0), 0);

  // Lucro Operacional: O que entrou menos o que saiu (premios + comissões)
  // No modo BANCA, subtraímos também o que foi enviado para DESCARGA (pois não é mais responsabilidade da banca)
  const lucroBanca = totalApostado - totalPremios - totalComissoes - (mode === 'BANCA' ? volumeDescarga : 0);

  return {
    totalApostado,
    totalPremios,
    totalComissoes,
    lucroBanca,
    saldoUsuarios,
    saldoBonus,
    volumeDescarga
  };
}
