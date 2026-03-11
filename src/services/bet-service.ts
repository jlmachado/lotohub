'use client';

/**
 * @fileOverview BetService - Motor local restaurado.
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
    const banca = resolveCurrentBanca();
    const bancaId = user.bancaId || banca?.id || 'default';
    
    let newBalance = user.saldo;
    let newBonus = user.bonus;
    const initialTotal = user.saldo + user.bonus;

    if (user.tipoUsuario !== 'CAMBISTA') {
      if (newBonus >= request.valor) {
        newBonus -= request.valor;
      } else {
        const diff = request.valor - newBonus;
        newBonus = 0;
        newBalance -= diff;
      }
    }

    // Atualizar Usuário localmente
    upsertUser({ terminal: user.terminal, saldo: newBalance, bonus: newBonus });

    // Registrar Ledger localmente
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
      description: request.descricao
    });

    // Cálculo de Comissão síncrono
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
        balanceAfter: newBalance + newBonus,
        referenceId: request.referenceId,
        description: `Comissão ${percComissao}% s/ venda ${request.modulo}`
      });
    }

    return { success: true };
  }
}
