/**
 * @fileOverview Motor simplificado de ajuste de odds ao vivo.
 */

export class FootballLivePricingEngine {
  /**
   * Ajusta levemente as odds baseadas no tempo de jogo.
   * Em uma etapa futura, isso usará modelos probabilísticos complexos.
   */
  static calculateSimpleLiveOdds(
    currentOdds: { home: number; draw: number; away: number },
    minute: number,
    homeScore: number,
    awayScore: number
  ) {
    // Se o jogo está empatado e no final, a odd do empate cai
    if (homeScore === awayScore && minute > 80) {
      return {
        home: Math.max(1.1, currentOdds.home * 1.1),
        draw: Math.max(1.05, currentOdds.draw * 0.9),
        away: Math.max(1.1, currentOdds.away * 1.1)
      };
    }

    // Se um time está ganhando no final, sua odd cai drasticamente
    if (homeScore > awayScore && minute > 75) {
      return {
        home: 1.10,
        draw: Math.max(2.0, currentOdds.draw * 1.2),
        away: Math.max(5.0, currentOdds.away * 1.5)
      };
    }

    return currentOdds;
  }
}
