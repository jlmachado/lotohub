/**
 * @fileOverview Gerador de Mercados de Aposta.
 * Cria mercados secundários (Over/Under, Ambas Marcam, Dupla Chance) a partir da probabilidade base.
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
}

export class FootballMarketsEngine {
  static generateAllMarkets(probs: MatchProbabilities): BettingMarket[] {
    const markets: BettingMarket[] = [];

    // 1. Vencedor 1X2
    markets.push({
      id: '1X2',
      name: 'Vencedor do Jogo',
      selections: [
        { id: 'home', label: 'Mandante', odd: FootballOddsEngine.probToOdd(probs.homeWin) },
        { id: 'draw', label: 'Empate', odd: FootballOddsEngine.probToOdd(probs.draw) },
        { id: 'away', label: 'Visitante', odd: FootballOddsEngine.probToOdd(probs.awayWin) }
      ]
    });

    // 2. Dupla Chance (Derivado do 1X2)
    markets.push({
      id: 'DC',
      name: 'Dupla Chance',
      selections: [
        { id: '1X', label: '1 ou X', odd: FootballOddsEngine.probToOdd(probs.homeWin + probs.draw) },
        { id: '12', label: '1 ou 2', odd: FootballOddsEngine.probToOdd(probs.homeWin + probs.awayWin) },
        { id: 'X2', label: 'X ou 2', odd: FootballOddsEngine.probToOdd(probs.draw + probs.awayWin) }
      ]
    });

    // 3. Over/Under 2.5 (Modelo Poisson Simplificado)
    const expectedGoals = probs.expectedTotalGoals || 2.5;
    const probUnder25 = Math.exp(-expectedGoals) * (1 + expectedGoals + (Math.pow(expectedGoals, 2) / 2));
    const probOver25 = 1 - probUnder25;

    markets.push({
      id: 'OU25',
      name: 'Total de Gols (2.5)',
      selections: [
        { id: 'over', label: 'Mais de 2.5', odd: FootballOddsEngine.probToOdd(probOver25) },
        { id: 'under', label: 'Menos de 2.5', odd: FootballOddsEngine.probToOdd(probUnder25) }
      ]
    });

    // 4. Ambas Marcam (BTTS)
    // Probabilidade baseada no equilíbrio ofensivo das equipes
    const bttsProb = Math.min(0.7, (probs.expectedTotalGoals / 5) + 0.2);
    markets.push({
      id: 'BTTS',
      name: 'Ambas Marcam',
      selections: [
        { id: 'yes', label: 'Sim', odd: FootballOddsEngine.probToOdd(bttsProb) },
        { id: 'no', label: 'Não', odd: FootballOddsEngine.probToOdd(1 - bttsProb) }
      ]
    });

    return markets;
  }
}
