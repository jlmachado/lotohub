/**
 * @fileOverview Ledger Service - O coração financeiro do sistema.
 * Gerencia o extrato unificado e garante integridade em todas as transações.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { notifyDataChange } from './event-bus';

export type LedgerType = 
  | 'BET_PLACED' 
  | 'BET_WIN' 
  | 'BET_LOSS' 
  | 'COMMISSION_EARNED' 
  | 'CREDIT_RECEIVED' 
  | 'BALANCE_ADJUST' 
  | 'PRIZE_PAID' 
  | 'DESCARGA' 
  | 'DEPOSIT' 
  | 'WITHDRAW'
  | 'CASH_IN'
  | 'CASH_OUT_RECOLHE'
  | 'CASH_CLOSE';

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

const LEDGER_KEY = 'app:ledger:v1';

export class LedgerService {
  static getEntries(): LedgerEntry[] {
    return getStorageItem(LEDGER_KEY, []);
  }

  static addEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): LedgerEntry {
    const entries = this.getEntries();
    const newEntry: LedgerEntry = {
      ...entry,
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };

    entries.unshift(newEntry);
    setStorageItem(LEDGER_KEY, entries.slice(0, 5000)); // Mantém últimos 5k registros
    notifyDataChange();
    return newEntry;
  }

  static getByBanca(bancaId: string): LedgerEntry[] {
    return this.getEntries().filter(e => e.bancaId === bancaId);
  }

  static getByUser(userId: string): LedgerEntry[] {
    return this.getEntries().filter(e => e.userId === userId);
  }
}
