/**
 * @fileOverview BetService - Motor centralizado integrado ao Firestore.
 */

import { User } from '@/utils/usersStorage';
import { LedgerService } from './ledger-service';
import { notifyDataChange } from './event-bus';
import { resolveCurrentBanca } from '@/utils/bancaContext';
import { usersRepo } from '@/repositories/users-repository';
import { ledgerRepo } from '@/repositories/ledger-repository';

export interface BetRequest {
  userId: string;
  modulo: string;
  valor: number;
  retornoPotencial: number;
  descricao: string;
  referenceId: string;
  loteria?: string;
  horario?: string;
}

export class BetService {
  static async processBet(user: User, request: BetRequest) {
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

    // Atualizar Usuário no Firestore
    await usersRepo.update(user.id, { saldo: newBalance, bonus: newBonus });

    // Registrar Ledger no Firestore
    const ledgerEntry = {
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
      description: request.descricao,
      id: `trx-${Date.now()}`
    };
    
    await ledgerRepo.save(ledgerEntry as any);

    // Cálculo de Comissão
    const percComissao = user.promotorConfig?.porcentagemComissao || 0;
    const valorComissao = (request.valor * percComissao) / 100;

    if (valorComissao > 0) {
      const commEntry = {
        ...ledgerEntry,
        id: `trx-comm-${Date.now()}`,
        type: 'COMMISSION_EARNED',
        amount: valorComissao,
        balanceBefore: newBalance + newBonus,
        balanceAfter: newBalance + newBonus,
        description: `Comissão ${percComissao}% s/ venda ${request.modulo}`
      };
      await ledgerRepo.save(commEntry as any);
    }

    notifyDataChange();
    return { success: true };
  }
}
