/**
 * @fileOverview Regras de negócio centralizadas para elegibilidade de apostas na Sinuca.
 */

import { SnookerChannel } from "@/context/AppContext";

export interface SnookerMarketState {
  isBettable: boolean;
  label: string;
  reason: string | null;
  color: string;
}

/**
 * Determina se um canal de sinuca está apto para receber apostas no momento.
 */
export function getSnookerMarketState(channel: SnookerChannel | undefined): SnookerMarketState {
  if (!channel) {
    return { isBettable: false, label: 'Indisponível', reason: 'Canal não encontrado', color: 'text-slate-500' };
  }

  const now = new Date();
  const isLive = channel.visibilityStatus === 'live';
  const isUpcoming = channel.visibilityStatus === 'upcoming';
  const isExpired = channel.visibilityStatus === 'expired' || channel.status === 'finished' || channel.status === 'cancelled';

  // 1. Bloqueios Críticos
  if (!channel.enabled) {
    return { isBettable: false, label: 'Desativado', reason: 'Canal desativado pelo administrador', color: 'text-red-500' };
  }
  if (channel.sourceStatus === 'error') {
    return { isBettable: false, label: 'Erro de Vídeo', reason: 'Fonte de transmissão com erro', color: 'text-red-500' };
  }
  if (isExpired) {
    return { isBettable: false, label: 'Mercado Fechado', reason: 'Evento encerrado', color: 'text-slate-500' };
  }

  // 2. Validação de Disponibilidade de Aposta (BettingAvailability)
  const availability = channel.bettingAvailability || 'all';
  
  if (isUpcoming && availability === 'live_only') {
    return { isBettable: false, label: 'Aguardando Live', reason: 'Apostas liberadas apenas durante a live', color: 'text-amber-500' };
  }
  if (isLive && availability === 'prelive') {
    return { isBettable: false, label: 'Live Bloqueada', reason: 'Apostas permitidas apenas no pré-jogo', color: 'text-amber-500' };
  }
  if (availability === 'disabled') {
    return { isBettable: false, label: 'Mercado Suspenso', reason: 'Apostas desativadas para este jogo', color: 'text-red-500' };
  }

  // 3. Validação de Janela Temporal
  if (channel.bettingOpensAt) {
    const opensAt = new Date(channel.bettingOpensAt);
    if (now < opensAt) {
      return { isBettable: false, label: 'Em Breve', reason: `Apostas abrem em ${opensAt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`, color: 'text-blue-400' };
    }
  }

  if (channel.bettingClosesAt) {
    const closesAt = new Date(channel.bettingClosesAt);
    if (now > closesAt) {
      return { isBettable: false, label: 'Encerrado', reason: 'Horário limite de apostas atingido', color: 'text-slate-500' };
    }
  }

  // 4. Estados de Sucesso
  if (isLive) {
    return { isBettable: true, label: 'Live Aberta', reason: 'Apostas ao vivo disponíveis', color: 'text-green-500' };
  }
  
  if (isUpcoming) {
    return { isBettable: true, label: 'Mercado Aberto', reason: 'Apostas antecipadas disponíveis', color: 'text-blue-400' };
  }

  return { isBettable: false, label: 'Fechado', reason: 'Aguardando definição de mercado', color: 'text-slate-500' };
}
