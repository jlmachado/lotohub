/**
 * @fileOverview Gerador de Mercados ao Vivo.
 */

import { FootballLivePricingEngine } from './football-live-pricing-engine';
import { BettingMarket } from './football-markets-engine';

export class FootballLiveMarketsEngine {
  static generateLiveMarkets(
    probs: { home: number; draw: number; away: number },
    homeScore: number,
    awayScore: number,
    minute: number
  ): BettingMarket[] {
    const markets: BettingMarket[] = [];

    // 1. Vencedor Partida (Live)
    markets.push({
      id: '1X2',
      name: 'Vencedor do Jogo',
      selections: [
        { id: 'home', label: 'Mandante', odd: FootballLivePricingEngine.probToOdd(probs.home) },
        { id: 'draw', label: 'Empate', odd: FootballLivePricingEngine.probToOdd(probs.draw) },
        { id: 'away', label: 'Visitante', odd: FootballLivePricingEngine.probToOdd(probs.away) }
      ]
    });

    // 2. Próximo Gol (Estimativa baseada em quem tem mais probabilidade no momento)
    const nextGoalProbHome = probs.home / (probs.home + probs.away);
    markets.push({
      id: 'NEXT_GOAL',
      name: 'Próximo Gol',
      selections: [
        { id: 'home', label: 'Mandante', odd: FootballLivePricingEngine.probToOdd(nextGoalProbHome * 0.8) },
        { id: 'none', label: 'Sem mais gols', odd: FootballLivePricingEngine.probToOdd(probs.draw * 1.2) },
        { id: 'away', label: 'Visitante', odd: FootballLivePricingEngine.probToOdd((1 - nextGoalProbHome) * 0.8) }
      ]
    });

    // 3. Ambas Marcam (Dinâmico)
    let bttsYesProb = 0.5;
    if (homeScore > 0 && awayScore > 0) {
      bttsYesProb = 0.99; // Já aconteceu
    } else {
      // Chance diminui drasticamente após os 75'
      bttsYesProb = Math.max(0.05, 0.5 * (1 - (minute / 100)));
    }

    markets.push({
      id: 'BTTS',
      name: 'Ambas Marcam',
      selections: [
        { id: 'yes', label: 'Sim', odd: FootballLivePricingEngine.probToOdd(bttsYesProb) },
        { id: 'no', label: 'Não', odd: FootballLivePricingEngine.probToOdd(1 - bttsYesProb) }
      ]
    });

    return markets;
  }
}
