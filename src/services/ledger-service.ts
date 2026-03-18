'use client';

/**
 * @fileOverview Ledger Service Enterprise.
 * Utiliza transações do Firestore para garantir integridade financeira absoluta.
 */

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, collection } from 'firebase/firestore';
import { resolveCurrentBanca } from '@/utils/bancaContext';

export type LedgerType = 
  | 'BET_PLACED' 
  | 'BET_WIN' 
  | 'COMMISSION_EARNED' 
  | 'CASH_IN'
  | 'CASH_OUT_RECOLHE'
  | 'DEPOSIT'
  | 'WITHDRAW';

export interface LedgerEntry {
  id: string;
  userId: string;
  terminal: string;
  tipoUsuario: string;
  modulo: string;
  type: LedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export class LedgerService {
  /**
   * Registra uma movimentação financeira de forma atômica.
   * Atualiza o saldo do usuário e cria o log no ledger em uma única transação.
   */
  static async registerMovement(entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'balanceBefore' | 'balanceAfter'>) {
    const { firestore } = initializeFirebase();
    const banca = resolveCurrentBanca();
    const bancaId = banca?.id || 'default';

    const userRef = doc(firestore, 'bancas', bancaId, 'usuarios', entry.userId);
    const ledgerColRef = collection(firestore, 'bancas', bancaId, 'ledgerEntries');
    const newEntryId = `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ledgerRef = doc(ledgerColRef, newEntryId);

    try {
      return await runTransaction(firestore, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("Usuário não encontrado para transação.");
        }

        const userData = userSnap.data();
        const currentBalance = userData.saldo || 0;
        const newBalance = currentBalance + entry.amount;

        if (newBalance < 0 && entry.tipoUsuario !== 'CAMBISTA' && entry.tipoUsuario !== 'SUPER_ADMIN') {
          throw new Error("Saldo insuficiente para realizar a operação.");
        }

        const now = new Date().toISOString();
        
        // 1. Atualiza Usuário
        transaction.update(userRef, { 
          saldo: newBalance,
          updatedAt: now 
        });

        // 2. Cria entrada no Ledger
        const finalEntry: LedgerEntry = {
          ...entry,
          id: newEntryId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          createdAt: now
        };

        transaction.set(ledgerRef, finalEntry);

        return { success: true, newBalance };
      });
    } catch (e: any) {
      console.error("[LEDGER TRANSACTION ERROR]", e.message);
      return { success: false, message: e.message };
    }
  }
}
