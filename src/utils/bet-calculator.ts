/**
 * @fileOverview Utilitários para cálculo de apostas.
 */

export interface BetSlipItem {
  id: string;
  matchId: string;
  matchName: string;
  market: string;
  selection: string;
  odd: number;
}

/**
 * Calcula o multiplicador total de um bilhete acumulado.
 */
export function calculateTotalOdds(items: BetSlipItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((acc, item) => acc * item.odd, 1);
}

/**
 * Calcula o retorno potencial baseado no valor apostado.
 */
export function calculatePotentialWin(stake: number, totalOdds: number): number {
  return stake * totalOdds;
}
