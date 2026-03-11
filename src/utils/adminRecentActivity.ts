/**
 * @fileOverview Agregador de atividade recente atualizado para ESPN.
 */

import { Aposta, BingoTicket, SnookerBet, BingoDraw, FootballBet } from '@/context/AppContext';
import { User } from './usersStorage';

export interface UnifiedActivity {
  id: string;
  at: string;
  tipoUsuario: string;
  terminal: string;
  nome: string;
  modulo: string;
  descricao: string;
  valor: number;
  bancaId?: string;
  isDescarga?: boolean;
}

const parseBRL = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
};

export function getRecentBets(
  data: {
    apostas: Aposta[];
    bingoTickets: BingoTicket[];
    snookerBets: SnookerBet[];
    footballBets?: FootballBet[];
  },
  filter: { mode: 'GLOBAL' | 'BANCA'; bancaId: string | null },
  users: User[]
): UnifiedActivity[] {
  const { mode, bancaId } = filter;
  const combined: UnifiedActivity[] = [];

  // Loterias
  (data.apostas || []).forEach(a => {
    if (mode === 'BANCA' && a.bancaId !== bancaId) return;
    const user = users.find(u => u.id === a.userId);
    combined.push({
      id: a.id,
      at: a.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: a.loteria,
      descricao: a.numeros,
      valor: parseBRL(a.valor),
      bancaId: a.bancaId
    });
  });

  // Futebol
  (data.footballBets || []).forEach(b => {
    if (mode === 'BANCA' && b.bancaId !== bancaId) return;
    const user = users.find(u => u.id === b.userId);
    combined.push({
      id: b.id,
      at: b.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: 'Futebol',
      descricao: b.items.map(i => i.matchName).join(' | '),
      valor: b.stake,
      bancaId: b.bancaId,
      isDescarga: b.isDescarga
    });
  });

  // Bingo
  (data.bingoTickets || []).forEach(t => {
    if (mode === 'BANCA' && t.bancaId !== bancaId) return;
    combined.push({
      id: t.id,
      at: t.createdAt,
      tipoUsuario: "USUARIO", // Bingo ticket simplified
      terminal: t.terminalId,
      nome: t.userName,
      modulo: 'Bingo',
      descricao: `Sorteio #${t.drawId.substring(0,8)}`,
      valor: t.amountPaid,
      bancaId: t.bancaId
    });
  });

  // Sinuca
  (data.snookerBets || []).forEach(b => {
    // Snooker assumes global or default banca for now
    combined.push({
      id: b.id,
      at: b.createdAt,
      tipoUsuario: "USUARIO",
      terminal: "-",
      nome: b.userName,
      modulo: 'Sinuca',
      descricao: `Aposta em ${b.pick}`,
      valor: b.amount,
      bancaId: 'default'
    });
  });

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}

export function getRecentPayouts(
  data: {
    apostas: Aposta[];
    bingoDraws: BingoDraw[];
    snookerBets: SnookerBet[];
    footballBets?: FootballBet[];
  },
  filter: { mode: 'GLOBAL' | 'BANCA'; bancaId: string | null },
  users: User[]
): UnifiedActivity[] {
  const { mode, bancaId } = filter;
  const combined: UnifiedActivity[] = [];

  // Loterias
  (data.apostas || []).filter(a => a.status === 'premiado' || a.status === 'won').forEach(a => {
    if (mode === 'BANCA' && a.bancaId !== bancaId) return;
    const user = users.find(u => u.id === a.userId);
    const details = Array.isArray(a.detalhes) ? a.detalhes : [a.detalhes];
    const prize = details.reduce((sum: number, d: any) => sum + (d.retornoPossivel || 0), 0);

    combined.push({
      id: `pay-lot-${a.id}`,
      at: a.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: a.loteria,
      descricao: "Prêmio Loteria",
      valor: prize,
      bancaId: a.bancaId
    });
  });

  // Futebol
  (data.footballBets || []).filter(b => b.status === 'WON').forEach(b => {
    if (mode === 'BANCA' && b.bancaId !== bancaId) return;
    const user = users.find(u => u.id === b.userId);
    combined.push({
      id: `pay-fb-${b.id}`,
      at: b.createdAt,
      tipoUsuario: user?.tipoUsuario || "USUARIO",
      terminal: user?.terminal || "-",
      nome: user?.nome || "Usuário",
      modulo: 'Futebol',
      descricao: "Prêmio Futebol",
      valor: b.potentialWin,
      bancaId: b.bancaId,
      isDescarga: b.isDescarga
    });
  });

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}
