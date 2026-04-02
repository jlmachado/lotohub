/**
 * @fileOverview Motor de Precificação Avançado para Futebol.
 * Calcula probabilidades baseadas em PPG (Pontos por Jogo), Eficiência e Variância de Mercado.
 */

import { NormalizedESPNStanding } from '@/utils/espn-normalizer';

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  expectedTotalGoals: number;
}

export class FootballOddsEngine {
  private static MARGIN = 0.08; // Margem da casa (8%)
  private static HOME_ADVANTAGE_BASE = 0.08; // Bônus base de 8% para o mandante

  /**
   * Calcula um score de força (0.0 a 1.0) para um time.
   */
  private static getTeamPowerScore(teamId: string, standings: NormalizedESPNStanding[]): number {
    const team = standings.find(s => s.teamId === teamId);
    if (!team || team.stats.played === 0) return 0.5; // Força média para times sem dados

    // 1. Pontos por Jogo (PPG) - Peso 40%
    const ppg = team.stats.points / team.stats.played;
    const ppgScore = ppg / 3.0; // Max 3.0

    // 2. Saldo de Gols Relativo - Peso 30%
    const goalsDiffPerGame = team.stats.goalsDiff / team.stats.played;
    const gdScore = Math.max(0, Math.min(1, (goalsDiffPerGame + 2) / 4)); // Normaliza de -2 a +2 para 0 a 1

    // 3. Aproveitamento de Vitórias - Peso 30%
    const winRate = team.stats.wins / team.stats.played;

    return (ppgScore * 0.4) + (gdScore * 0.3) + (winRate * 0.3);
  }

  /**
   * Calcula as probabilidades de um confronto com variância natural.
   */
  static calculateMatchProbabilities(
    homeTeamId: string,
    awayTeamId: string,
    standings: NormalizedESPNStanding[],
    matchId: string // Usado para gerar variância única
  ): MatchProbabilities {
    const homePower = this.getTeamPowerScore(homeTeamId, standings);
    const awayPower = this.getTeamPowerScore(awayTeamId, standings);

    // Diferença base de força
    let diff = homePower - awayPower;

    // Aplicar Mando de Campo
    let homeProb = 0.37 + (diff * 0.5) + this.HOME_ADVANTAGE_BASE;
    let awayProb = 0.33 - (diff * 0.5) - (this.HOME_ADVANTAGE_BASE / 2);

    // Cálculo dinâmico de Empate
    const drawBase = 0.30 - (Math.abs(diff) * 0.25);
    
    // Injetar Variância (Jitter) para evitar odds idênticas
    const seed = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const jitter = ((seed % 100) / 2000) - 0.005;

    homeProb += jitter;
    awayProb -= jitter;

    // Normalização Final
    const total = homeProb + awayProb + drawBase;
    const finalHome = homeProb / total;
    const finalAway = awayProb / total;
    const finalDraw = drawBase / total;

    // Estimativa de Gols
    const avgLeagueGoals = 2.6;
    const expectedGoals = avgLeagueGoals + (homePower + awayPower - 1.0);

    return {
      homeWin: Math.max(0.05, finalHome),
      draw: Math.max(0.05, finalDraw),
      awayWin: Math.max(0.05, finalAway),
      expectedTotalGoals: expectedGoals
    };
  }

  /**
   * Converte probabilidade real em Odd Decimal com aplicação de margem.
   */
  static probToOdd(prob: number): number {
    if (prob <= 0) return 100.0;
    const fairOdd = 1 / prob;
    const limitedOdd = fairOdd / (1 + this.MARGIN);
    return parseFloat(Math.max(1.01, Math.min(50, limitedOdd)).toFixed(2));
  }
}
