/**
 * @fileOverview Orquestrador de Apostas.
 * Coordena validação, risco e confirmação de bilhetes.
 */

import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { RiskManagementService } from './risk-management-service';
import { UserType } from '@/utils/usersStorage';

export interface BetSlipValidation {
  valid: boolean;
  errors: string[];
  totalOdds: number;
}

export class BettingService {
  /**
   * Valida o carrinho de apostas em busca de conflitos.
   */
  static validateSlip(items: BetSlipItem[]): BetSlipValidation {
    const errors: string[] = [];
    const matchIds = new Set<string>();

    if (items.length === 0) {
      errors.push("O carrinho está vazio.");
    }

    // Regra de Conflito: Apenas uma seleção por partida em bilhetes acumulados
    items.forEach(item => {
      if (matchIds.has(item.matchId)) {
        errors.push(`Conflito: Você possui mais de uma seleção para o jogo ${item.matchName}.`);
      }
      matchIds.add(item.matchId);
    });

    const totalOdds = calculateTotalOdds(items);

    return {
      valid: errors.length === 0,
      errors,
      totalOdds
    };
  }

  /**
   * Processa a intenção de aposta com validação completa de perfil e risco.
   */
  static async processBetIntent(
    stake: number, 
    items: BetSlipItem[], 
    userContext: { tipo: UserType; saldo: number; bonus: number }
  ) {
    // 1. Valida estrutura do bilhete (Conflitos)
    const slipValidation = this.validateSlip(items);
    if (!slipValidation.valid) {
      return { success: false, message: slipValidation.errors[0] };
    }

    // 2. Valida Permissões por Perfil e Gestão de Risco
    const riskCheck = RiskManagementService.evaluateBet(
      stake, 
      slipValidation.totalOdds, 
      items.length, 
      userContext
    );

    if (!riskCheck.allowed) {
      return { success: false, message: riskCheck.reason };
    }

    // 3. Resultado de sucesso para persistência
    return { 
      success: true, 
      data: {
        stake,
        totalOdds: slipValidation.totalOdds,
        potentialWin: stake * slipValidation.totalOdds,
        timestamp: new Date().toISOString(),
        userType: userContext.tipo
      }
    };
  }
}
