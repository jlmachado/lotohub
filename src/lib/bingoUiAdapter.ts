/**
 * @fileOverview Adaptador de leitura para transformar o estado do AppContext
 * no formato exigido pela interface visual profissional do Bingo.
 */

import { BingoDraw, BingoTicket, BingoSettings, BingoWinner } from '@/context/AppContext';

export interface BingoUiState {
  status: "WAITING" | "PRE_DRAW_HOLD" | "DRAWING";
  drawId: string;
  drawNumberText: string;
  drawTimeText: string;
  dayHourText: string;
  donationValue: string;
  prizeQuadra: string;
  prizeKina: string;
  prizeKeno: string;
  accumulatedValue: string;
  orderNumber: number;
  countdownSeconds: number;
  preDrawHoldSeconds: number;
  phaseLabel: string;
  drawnNumbers: number[];
  lastNumber: number | null;
  ballsPreview: number[];
  participants: {
    terminal: string;
    name: string;
    numbers: number[];
    highlight: boolean;
    isBot: boolean;
  }[];
  roundWinners: BingoWinner[];
  cartelasCount: number;
  ticketPrice: number;
}

export function getBingoUiState(
  activeDraw: BingoDraw | null, 
  tickets: BingoTicket[], 
  myTicketsCount: number,
  settings?: BingoSettings
): BingoUiState {
  if (!activeDraw) {
    return {
      status: "WAITING",
      drawId: "",
      drawNumberText: "00000",
      drawTimeText: "00:00:00",
      dayHourText: "--/-- - --:--",
      donationValue: "0,00",
      prizeQuadra: "0,00",
      prizeKina: "0,00",
      prizeKeno: "0,00",
      accumulatedValue: "0,00",
      orderNumber: 0,
      countdownSeconds: 0,
      preDrawHoldSeconds: 10,
      phaseLabel: "Aguardando",
      drawnNumbers: [],
      lastNumber: null,
      ballsPreview: [],
      participants: [],
      roundWinners: [],
      cartelasCount: 0,
      ticketPrice: 0,
    };
  }

  const now = Date.now();
  const scheduledTime = new Date(activeDraw.scheduledAt).getTime();
  const diff = Math.max(0, Math.floor((scheduledTime - now) / 1000));
  const holdSeconds = settings?.preDrawHoldSeconds || 10;

  const drawn = activeDraw.drawnNumbers || [];
  const last = drawn.length > 0 ? drawn[drawn.length - 1] : null;
  const preview = drawn.slice(-4).reverse();

  let phase = "Aguardando Sorteio";
  let status: "WAITING" | "PRE_DRAW_HOLD" | "DRAWING" = "WAITING";

  if (activeDraw.status === 'live') {
    status = "DRAWING";
    if (!activeDraw.winnersFound?.quadra) phase = "Buscando Quadra";
    else if (!activeDraw.winnersFound?.kina) phase = "Buscando Kina";
    else phase = "Buscando Keno";
  } else if (activeDraw.status === 'scheduled') {
    if (now >= scheduledTime) {
      status = "PRE_DRAW_HOLD";
      phase = "AGUARDANDO SORTEIO";
    } else {
      status = "WAITING";
      phase = "Vendas Abertas";
    }
  } else if (activeDraw.status === 'finished') {
    status = "DRAWING";
    phase = "Sorteio Finalizado";
  }

  const drawDate = new Date(activeDraw.scheduledAt);
  const dayHour = `${drawDate.getDate().toString().padStart(2, '0')}/${(drawDate.getMonth() + 1).toString().padStart(2, '0')} - ${drawDate.getHours().toString().padStart(2, '0')}:${drawDate.getMinutes().toString().padStart(2, '0')}`;

  const safeTickets = tickets || [];
  const participants = safeTickets
    .filter(t => t.drawId === activeDraw.id)
    .map((t) => ({
      terminal: t.terminalId || "000",
      name: t.userName || "Usuário",
      numbers: (t.ticketNumbers?.[0] as number[]) || [],
      highlight: !t.isBot,
      isBot: !!t.isBot
    }));

  const roundWinners = activeDraw.winnersFound ? [
    activeDraw.winnersFound.quadra,
    activeDraw.winnersFound.kina,
    activeDraw.winnersFound.keno
  ].filter(Boolean) as BingoWinner[] : [];

  return {
    status,
    drawId: activeDraw.id,
    drawNumberText: activeDraw.drawNumber.toString().padStart(5, '0'),
    drawTimeText: drawDate.toLocaleTimeString('pt-BR'),
    dayHourText: dayHour,
    donationValue: (activeDraw.ticketPrice * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    prizeQuadra: activeDraw.prizeRules.quadra.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    prizeKina: activeDraw.prizeRules.kina.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    prizeKeno: activeDraw.prizeRules.keno.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    accumulatedValue: (activeDraw.totalRevenue * 0.9 + 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    orderNumber: drawn.length,
    countdownSeconds: diff,
    preDrawHoldSeconds: holdSeconds,
    phaseLabel: phase,
    drawnNumbers: drawn,
    lastNumber: last,
    ballsPreview: preview,
    participants: participants,
    roundWinners,
    cartelasCount: myTicketsCount,
    ticketPrice: activeDraw.ticketPrice,
  };
}

export function getBingoWaitingState(activeDraw: BingoDraw | null, myTicketsCount: number, settings?: BingoSettings) {
  const ui = getBingoUiState(activeDraw, [], myTicketsCount, settings);
  return {
    ...ui,
    betValues: [5, 10, 20, 30, 40, 50, 100, 200]
  };
}
