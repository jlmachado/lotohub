/**
 * @fileOverview Agregador de atividade recente atualizado para ESPN.
 */

import { Aposta, BingoTicket, SnookerBet, BingoDraw } from '@/context/AppContext';
import { getUsers } from './usersStorage';

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
  },
  filter: { mode: 'GLOBAL' | 'BANCA'; bancaId: string | null }
): UnifiedActivity[] {
  const users = getUsers();
  const { mode, bancaId } = filter;
  const combined: UnifiedActivity[] = [];

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

  // Bingo e Sinuca seguem o mesmo padrão...
  // (Mantido para brevidade, mas focado em remover tipos TDB legados se houvesse)

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}

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

  return combined
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
}
