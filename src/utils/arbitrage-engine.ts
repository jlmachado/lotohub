/**
 * @fileOverview Motor matemático para cálculo de Surebets (Arbitragem).
 */

export interface ArbitrageResult {
  stakeA: number;
  stakeB: number;
  profit: number;
  roi: number;
  oddA: number;
  oddB: number;
  isProfitable: boolean;
}

export interface ArbitrageFees {
  deposit: number;
  withdraw: number;
}

export class ArbitrageEngine {
  /**
   * Calcula a arbitragem entre duas odds.
   * @param oddA Odd da Casa A
   * @param oddB Odd da Casa B
   * @param totalStake Valor total que o usuário deseja investir
   * @param fees Taxas de movimentação
   */
  static calculate(
    oddA: number,
    oddB: number,
    totalStake: number,
    fees: ArbitrageFees = { deposit: 0, withdraw: 0 }
  ): ArbitrageResult | null {
    if (oddA <= 1 || oddB <= 1) return null;

    // Inversas das odds (Probabilidades implícitas)
    const invA = 1 / oddA;
    const invB = 1 / oddB;

    // Margem Total (Soma das probabilidades)
    // Se a soma for < 1 (ou 100%), existe uma Surebet.
    const sum = invA + invB;
    const isProfitable = sum < 1;

    // Se não for lucrativo, opcionalmente retornamos null ou o cálculo negativo
    // Mantendo consistência com a lógica fornecida pelo usuário
    if (sum >= 1) return null;

    // Cálculo das stakes ideais (proporcionais à probabilidade)
    const stakeA = totalStake * (invA / sum);
    const stakeB = totalStake * (invB / sum);

    // Retorno bruto garantido (será o mesmo para ambos os cenários no modelo ideal)
    const payoutA = stakeA * oddA;
    const payoutB = stakeB * oddB;
    const grossProfit = Math.min(payoutA, payoutB) - totalStake;

    // Aplicação de taxas (custo de transação)
    const netProfit = grossProfit - fees.deposit - fees.withdraw;

    const roi = (netProfit / totalStake) * 100;

    return {
      stakeA: parseFloat(stakeA.toFixed(2)),
      stakeB: parseFloat(stakeB.toFixed(2)),
      profit: parseFloat(netProfit.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      oddA,
      oddB,
      isProfitable: true
    };
  }
}
