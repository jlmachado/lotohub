'use client';

import { BaseRepository } from './base-repository';
import { Banca } from '@/utils/bancasStorage';
import { query, where, getDocs, limit } from 'firebase/firestore';

export class BancasRepository extends BaseRepository<Banca> {
  constructor() {
    super('bancas');
  }

  async getBySubdomain(subdomain: string): Promise<Banca | null> {
    const q = query(this.getCollection(), where('subdomain', '==', subdomain.toLowerCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Banca;
  }
}

export const bancasRepo = new BancasRepository();
