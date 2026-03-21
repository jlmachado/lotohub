'use client';

/**
 * @fileOverview Repositório Base Multi-Tenant.
 * Centraliza a lógica de caminhos para garantir que todas as operações
 * ocorram sob o escopo bancas/{bancaId}/{coleção}.
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
import { getCurrentBancaId } from '@/utils/bancaContext';

export class BaseRepository<T extends { id: string }> {
  protected db: Firestore;

  constructor(protected collectionName: string) {
    const { firestore } = initializeFirebase();
    this.db = firestore;
  }

  /**
   * Constrói o caminho da coleção baseado no Tenant ativo.
   * Isolamento: bancas/{bancaId}/{coleção}
   */
  protected getCollection(): CollectionReference<DocumentData> {
    const bancaId = getCurrentBancaId();
    
    // Coleções que permanecem globais por definição de sistema
    if (this.collectionName === 'bancas') {
      return collection(this.db, 'bancas');
    }

    // Estrutura Multi-Banca Centralizada
    return collection(this.db, 'bancas', bancaId, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.getCollection(), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (e) {
      console.error(`[BaseRepo] Erro ao ler ${this.collectionName}:`, e);
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    if (!id) return null;
    try {
      const docRef = doc(this.getCollection(), id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as T : null;
    } catch (e) {
      console.error(`[BaseRepo] Erro ao buscar ${id} em ${this.collectionName}:`, e);
      return null;
    }
  }

  async save(data: T): Promise<void> {
    const bancaId = getCurrentBancaId();
    const docRef = doc(this.getCollection(), data.id);
    const now = new Date().toISOString();
    
    const docData = {
      ...data,
      updatedAt: now,
      createdAt: (data as any).createdAt || now,
      bancaId: bancaId 
    };

    try {
      await setDoc(docRef, docData, { merge: true });
    } catch (error) {
      console.error(`[BaseRepo] Erro ao salvar em ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`[BaseRepo] Erro ao deletar ${id}:`, error);
      throw error;
    }
  }
}
