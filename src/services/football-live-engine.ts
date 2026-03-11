/**
 * @fileOverview Orquestrador de Eventos Live.
 * Detecta mudanças de placar e gerencia a suspensão de mercados.
 */

import { MatchModel } from './match-mapper-service';
import { FootballLivePricingEngine } from './football-live-pricing-engine';
import { FootballLiveMarketsEngine } from './football-live-markets-engine';

export class FootballLiveEngine {
  /**
   * Processa uma atualização de partida live e determina se deve suspender mercados.
   */
  static processUpdate(currentMatch: MatchModel, newData: any): MatchModel {
    const hasScoreChanged = newData.homeTeam.score !== currentMatch.scoreHome || 
                            newData.awayTeam.score !== currentMatch.scoreAway;
    
    const isNewCriticalEvent = hasScoreChanged || newData.status === 'FINISHED';

    // Se houve gol, suspende imediatamente
    const marketStatus = isNewCriticalEvent ? 'SUSPENDED' : currentMatch.marketStatus;

    // Recalcular Odds Live
    const preMatchProbs = { home: 0.4, draw: 0.3, away: 0.3 }; // Fallback ou extraído do meta
    const liveProbs = FootballLivePricingEngine.calculateLiveProbabilities({
      preMatchProbabilities: preMatchProbs,
      homeScore: newData.homeTeam.score,
      awayScore: newData.awayTeam.score,
      minute: parseInt(newData.clock) || 0,
      isFinished: newData.status === 'FINISHED'
    });

    const liveMarkets = FootballLiveMarketsEngine.generateLiveMarkets(
      liveProbs,
      newData.homeTeam.score,
      newData.awayTeam.score,
      parseInt(newData.clock) || 0
    );

    return {
      ...currentMatch,
      scoreHome: newData.homeTeam.score,
      scoreAway: newData.awayTeam.score,
      minute: newData.clock || currentMatch.minute,
      status: newData.status,
      marketStatus,
      isLive: newData.status === 'LIVE',
      isFinished: newData.status === 'FINISHED',
      odds: {
        home: liveMarkets[0]?.selections[0]?.odd || 1.0,
        draw: liveMarkets[0]?.selections[1]?.odd || 1.0,
        away: liveMarkets[0]?.selections[2]?.odd || 1.0
      },
      markets: liveMarkets
    };
  }
}
