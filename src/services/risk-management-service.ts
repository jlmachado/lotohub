/**
 * @fileOverview Gestão de Risco e Limites para Apostas de Futebol.
 * Lógica server-side para proteger a banca.
 */

import { UserType } from '@/utils/usersStorage';
import { BetPermissionService } from './bet-permission-service';

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
  static evaluateBet(
    stake: number, 
    totalOdds: number, 
    selectionsCount: number, 
    userContext: { tipo: UserType; saldo: number; bonus: number }
  ): { allowed: boolean; reason?: string } {
    
    // 1. Validação de Regras por Perfil (Padronização com outros jogos)
    const permission = BetPermissionService.validate(
      userContext.tipo,
      userContext.saldo,
      userContext.bonus,
      stake
    );

    if (!permission.allowed) {
      return { allowed: false, reason: permission.reason || "Não autorizado" };
    }

    // 2. Validação de Limites de Stake
    if (stake < DEFAULT_RISK_CONFIG.minStake) {
      return { allowed: false, reason: `Valor mínimo por aposta é R$ ${DEFAULT_RISK_CONFIG.minStake.toFixed(2)}` };
    }
    
    if (stake > DEFAULT_RISK_CONFIG.maxStake) {
      return { allowed: false, reason: `Valor máximo por aposta é R$ ${DEFAULT_RISK_CONFIG.maxStake.toFixed(2)}` };
    }

    // 3. Validação de Quantidade de Seleções
    if (selectionsCount > DEFAULT_RISK_CONFIG.maxSelections) {
      return { allowed: false, reason: `O limite é de ${DEFAULT_RISK_CONFIG.maxSelections} seleções por bilhete.` };
    }

    // 4. Validação de Ganhos Máximos
    const potentialWin = stake * totalOdds;
    if (potentialWin > DEFAULT_RISK_CONFIG.maxPotentialWin) {
      return { allowed: false, reason: `O prêmio máximo permitido é R$ ${DEFAULT_RISK_CONFIG.maxPotentialWin.toLocaleString('pt-BR')}` };
    }

    // 5. Validação de Odds Máximas
    if (totalOdds > DEFAULT_RISK_CONFIG.maxOdds) {
      return { allowed: false, reason: `A cotação máxima permitida é ${DEFAULT_RISK_CONFIG.maxOdds.toFixed(2)}` };
    }

    return { allowed: true };
  }
}
