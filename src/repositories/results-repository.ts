'use client';

import { BaseRepository } from './base-repository';
import { JDBResult } from '@/context/AppContext';
import { query, where, getDocs, orderBy } from 'firebase/firestore';

export class JDBResultsRepository extends BaseRepository<JDBResult> {
  constructor() {
    super('jdbResults');
  }

  async getByDate(date: string): Promise<JDBResult[]> {
    const q = query(
      this.getCollection(), 
      where('date', '==', date),
      orderBy('time', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as JDBResult));
  }
}

export const jdbResultsRepo = new JDBResultsRepository();
