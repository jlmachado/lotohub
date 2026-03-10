/**
 * @fileOverview Gestão de Risco e Limites para Apostas de Futebol.
 */

export interface RiskConfig {
  minStake: number;
  maxStake: number;
  maxPotentialWin: number;
  maxOdds: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  minStake: 1,
  maxStake: 1000,
  maxPotentialWin: 50000,
  maxOdds: 1000
};

export class RiskManagementService {
  static validateBet(stake: number, totalOdds: number, balance: number): { allowed: boolean; reason?: string } {
    if (stake < DEFAULT_RISK_CONFIG.minStake) {
      return { allowed: false, reason: `Valor mínimo por aposta é R$ ${DEFAULT_RISK_CONFIG.minStake}` };
    }
    
    if (stake > DEFAULT_RISK_CONFIG.maxStake) {
      return { allowed: false, reason: `Valor máximo por aposta é R$ ${DEFAULT_RISK_CONFIG.maxStake}` };
    }

    if (stake > balance) {
      return { allowed: false, reason: 'Saldo insuficiente' };
    }

    const potentialWin = stake * totalOdds;
    if (potentialWin > DEFAULT_RISK_CONFIG.maxPotentialWin) {
      return { allowed: false, reason: `Prêmio máximo permitido é R$ ${DEFAULT_RISK_CONFIG.maxPotentialWin}` };
    }

    if (totalOdds > DEFAULT_RISK_CONFIG.maxOdds) {
      return { allowed: false, reason: `Cotação máxima permitida é ${DEFAULT_RISK_CONFIG.maxOdds}` };
    }

    return { allowed: true };
  }
}
