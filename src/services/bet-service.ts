'use client';

/**
 * @fileOverview BetService Multi-Tenant.
 * Valida a integridade do bancaId antes de qualquer transação financeira.
 */

import { User, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from './ledger-service';

export interface BetRequest {
  userId: string;
  modulo: string;
  valor: number;
  retornoPotencial: number;
  description: string;
  referenceId: string;
}

export class BetService {
  /**
   * Processa o fluxo financeiro de uma aposta garantindo isolamento total.
   */
  static processBet(user: User, request: BetRequest) {
    const bancaId = user.bancaId;
    
    if (!bancaId) {
      console.error("[BET ERROR] Usuário sem bancaId vinculado.");
      return { success: false, message: "Erro de configuração de banca." };
    }

    let newBalance = user.saldo;
    let newBonus = user.bonus;
    const initialTotal = user.saldo + user.bonus;

    // Regra de Consumo: Bônus primeiro, depois Saldo
    if (user.tipoUsuario !== 'CAMBISTA') {
      if (newBonus >= request.valor) {
        newBonus -= request.valor;
      } else {
        const diff = request.valor - newBonus;
        newBonus = 0;
        newBalance -= diff;
      }
    }

    if (newBalance < 0 && user.tipoUsuario !== 'CAMBISTA') {
      return { success: false, message: "Saldo insuficiente." };
    }

    // Atualizar Usuário no Firestore
    upsertUser({ 
      terminal: user.terminal, 
      saldo: newBalance, 
      bonus: newBonus, 
      bancaId 
    });

    // Registrar no Ledger Global (Obrigatório Await em cenário real, aqui usamos sync cloud no repo)
    LedgerService.addEntry({
      bancaId,
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: request.modulo,
      type: 'BET_PLACED',
      amount: -request.valor,
      balanceBefore: initialTotal,
      balanceAfter: newBalance + newBonus,
      referenceId: request.referenceId,
      description: request.description
    });

    return { success: true };
  }
}
