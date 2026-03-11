/**
 * @fileOverview BetService - Motor central de processamento de apostas.
 * Unifica a lógica de desconto de saldo, comissão e descarga.
 */

import { User, upsertUser } from '@/utils/usersStorage';
import { LedgerService } from './ledger-service';
import { notifyDataChange } from './event-bus';
import { resolveCurrentBanca } from '@/utils/bancaContext';
import { registerDescarga } from '@/utils/descargaStorage';

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
  static processBet(user: User, request: BetRequest) {
    const banca = resolveCurrentBanca();
    const bancaId = user.bancaId || banca?.id || 'default';
    
    // 1. Cálculo de Saldos
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

    // 2. Atualizar Usuário
    upsertUser({ 
      terminal: user.terminal, 
      saldo: newBalance, 
      bonus: newBonus 
    });

    // 3. Registrar Ledger (Débito da Aposta)
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

    // 4. Lógica de Descarga (Risco)
    const limiteDescarga = banca?.descargaConfig?.limitePremio || 999999;
    const isDescarga = banca?.descargaConfig?.ativo && request.retornoPotencial > limiteDescarga;

    if (isDescarga) {
      registerDescarga({
        bancaId,
        bancaNome: banca?.nome || 'Banca',
        apostaId: request.referenceId,
        userId: user.id,
        terminal: user.terminal,
        nomeUsuario: user.nome || 'Usuário',
        tipoUsuario: user.tipoUsuario,
        modulo: request.modulo,
        loteria: request.loteria,
        horario: request.horario,
        valorApostado: request.valor,
        retornoPossivel: request.retornoPotencial,
        status: 'EM_DESCARGA'
      });

      LedgerService.addEntry({
        bancaId,
        userId: user.id,
        terminal: user.terminal,
        tipoUsuario: user.tipoUsuario,
        modulo: request.modulo,
        type: 'DESCARGA',
        amount: request.retornoPotencial,
        balanceBefore: newBalance + newBonus,
        balanceAfter: newBalance + newBonus,
        referenceId: request.referenceId,
        description: `Risco descarregado para Superadmin: ${request.descricao}`
      });
    }

    // 5. Cálculo de Comissão
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

    notifyDataChange();
    return { success: true, isDescarga };
  }
}
