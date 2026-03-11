'use client';

import { BaseRepository } from './base-repository';
import { LedgerEntry } from '@/services/ledger-service';
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export class LedgerRepository extends BaseRepository<LedgerEntry> {
  constructor() {
    super('ledgerEntries');
  }

  async getRecentByUser(userId: string, max: number = 100): Promise<LedgerEntry[]> {
    const q = query(
      this.getCollection(), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LedgerEntry));
  }
}

export const ledgerRepo = new LedgerRepository();
