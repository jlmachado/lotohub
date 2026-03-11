/**
 * @fileOverview Motor de Precificação (Odds Engine) para Futebol.
 * Calcula probabilidades baseadas em dados reais da ESPN (Standings, Form, Goals).
 */

import { NormalizedESPNStanding } from '@/utils/espn-normalizer';

export interface TeamStrength {
  score: number;
  expectedGoals: number;
  formFactor: number;
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  expectedTotalGoals: number;
}

export class FootballOddsEngine {
  // Pesos do Modelo (Configuráveis)
  private static WEIGHTS = {
    position: 0.20,
    points: 0.20,
    goalDiff: 0.20,
    goalsFor: 0.15,
    form: 0.25
  };

  private static HOME_ADVANTAGE_BOOST = 0.12; // +12% de chance para o mandante
  private static MARGIN = 0.08; // Margem da casa (8%)

  /**
   * Calcula a força técnica de um time com base nos standings da ESPN.
   */
  static calculateTeamStrength(teamId: string, standings: NormalizedESPNStanding[]): TeamStrength {
    const teamStats = standings.find(s => s.teamId === teamId);
    if (!teamStats) {
      return { score: 0.5, expectedGoals: 1.2, formFactor: 1.0 };
    }

    const totalTeams = standings.length;
    
    // Normalização de métricas (0 a 1)
    const posScore = (totalTeams - teamStats.position + 1) / totalTeams;
    const maxPoints = standings[0]?.stats.points || 1;
    const pointsScore = teamStats.stats.points / maxPoints;
    
    // Gols e Saldo
    const goalDiffScore = Math.max(0, Math.min(1, (teamStats.stats.goalsDiff + 30) / 60));
    const goalsForScore = Math.min(1, teamStats.stats.goalsFor / (teamStats.stats.played * 2.5));

    // Força Final Ponderada
    const score = (
      (posScore * this.WEIGHTS.position) +
      (pointsScore * this.WEIGHTS.points) +
      (goalDiffScore * this.WEIGHTS.goalDiff) +
      (goalsForScore * this.WEIGHTS.goalsFor)
    ) / (1 - this.WEIGHTS.form); // A forma será somada depois

    // Expectativa de gols por jogo (Simplificado)
    const avgGoals = teamStats.stats.goalsFor / Math.max(1, teamStats.stats.played);

    return {
      score,
      expectedGoals: avgGoals,
      formFactor: 1.0 // Em uma versão futura, calcularíamos a string de forma "WWDLD"
    };
  }

  /**
   * Gera probabilidades para o mercado 1X2.
   */
  static calculateMatchProbabilities(
    homeTeamId: string,
    awayTeamId: string,
    standings: NormalizedESPNStanding[]
  ): MatchProbabilities {
    const home = this.calculateTeamStrength(homeTeamId, standings);
    const away = this.calculateTeamStrength(awayTeamId, standings);

    // Diferença de força
    let homeProb = 0.33 + (home.score - away.score);
    let awayProb = 0.33 + (away.score - home.score);
    
    // Ajuste de Mando de Campo
    homeProb += this.HOME_ADVANTAGE_BOOST;
    awayProb -= (this.HOME_ADVANTAGE_BOOST / 2);

    // Garantir limites e normalizar
    homeProb = Math.max(0.1, Math.min(0.85, homeProb));
    awayProb = Math.max(0.1, Math.min(0.85, awayProb));
    
    const drawProb = 1 - homeProb - awayProb;

    return {
      homeWin: homeProb,
      draw: drawProb,
      awayWin: awayProb,
      expectedTotalGoals: (home.expectedGoals + away.expectedGoals)
    };
  }

  /**
   * Converte probabilidade em Odd Decimal com margem.
   */
  static probToOdd(prob: number): number {
    if (prob <= 0) return 100.0;
    const odd = 1 / (prob * (1 + this.MARGIN));
    return parseFloat(Math.max(1.05, Math.min(50, odd)).toFixed(2));
  }
}
