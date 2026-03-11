/**
 * @fileOverview Motor de Reprecificação de Odds ao Vivo.
 * Ajusta as probabilidades pré-jogo com base no placar e tempo decorrido.
 */

export interface LivePricingInput {
  preMatchProbabilities: { home: number; draw: number; away: number };
  homeScore: number;
  awayScore: number;
  minute: number;
  isFinished: boolean;
}

export class FootballLivePricingEngine {
  private static MARGIN = 0.10; // Margem live ligeiramente maior (10%)

  /**
   * Calcula novas probabilidades 1X2 baseadas no estado atual do jogo.
   */
  static calculateLiveProbabilities(input: LivePricingInput) {
    if (input.isFinished) return { home: 0, draw: 0, away: 0 };

    const { homeScore, awayScore, minute, preMatchProbabilities } = input;
    
    // 1. Calcular tempo restante (fator de 0 a 1)
    const timeFactor = Math.min(minute / 90, 1);
    const remainingFactor = 1 - timeFactor;

    // 2. Base inicial: Placar atual determina a tendência
    let liveHome = homeScore > awayScore ? 0.7 : (homeScore === awayScore ? 0.33 : 0.1);
    let liveDraw = homeScore === awayScore ? 0.4 : 0.2;
    let liveAway = awayScore > homeScore ? 0.7 : (homeScore === awayScore ? 0.33 : 0.1);

    // 3. Ajuste por Força Pré-Jogo (diminui conforme o jogo acaba)
    liveHome = (liveHome * timeFactor) + (preMatchProbabilities.home * remainingFactor);
    liveDraw = (liveDraw * timeFactor) + (preMatchProbabilities.draw * remainingFactor);
    liveAway = (liveAway * timeFactor) + (preMatchProbabilities.away * remainingFactor);

    // 4. Bônus de urgência para quem está perdendo por 1 gol no final
    if (minute > 70) {
      if (homeScore === awayScore + 1) liveAway += 0.05;
      if (awayScore === homeScore + 1) liveHome += 0.05;
    }

    // Normalizar
    const total = liveHome + liveDraw + liveAway;
    return {
      home: liveHome / total,
      draw: liveDraw / total,
      away: liveAway / total
    };
  }

  static probToOdd(prob: number): number {
    if (prob <= 0.02) return 50.0;
    const odd = 1 / (prob * (1 + this.MARGIN));
    return parseFloat(Math.max(1.01, Math.min(50, odd)).toFixed(2));
  }
}
