/**
 * @fileOverview Agregador financeiro inteligente baseado no Ledger e Apostas.
 * Suporta filtragem por Tenant (Banca) e processa todos os tipos de usuários.
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
    snookerBets: any[];
    footballBets: any[];
    userCommissions: any[];
    users: any[];
    ledger: LedgerEntry[];
  },
  filter: { mode: 'GLOBAL' | 'BANCA', bancaId: string | null }
): DashboardTotals {
  const { mode, bancaId } = filter;

  // 1. Filtrar Ledger pelo Tenant (Banca)
  const filteredLedger = mode === 'GLOBAL' 
    ? (data.ledger || [])
    : (data.ledger || []).filter(e => e.bancaId === bancaId);

  // 2. Filtrar Usuários pelo Tenant
  const filteredUsers = mode === 'GLOBAL'
    ? (data.users || [])
    : (data.users || []).filter(u => u.bancaId === bancaId);

  // Agregações via Ledger (Fonte da Verdade Financeira)
  // BET_PLACED representa o volume de vendas, independente se foi Cambista ou Usuário.
  const totalApostado = filteredLedger
    .filter(e => e.type === 'BET_PLACED')
    .reduce((acc, e) => acc + Math.abs(e.amount), 0);

  // Prêmios Pagos (Soma de BET_WIN do sistema ou PRIZE_PAID manual)
  const totalPremios = filteredLedger
    .filter(e => e.type === 'BET_WIN' || e.type === 'PRIZE_PAID')
    .reduce((acc, e) => acc + e.amount, 0);

  // Comissões Geradas
  const totalComissoes = filteredLedger
    .filter(e => e.type === 'COMMISSION_EARNED')
    .reduce((acc, e) => acc + e.amount, 0);

  // Volume enviado para descarga (Risco transferido)
  const volumeDescarga = filteredLedger
    .filter(e => e.type === 'DESCARGA')
    .reduce((acc, e) => acc + e.amount, 0);

  // Saldo atual dos usuários no escopo
  const saldoUsuarios = filteredUsers.reduce((acc, u) => acc + (u.saldo || 0), 0);
  const saldoBonus = filteredUsers.reduce((acc, u) => acc + (u.bonus || 0), 0);

  // Cálculo de Lucro Operacional da Banca
  // Lucro = Vendas - Saídas (Prêmios e Comissões)
  const lucroBanca = totalApostado - totalPremios - totalComissoes;

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
