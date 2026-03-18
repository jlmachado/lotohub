'use client';

/**
 * @fileOverview Ledger Service SaaS Multi-Tenant.
 * Unifica a fonte da verdade financeira apenas no Firestore.
 */

import { BaseRepository } from '@/repositories/base-repository';

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
  bancaId: string;
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
  private static repo = new BaseRepository<LedgerEntry>('ledgerEntries');

  /**
   * Adiciona uma entrada no Livro Razão com persistência obrigatória.
   */
  static async addEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry> {
    if (!entry.bancaId) {
      throw new Error("ERRO FINANCEIRO: Tentativa de registro sem bancaId.");
    }

    const newEntry: LedgerEntry = {
      ...entry,
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };

    // PERSISTÊNCIA CLOUD IMEDIATA (Sem LocalStorage para finanças)
    await this.repo.save(newEntry);
    
    console.log(`[LEDGER] [BANCA: ${entry.bancaId}] TRX registrada: ${entry.type} | ${entry.amount}`);
    
    return newEntry;
  }
}
