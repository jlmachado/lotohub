'use client';

/**
 * @fileOverview Classe base para repositórios Firestore com Tipagem Forte e escrita não-bloqueante.
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
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export class BaseRepository<T extends { id: string }> {
  constructor(protected db: Firestore, protected collectionName: string) {}

  protected getCollection(): CollectionReference<DocumentData> {
    return collection(this.db, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollection(), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
  }

  async getById(id: string): Promise<T | null> {
    if (!id) return null;
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as T) : null;
  }

  /**
   * Salva dados de forma não-bloqueante (Padrão Firebase Studio).
   */
  save(data: T): void {
    const now = new Date().toISOString();
    const docRef = doc(this.db, this.collectionName, data.id);
    const docData = {
      ...data,
      updatedAt: now,
      createdAt: (data as any).createdAt || now
    };

    setDoc(docRef, docData, { merge: true })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: docData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    deleteDoc(docRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }
}
