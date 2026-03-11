/**
 * @fileOverview Núcleo de Processamento de Eventos ao Vivo (Futebol).
 * Responsável por detectar mudanças de placar e gerenciar suspensão de mercados.
 */

import { MatchModel } from './match-mapper-service';
import { FootballLivePricingEngine } from './football-live-pricing-engine';

export interface ScoreChangeResult {
  goalDetected: boolean;
  changedSide: 'home' | 'away' | 'both' | 'none';
  previousScore: string;
  nextScore: string;
}

export class FootballLiveEngine {
  private static REOPEN_DELAY_MS = 30000; // 30 segundos

  /**
   * Compara dois estados da partida para detectar gols.
   */
  static detectScoreChange(oldMatch: MatchModel, newData: any): ScoreChangeResult {
    const prevHome = oldMatch.scoreHome || 0;
    const prevAway = oldMatch.scoreAway || 0;
    const nextHome = parseInt(newData.homeTeam?.score || '0');
    const nextAway = parseInt(newData.awayTeam?.score || '0');

    const homeChanged = nextHome > prevHome;
    const awayChanged = nextAway > prevAway;

    return {
      goalDetected: homeChanged || awayChanged,
      changedSide: (homeChanged && awayChanged) ? 'both' : homeChanged ? 'home' : awayChanged ? 'away' : 'none',
      previousScore: `${prevHome}-${prevAway}`,
      nextScore: `${nextHome}-${nextAway}`
    };
  }

  /**
   * Processa a atualização de uma partida e retorna o novo modelo com status de mercado.
   */
  static processUpdate(currentMatch: MatchModel, newData: any): MatchModel {
    const scoreDiff = this.detectScoreChange(currentMatch, newData);
    const now = Date.now();

    let marketStatus = currentMatch.marketStatus;
    let nextReopenAt = currentMatch.markets?.[0]?.id === 'REOPEN_TIMER' ? 0 : 0; // Placeholder logic

    // 1. Se detectou gol, SUSPENDE
    if (scoreDiff.goalDetected) {
      marketStatus = 'SUSPENDED';
      nextReopenAt = now + this.REOPEN_DELAY_MS;
      console.log(`[LIVE ENGINE] GOL DETECTADO em ${currentMatch.homeTeam} vs ${currentMatch.awayTeam}. Mercado Suspenso.`);
    } 
    // 2. Se estava suspenso e passou o tempo, REABRE
    else if (currentMatch.marketStatus === 'SUSPENDED' && currentMatch.status === 'LIVE') {
      // Nota: No AppContext faremos a checagem de tempo global para reabrir
    }

    // 3. Se o jogo acabou, FECHA
    if (newData.status === 'FINISHED' || newData.status === 'FT') {
      marketStatus = 'CLOSED';
    }

    // Atualizar Odds (Simples para esta etapa)
    const updatedOdds = FootballLivePricingEngine.calculateSimpleLiveOdds(
      currentMatch.odds, 
      parseInt(newData.clock || '0'),
      newData.homeTeam?.score || 0,
      newData.awayTeam?.score || 0
    );

    return {
      ...currentMatch,
      scoreHome: parseInt(newData.homeTeam?.score || '0'),
      scoreAway: parseInt(newData.awayTeam?.score || '0'),
      minute: newData.clock || currentMatch.minute,
      status: newData.status,
      isLive: newData.status === 'LIVE',
      isFinished: newData.status === 'FINISHED' || newData.status === 'FT',
      marketStatus,
      odds: updatedOdds
    };
  }
}
