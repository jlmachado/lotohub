/**
 * @fileOverview Gestão de Risco e Limites para Apostas de Futebol.
 * Lógica server-side para proteger a banca.
 */

export interface RiskConfig {
  minStake: number;
  maxStake: number;
  maxPotentialWin: number;
  maxOdds: number;
  maxSelections: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  minStake: 1.00,
  maxStake: 5000.00,
  maxPotentialWin: 100000.00,
  maxOdds: 500.00,
  maxSelections: 15
};

export class RiskManagementService {
  /**
   * Avalia uma aposta antes de permitir a submissão.
   */
  static evaluateBet(stake: number, totalOdds: number, selectionsCount: number, balance: number): { allowed: boolean; reason?: string } {
    if (stake < DEFAULT_RISK_CONFIG.minStake) {
      return { allowed: false, reason: `Valor mínimo por aposta é R$ ${DEFAULT_RISK_CONFIG.minStake.toFixed(2)}` };
    }
    
    if (stake > DEFAULT_RISK_CONFIG.maxStake) {
      return { allowed: false, reason: `Valor máximo por aposta é R$ ${DEFAULT_RISK_CONFIG.maxStake.toFixed(2)}` };
    }

    if (stake > balance) {
      return { allowed: false, reason: 'Saldo insuficiente na carteira.' };
    }

    if (selectionsCount > DEFAULT_RISK_CONFIG.maxSelections) {
      return { allowed: false, reason: `O limite é de ${DEFAULT_RISK_CONFIG.maxSelections} seleções por bilhete.` };
    }

    const potentialWin = stake * totalOdds;
    if (potentialWin > DEFAULT_RISK_CONFIG.maxPotentialWin) {
      return { allowed: false, reason: `O prêmio máximo permitido é R$ ${DEFAULT_RISK_CONFIG.maxPotentialWin.toLocaleString('pt-BR')}` };
    }

    if (totalOdds > DEFAULT_RISK_CONFIG.maxOdds) {
      return { allowed: false, reason: `A cotação máxima permitida é ${DEFAULT_RISK_CONFIG.maxOdds.toFixed(2)}` };
    }

    return { allowed: true };
  }
}
