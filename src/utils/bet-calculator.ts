/**
 * @fileOverview Utilitários para cálculo de apostas e multiplicadores.
 */

export interface BetSlipItem {
  id: string;
  matchId: string;
  matchName: string;
  market: string;
  selection: string;
  pickLabel: string;
  odd: number;
  match?: any;
}

/**
 * Calcula o multiplicador total de um bilhete (odds acumuladas).
 * Em apostas múltiplas, as odds são multiplicadas entre si.
 */
export function calculateTotalOdds(items: BetSlipItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((acc, item) => acc * item.odd, 1);
}

/**
 * Calcula o retorno potencial baseado no valor apostado (stake).
 */
export function calculatePotentialWin(stake: number, totalOdds: number): number {
  if (stake <= 0 || totalOdds <= 0) return 0;
  return stake * totalOdds;
}
