/**
 * @fileOverview Regras de negócio centralizadas para elegibilidade de apostas na Sinuca.
 * Refinado para suportar transição de status baseada no tempo e regras de pré-live.
 */

import { SnookerChannel } from "@/context/AppContext";

export interface SnookerMarketState {
  isBettable: boolean;
  label: string;
  reason: string | null;
  color: string;
  status: SnookerChannel['status'];
}

/**
 * Resolve o status operacional do canal baseado no horário atual e metadados.
 */
export function resolveSnookerChannelStatus(channel: SnookerChannel, now: Date = new Date()): SnookerChannel['status'] {
  if (channel.status === 'finished' || channel.status === 'cancelled') {
    return channel.status;
  }

  const scheduledTime = new Date(channel.scheduledAt || channel.createdAt).getTime();
  const currentTime = now.getTime();
  const diffMinutes = (scheduledTime - currentTime) / (1000 * 60);

  // Se já passou do horário e não está finalizado, é LIVE
  if (currentTime >= scheduledTime) {
    return 'live';
  }

  // Se falta pouco (ex: 30 min), está IMINENTE
  if (diffMinutes <= 30 && diffMinutes > 0) {
    return 'imminent';
  }

  return 'scheduled';
}

/**
 * Determina se um canal de sinuca está apto para receber apostas no momento.
 */
export function getSnookerMarketState(channel: SnookerChannel | undefined, now: Date = new Date()): SnookerMarketState {
  if (!channel) {
    return { isBettable: false, label: 'Indisponível', reason: 'Canal não encontrado', color: 'text-slate-500', status: 'scheduled' };
  }

  // Resolve status dinâmico baseado no tempo
  const currentStatus = resolveSnookerChannelStatus(channel, now);
  const isLive = currentStatus === 'live' || channel.status === 'live';
  const isFinished = currentStatus === 'finished' || currentStatus === 'cancelled';

  // 1. Bloqueios Críticos
  if (!channel.enabled) {
    return { isBettable: false, label: 'Desativado', reason: 'Canal desativado', color: 'text-red-500', status: currentStatus };
  }
  if (channel.isArchived) {
    return { isBettable: false, label: 'Arquivado', reason: 'Evento arquivado', color: 'text-slate-500', status: currentStatus };
  }
  if (isFinished) {
    return { isBettable: false, label: 'Encerrado', reason: 'Evento finalizado', color: 'text-slate-500', status: currentStatus };
  }

  // 2. Validação de Janela Temporal de Aposta
  const bettingAvailability = channel.bettingAvailability || 'all';
  
  // Regra de abertura
  if (channel.bettingOpensAt) {
    const opensAt = new Date(channel.bettingOpensAt);
    if (now < opensAt) {
      return { 
        isBettable: false, 
        label: 'Em Breve', 
        reason: `Apostas abrem às ${opensAt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`, 
        color: 'text-blue-400',
        status: currentStatus
      };
    }
  }

  // Regra de fechamento (por horário específico)
  if (channel.bettingClosesAt) {
    const closesAt = new Date(channel.bettingClosesAt);
    if (now > closesAt) {
      return { isBettable: false, label: 'Mercado Fechado', reason: 'Horário limite atingido', color: 'text-slate-500', status: currentStatus };
    }
  }

  // 3. Validação por Tipo de Mercado (Prelive / Live Only)
  if (!isLive && bettingAvailability === 'live_only') {
    return { isBettable: false, label: 'Só ao Vivo', reason: 'Apostas abrem apenas no início do jogo', color: 'text-amber-500', status: currentStatus };
  }
  if (isLive && bettingAvailability === 'prelive') {
    return { isBettable: false, label: 'Mercado Fechado', reason: 'Apostas live não permitidas neste evento', color: 'text-red-500', status: currentStatus };
  }
  if (bettingAvailability === 'disabled') {
    return { isBettable: false, label: 'Suspenso', reason: 'Mercado suspenso pelo administrador', color: 'text-red-500', status: currentStatus };
  }

  // 4. Estados de Sucesso
  if (isLive) {
    return { isBettable: true, label: 'AO VIVO', reason: 'Apostas ao vivo abertas', color: 'text-green-500', status: 'live' };
  }
  
  return { isBettable: true, label: 'PRÓXIMO JOGO', reason: 'Apostas antecipadas abertas', color: 'text-blue-400', status: currentStatus };
}
