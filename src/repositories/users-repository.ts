'use client';

import { BaseRepository } from './base-repository';
import { User } from '@/utils/usersStorage';
import { query, where, getDocs, limit } from 'firebase/firestore';

export class UsersRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async getByTerminal(terminal: string): Promise<User | null> {
    const q = query(this.getCollection(), where('terminal', '==', terminal), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as User;
  }

  async getByEmail(email: string): Promise<User | null> {
    const q = query(this.getCollection(), where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as User;
  }
}

export const usersRepo = new UsersRepository();
