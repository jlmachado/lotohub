'use client';

/**
 * @fileOverview BetService - Motor local Tenant-Aware.
 * Gerencia o consumo de saldo e registro de movimentações financeiras.
 */

import { User, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from './ledger-service';
import { resolveCurrentBanca } from '@/utils/bancaContext';

export interface BetRequest {
  userId: string;
  modulo: string;
  valor: number;
  retornoPotencial: number;
  descricao: string;
  referenceId: string;
}

export class BetService {
  static processBet(user: User, request: BetRequest) {
    // Resolve o contexto da banca do usuário para garantir isolamento.
    // Prioriza bancaId do usuário, depois contexto global, depois default.
    const contextBanca = resolveCurrentBanca();
    const bancaId = user.bancaId || contextBanca?.id || 'default';
    
    let newBalance = user.saldo;
    let newBonus = user.bonus;
    const initialTotal = user.saldo + user.bonus;

    // Regra Cambista: Não consome saldo imediato do operador, mas registra no ledger como venda da banca.
    if (user.tipoUsuario !== 'CAMBISTA') {
      if (newBonus >= request.valor) {
        newBonus -= request.valor;
      } else {
        const diff = request.valor - newBonus;
        newBonus = 0;
        newBalance -= diff;
      }
    }

    // Atualizar Usuário (Saldo e Bônus)
    upsertUser({ 
      terminal: user.terminal, 
      saldo: newBalance, 
      bonus: newBonus, 
      bancaId 
    });

    // Registrar Aposta no Ledger (Fonte da verdade para KPIs Administrativos)
    LedgerService.addEntry({
      bancaId,
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: request.modulo,
      type: 'BET_PLACED',
      amount: -request.valor, // Valor negativo representa saída/aposta realizada
      balanceBefore: initialTotal,
      balanceAfter: newBalance + newBonus,
      referenceId: request.referenceId,
      description: request.descricao
    });

    // Processamento de Comissão (Registrado no Ledger como COMMISSION_EARNED)
    const percComissao = user.promotorConfig?.porcentagemComissao || 0;
    const valorComissao = (request.valor * percComissao) / 100;

    if (valorComissao > 0) {
      LedgerService.addEntry({
        bancaId,
        userId: user.id,
        terminal: user.terminal,
        tipoUsuario: user.tipoUsuario,
        modulo: request.modulo,
        type: 'COMMISSION_EARNED',
        amount: valorComissao,
        balanceBefore: newBalance + newBonus,
        balanceAfter: newBalance + newBonus, // No protótipo, comissão é informativa ou creditada em saldo administrativo
        referenceId: request.referenceId,
        description: `Comissão ${percComissao}% s/ venda ${request.modulo}`
      });
    }

    return { success: true };
  }
}
