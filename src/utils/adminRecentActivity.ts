/**
 * @fileOverview Utilitário para agregação e normalização de atividade recente (Apostas e Prêmios).
 * Consolida dados de múltiplas fontes para exibição no dashboard administrativo.
 */

import { Aposta, BingoTicket, SnookerBet, BingoDraw } from '@/context/AppContext';
import { User, getUsers } from './usersStorage';

export interface UnifiedActivity {
  id: string;
  at: string;
  tipoUsuario: "USUARIO" | "PROMOTOR" | "CAMBISTA" | "ADMIN" | "SUPER_ADMIN";
  terminal: string;
  nome: string;
  modulo: string;
  descricao: string;
  valor: number;
  status?: string;
  bancaId?: string;
  isDescarga?: boolean;
}

const parseBRL = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
};

/**
 * Retorna as últimas 10 apostas de todo o sistema filtradas por contexto.
 */
export function getRecentBets(
  data: {
    apostas: Aposta[];
    bingoTickets: BingoTicket[];
    snookerBets: SnookerBet[];
  },
  filter: { mode: 'GLOBAL' | 'BANCA'; bancaId: string | null }
): UnifiedActivity[] {
  const users = getUsers();
  const { mode, bancaId } = filter;

  const combined: UnifiedActivity[] = [];

  // 1. Normalizar Loterias
  (data.apostas || []).forEach(a => {
    if (mode === 'BANCA' && a.bancaId !== bancaId) return;
    const user = users.find(u => u.id === a.userId);
    
    const hasDescarga = a.isDescarga || (Array.isArray(a.detalhes) && a.detalhes.some((d: any) => d.isDescarga));

    combined.push({
      id: a.id,
      at: a.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: a.loteria,
      descricao: a.numeros.length > 30 ? a.numeros.substring(0, 27) + '...' : a.numeros,
      valor: parseBRL(a.valor),
      bancaId: a.bancaId,
      isDescarga: hasDescarga
    });
  });

  // 2. Normalizar Bingo
  (data.bingoTickets || []).forEach(t => {
    if (mode === 'BANCA' && t.bancaId !== bancaId) return;
    const user = users.find(u => u.id === t.userId);
    combined.push({
      id: t.id,
      at: t.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: t.terminalId,
      nome: t.userName,
      modulo: "BINGO",
      descricao: `Ticket p/ Sorteio #${t.drawId.substring(0, 6)}`,
      valor: t.amountPaid,
      bancaId: t.bancaId,
      isDescarga: false
    });
  });

  // 3. Normalizar Sinuca
  (data.snookerBets || []).forEach(b => {
    if (mode === 'BANCA' && bancaId !== 'default') return;
    const user = users.find(u => u.id === b.userId);
    combined.push({
      id: b.id,
      at: b.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: b.userName,
      modulo: "SINUCA",
      descricao: `Aposta em ${b.pick}`,
      valor: b.amount,
      bancaId: 'default',
      isDescarga: false
    });
  });

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}

/**
 * Retorna os últimos 10 prêmios pagos no sistema filtrados por contexto.
 */
export function getRecentPayouts(
  data: {
    apostas: Aposta[];
    bingoDraws: BingoDraw[];
    snookerBets: SnookerBet[];
  },
  filter: { mode: 'GLOBAL' | 'BANCA'; bancaId: string | null }
): UnifiedActivity[] {
  const users = getUsers();
  const { mode, bancaId } = filter;

  const combined: UnifiedActivity[] = [];

  // 1. Prêmios Loterias
  (data.apostas || []).filter(a => a.status === 'premiado' || a.status === 'won').forEach(a => {
    if (mode === 'BANCA' && a.bancaId !== bancaId) return;
    const user = users.find(u => u.id === a.userId);
    const details = Array.isArray(a.detalhes) ? a.detalhes : [a.detalhes];
    
    const assumedPrize = details.reduce((sum: number, d: any) => {
      if (mode === 'BANCA' && d.isDescarga) return sum;
      return sum + (d.retornoPossivel || 0);
    }, 0);

    const hasDescarga = details.some((d: any) => d?.isDescarga);

    combined.push({
      id: `pay-lot-${a.id}`,
      at: a.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: a.loteria,
      descricao: "Prêmio Loteria",
      valor: assumedPrize,
      bancaId: a.bancaId,
      isDescarga: hasDescarga
    });
  });

  // 2. Prêmios Bingo
  (data.bingoDraws || []).filter(d => d.status === 'finished').forEach(draw => {
    if (mode === 'BANCA' && draw.bancaId !== bancaId) return;
    
    Object.values(draw.winnersFound || {}).forEach(winner => {
      if (winner && winner.type === 'USER_WIN') {
        const user = users.find(u => u.id === winner.userId);
        combined.push({
          id: `pay-bin-${draw.id}-${winner.category}`,
          at: winner.wonAt || draw.finishedAt || draw.updatedAt,
          tipoUsuario: user?.tipoUsuario || "USUARIO",
          terminal: winner.terminalId,
          nome: winner.userName,
          modulo: "BINGO",
          descricao: `Prêmio ${winner.category.toUpperCase()}`,
          valor: winner.winAmount,
          bancaId: draw.bancaId,
          isDescarga: false
        });
      }
    });
  });

  // 3. Prêmios Sinuca
  (data.snookerBets || []).filter(b => b.status === 'won').forEach(b => {
    if (mode === 'BANCA' && bancaId !== 'default') return;
    const user = users.find(u => u.id === b.userId);
    const oddsMap = { A: b.oddsA, B: b.oddsB, EMPATE: b.oddsD };
    const winAmount = b.amount * (oddsMap[b.pick] || 1);

    combined.push({
      id: `pay-sno-${b.id}`,
      at: b.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: b.userName,
      modulo: "SINUCA",
      descricao: "Prêmio Sinuca",
      valor: winAmount,
      bancaId: 'default',
      isDescarga: false
    });
  });

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}