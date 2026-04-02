/**
 * @fileOverview Gerador de Mercados Secundários Proporcionais.
 * Garante que todos os mercados sigam a lógica do 1X2.
 */

import { FootballOddsEngine, MatchProbabilities } from './football-odds-engine';

export interface MarketSelection {
  id: string;
  label: string;
  odd: number;
}

export interface BettingMarket {
  id: string;
  name: string;
  selections: MarketSelection[];
  status: 'OPEN' | 'SUSPENDED' | 'CLOSED';
}

export class FootballMarketsEngine {
  static generateAllMarkets(probs: MatchProbabilities): BettingMarket[] {
    const markets: BettingMarket[] = [];

    // 1. Vencedor 1X2 (Principal)
    markets.push({
      id: '1X2',
      name: 'Vencedor do Jogo',
      status: 'OPEN',
      selections: [
        { id: 'home', label: 'Casa', odd: FootballOddsEngine.probToOdd(probs.homeWin) },
        { id: 'draw', label: 'Empate', odd: FootballOddsEngine.probToOdd(probs.draw) },
        { id: 'away', label: 'Fora', odd: FootballOddsEngine.probToOdd(probs.awayWin) }
      ]
    });

    // 2. Over/Under 2.5 (Modelo de Poisson Simplificado)
    const lambda = probs.expectedTotalGoals;
    const p0 = Math.exp(-lambda);
    const p1 = lambda * p0;
    const p2 = (Math.pow(lambda, 2) / 2) * p0;
    const probUnder25 = p0 + p1 + p2;
    const probOver25 = 1 - probUnder25;

    markets.push({
      id: 'OU25',
      name: 'Gols +/- 2.5',
      status: 'OPEN',
      selections: [
        { id: 'over', label: 'Mais de 2.5', odd: FootballOddsEngine.probToOdd(probOver25) },
        { id: 'under', label: 'Menos de 2.5', odd: FootballOddsEngine.probToOdd(probUnder25) }
      ]
    });

    // 3. Ambas Marcam (BTTS)
    const bttsProb = Math.min(0.78, (lambda / 4.0) + 0.15);
    markets.push({
      id: 'BTTS',
      name: 'Ambas Marcam',
      status: 'OPEN',
      selections: [
        { id: 'yes', label: 'Sim', odd: FootballOddsEngine.probToOdd(bttsProb) },
        { id: 'no', label: 'Não', odd: FootballOddsEngine.probToOdd(1 - bttsProb) }
      ]
    });

    return markets;
  }
}
