/**
 * @fileOverview Motor de processamento de eventos ao vivo.
 * Responsável por gerenciar a suspensão de mercados e atualização de placares.
 */

import { MatchModel } from './match-mapper-service';

export class FootballLiveEngine {
  /**
   * Analisa a mudança de estado de uma partida e decide se suspende mercados.
   */
  static processLiveState(current: MatchModel, newData: any): MatchModel {
    let marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED' = current.marketStatus;

    const newScoreHome = parseInt(newData.homeTeam?.score || '0');
    const newScoreAway = parseInt(newData.awayTeam?.score || '0');

    // 1. Detecção de GOL: Suspende temporariamente
    const goalDetected = newScoreHome > current.scoreHome || newScoreAway > current.scoreAway;
    
    if (goalDetected) {
      marketStatus = 'SUSPENDED';
    } else if (newData.status === 'FINISHED') {
      marketStatus = 'CLOSED';
    } else if (current.marketStatus === 'SUSPENDED') {
      // Reabre se não houve mudança crítica no último minuto (simplificação para protótipo)
      marketStatus = 'OPEN';
    }

    return {
      ...current,
      scoreHome: newScoreHome,
      scoreAway: newScoreAway,
      minute: newData.clock || current.minute,
      isLive: newData.status === 'LIVE',
      isFinished: newData.status === 'FINISHED',
      status: newData.status,
      marketStatus
    };
  }
}
