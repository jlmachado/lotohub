/**
 * @fileOverview Motor matemático para cálculo de Surebets (Arbitragem).
 */

export interface ArbitrageResult {
  stakeA: number;
  stakeB: number;
  profit: number;
  roi: number;
  oddsA: number;
  oddsB: number;
  isProfitable: boolean;
}

export interface ArbitrageFees {
  deposit: number;
  withdraw: number;
}

export class ArbitrageEngine {
  /**
   * Calcula a arbitragem entre duas odds.
   * @param oddsA Odd da Casa A
   * @param oddsB Odd da Casa B
   * @param totalStake Valor total que o usuário deseja investir
   * @param fees Taxas de movimentação
   */
  static calculate(
    oddsA: number,
    oddsB: number,
    totalStake: number,
    fees: ArbitrageFees = { deposit: 0, withdraw: 0 }
  ): ArbitrageResult | null {
    if (oddsA <= 1 || oddsB <= 1) return null;

    // Inversas das odds (Probabilidades implícitas)
    const invA = 1 / oddsA;
    const invB = 1 / oddsB;

    // Margem Total (Soma das probabilidades)
    // Se a soma for < 1 (ou 100%), existe uma Surebet.
    const sum = invA + invB;
    const isProfitable = sum < 1;

    // Cálculo das stakes ideais (proporcionais à probabilidade)
    const stakeA = totalStake * (invA / sum);
    const stakeB = totalStake * (invB / sum);

    // Retorno bruto garantido (será o mesmo para ambos os cenários no modelo ideal)
    const payoutA = stakeA * oddsA;
    const payoutB = stakeB * oddsB;
    const grossProfit = Math.min(payoutA, payoutB) - totalStake;

    // Aplicação de taxas (custo de transação)
    const netProfit = grossProfit - (fees.deposit + fees.withdraw);
    const roi = (netProfit / totalStake) * 100;

    return {
      stakeA: parseFloat(stakeA.toFixed(2)),
      stakeB: parseFloat(stakeB.toFixed(2)),
      profit: parseFloat(netProfit.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      oddsA,
      oddsB,
      isProfitable
    };
  }
}
