/**
 * @fileOverview Orquestrador de Apostas.
 * Coordena validação, risco e confirmação de bilhetes.
 */

import { BetSlipItem, calculateTotalOdds } from '@/utils/bet-calculator';
import { RiskManagementService } from './risk-management-service';

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
    // (Standard Sportsbook Rule para evitar Bet Builders não calculados corretamente)
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
   * Processa a intenção de aposta.
   */
  static async processBetIntent(stake: number, items: BetSlipItem[], balance: number) {
    // 1. Valida estrutura do bilhete
    const slipValidation = this.validateSlip(items);
    if (!slipValidation.valid) {
      return { success: false, message: slipValidation.errors[0] };
    }

    // 2. Valida risco e limites
    const riskCheck = RiskManagementService.evaluateBet(
      stake, 
      slipValidation.totalOdds, 
      items.length, 
      balance
    );

    if (!riskCheck.allowed) {
      return { success: false, message: riskCheck.reason };
    }

    // 3. Em um cenário real, aqui haveria a revalidação de odds via API externa
    // e o salvamento no banco de dados.

    return { 
      success: true, 
      data: {
        stake,
        totalOdds: slipValidation.totalOdds,
        potentialWin: stake * slipValidation.totalOdds,
        timestamp: new Date().toISOString()
      }
    };
  }
}
