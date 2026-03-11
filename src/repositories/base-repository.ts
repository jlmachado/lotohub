'use client';

/**
 * @fileOverview Classe base para repositórios Firestore com Tipagem Forte.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  QueryConstraint,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export class BaseRepository<T extends { id: string }> {
  constructor(protected collectionName: string) {}

  protected getCollection(): CollectionReference<DocumentData> {
    return collection(db, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollection(), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
  }

  async getById(id: string): Promise<T | null> {
    if (!id) return null;
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as T) : null;
  }

  async save(data: T): Promise<void> {
    const now = new Date().toISOString();
    const docData = {
      ...data,
      updatedAt: now,
      createdAt: (data as any).createdAt || now
    };
    await setDoc(doc(db, this.collectionName, data.id), docData);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }
}
