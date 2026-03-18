'use client';

/**
 * @fileOverview Repositório Base Enterprise Multi-Tenant.
 * Implementa o padrão bancas/{bancaId}/{collection} para isolamento físico.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  QueryConstraint,
  CollectionReference,
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { resolveCurrentBanca } from '@/utils/bancaContext';

export class BaseRepository<T extends { id: string }> {
  protected db: Firestore;

  constructor(protected collectionName: string) {
    const { firestore } = initializeFirebase();
    this.db = firestore;
  }

  /**
   * Constrói o caminho da coleção baseado no Tenant ativo.
   * Garante isolamento absoluto: bancas/{bancaId}/{coleção}
   */
  protected getCollection(): CollectionReference<DocumentData> {
    const banca = resolveCurrentBanca();
    const bancaId = banca?.id || 'default';
    
    // Validação crítica: Não permite acesso a dados de banca sem bancaId, 
    // exceto para a própria coleção de bancas e resultados globais.
    if (!bancaId && this.collectionName !== 'bancas' && this.collectionName !== 'jdbResults') {
      throw new Error(`[CRITICAL] Tentativa de acesso à coleção ${this.collectionName} sem bancaId definido.`);
    }

    if (this.collectionName === 'bancas') {
      return collection(this.db, 'bancas');
    }

    if (this.collectionName === 'jdbResults') {
      return collection(this.db, 'jdbResults');
    }
    
    return collection(this.db, 'bancas', bancaId, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.getCollection(), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (e) {
      console.error(`[BaseRepo] Error getAll ${this.collectionName}:`, e);
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
      console.error(`[BaseRepo] Error getById ${id}:`, e);
      return null;
    }
  }

  async save(data: T): Promise<void> {
    const banca = resolveCurrentBanca();
    const bancaId = banca?.id || 'default';

    if (!bancaId && this.collectionName !== 'bancas' && this.collectionName !== 'jdbResults') {
      throw new Error(`[CRITICAL] bancaId obrigatório para salvar em ${this.collectionName}`);
    }

    const now = new Date().toISOString();
    const docRef = doc(this.getCollection(), data.id);
    
    const docData = {
      ...data,
      updatedAt: now,
      createdAt: (data as any).createdAt || now,
      bancaId: bancaId
    };

    try {
      console.log(`[BANCA] ${bancaId} | Salvando em ${this.collectionName}/${data.id}`);
      await setDoc(docRef, docData, { merge: true });
    } catch (error) {
      console.error(`[CRITICAL] Falha ao salvar em ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`[BaseRepo] Error delete ${id}:`, error);
      throw error;
    }
  }
}
