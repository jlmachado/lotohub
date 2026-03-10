/**
 * @fileOverview Normalizador de registros para exibição em tabelas de relatórios.
 * Consolida dados de Loterias, Bingo e Sinuca em formatos comuns.
 */

import { Aposta, BingoTicket, BingoDraw, SnookerBet, SnookerFinancialSummary, FootballBet } from '@/context/AppContext';

export interface NormalizedRecord {
  id: string;
  at: string;
  terminal: string;
  nome: string;
  modulo: string;
  descricao: string;
  valor: number;
  extra?: any;
  bancaId?: string;
  status?: string;
}

export function normalizeBets(
  lottery: Aposta[],
  bingo: BingoTicket[],
  snooker: SnookerBet[],
  football: FootballBet[] = []
): NormalizedRecord[] {
  const lot = lottery.map(a => ({
    id: a.id,
    at: a.createdAt || new Date().toISOString(),
    terminal: '-', 
    nome: 'Usuário',
    modulo: 'LOTERIA',
    descricao: a.loteria,
    valor: parseFloat(String(a.valor || '0').replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0,
    bancaId: a.bancaId
  }));

  const bin = bingo.map(t => ({
    id: t.id,
    at: t.createdAt,
    terminal: t.terminalId,
    nome: t.userName,
    modulo: 'BINGO',
    descricao: `Sorteio #${t.drawId.substring(0,5)}`,
    valor: t.amountPaid,
    bancaId: t.bancaId
  }));

  const sno = snooker.map(b => ({
    id: b.id,
    at: b.createdAt,
    terminal: '-',
    nome: b.userName,
    modulo: 'SINUCA',
    descricao: `Aposta em ${b.pick}`,
    valor: b.amount,
    bancaId: 'default'
  }));

  const foot = football.map(b => ({
    id: b.id,
    at: b.createdAt,
    terminal: b.terminal || '-',
    nome: 'Usuário',
    modulo: 'FUTEBOL',
    descricao: b.items.map(i => i.matchName).join(' | '),
    valor: b.stake,
    bancaId: b.bancaId,
    status: b.status
  }));

  return [...lot, ...bin, ...sno, ...foot].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function normalizePayouts(
  lottery: Aposta[],
  bingo: BingoDraw[],
  snooker: SnookerFinancialSummary[],
  football: FootballBet[] = []
): NormalizedRecord[] {
  // Loterias Premiadas
  const lot = lottery.filter(a => a.status === 'premiado' || a.status === 'won').map(a => {
    const winAmount = Array.isArray(a.detalhes) 
      ? a.detalhes.reduce((acc: number, d: any) => acc + (d.retornoPossivel || 0), 0)
      : 0;
    return {
      id: `p-lot-${a.id}`,
      at: a.createdAt,
      terminal: '-',
      nome: 'Usuário',
      modulo: 'LOTERIA',
      descricao: a.loteria,
      valor: winAmount,
      bancaId: a.bancaId
    };
  });

  // Bingo
  const bin: NormalizedRecord[] = [];
  bingo.forEach(draw => {
    Object.values(draw.winnersFound).forEach(winner => {
      if (winner && winner.type === 'USER_WIN') {
        bin.push({
          id: `p-bin-${draw.id}-${winner.category}`,
          at: winner.wonAt || draw.finishedAt || draw.updatedAt,
          terminal: winner.terminalId,
          nome: winner.userName,
          modulo: 'BINGO',
          descricao: `Prêmio ${winner.category.toUpperCase()}`,
          valor: winner.winAmount,
          bancaId: draw.bancaId
        });
      }
    });
  });

  // Sinuca
  const sno = snooker.map(h => ({
    id: `p-sno-${h.id}`,
    at: h.settledAt,
    terminal: 'GLOBAL',
    nome: 'Vários',
    modulo: 'SINUCA',
    descricao: h.channelTitle,
    valor: h.totalPayout,
    bancaId: 'default'
  }));

  // Futebol
  const foot = football.filter(b => b.status === 'WON').map(b => ({
    id: `p-foot-${b.id}`,
    at: b.createdAt,
    terminal: b.terminal || '-',
    nome: 'Usuário',
    modulo: 'FUTEBOL',
    descricao: 'Prêmio Futebol',
    valor: b.potentialWin,
    bancaId: b.bancaId
  }));

  return [...lot, ...bin, ...sno, ...foot].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
