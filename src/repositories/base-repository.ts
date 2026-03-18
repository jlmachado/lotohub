
'use client';

/**
 * @fileOverview Repositório Base compatível com Firebase Studio.
 * Auto-inicializa a conexão com o Firestore.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  QueryConstraint,
  CollectionReference,
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export class BaseRepository<T extends { id: string }> {
  protected db: Firestore;

  constructor(protected collectionName: string) {
    const { firestore } = initializeFirebase();
    this.db = firestore;
  }

  protected getCollection(): CollectionReference<DocumentData> {
    return collection(this.db, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.getCollection(), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (e) {
      console.error(`Error fetching all from ${this.collectionName}:`, e);
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    if (!id) return null;
    try {
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as T) : null;
    } catch (e) {
      console.error(`Error fetching ${id} from ${this.collectionName}:`, e);
      return null;
    }
  }

  /**
   * Salva dados no Firestore usando persistência imediata.
   */
  save(data: T): void {
    const now = new Date().toISOString();
    const docRef = doc(this.db, this.collectionName, data.id);
    
    const docData = {
      ...data,
      updatedAt: now,
      createdAt: (data as any).createdAt || now
    };

    console.log(`[Cloud Save] Gravando em ${this.collectionName}/${data.id}...`);

    setDoc(docRef, docData, { merge: true }).catch(error => {
      console.error(`[Firestore Save Error] Collection: ${this.collectionName}, ID: ${data.id}`, error);
    });
  }

  delete(id: string): void {
    const docRef = doc(this.db, this.collectionName, id);
    deleteDoc(docRef).catch(error => {
      console.warn(`[Firestore Delete Error] Collection: ${this.collectionName}, ID: ${id}`, error);
    });
  }
}
