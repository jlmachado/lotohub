'use client';

/**
 * @fileOverview Repositório Base SaaS Multi-Tenant.
 * Garante que todas as operações incluam e validem o bancaId.
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
  QueryConstraint,
  CollectionReference,
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { getActiveContext } from '@/utils/bancaContext';

export class BaseRepository<T extends { id: string; bancaId?: string }> {
  protected db: Firestore;

  constructor(protected collectionName: string) {
    const { firestore } = initializeFirebase();
    this.db = firestore;
  }

  protected getCollection(): CollectionReference<DocumentData> {
    return collection(this.db, this.collectionName);
  }

  /**
   * Retorna o bancaId do contexto atual.
   * Lança erro se não houver contexto, garantindo isolamento.
   */
  private getTenantId(): string {
    const context = getActiveContext();
    const id = context?.bancaId || 'default';
    
    if (!id && this.collectionName !== 'bancas') {
      console.error(`[TENANT ERROR] Operação bloqueada em ${this.collectionName}: bancaId ausente.`);
      throw new Error("Contexto de banca obrigatório para esta operação.");
    }
    
    return id;
  }

  /**
   * Busca todos os registros filtrando obrigatoriamente pela banca atual.
   */
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const bancaId = this.getTenantId();
      const tenantConstraint = where('bancaId', '==', bancaId);
      
      const q = query(this.getCollection(), tenantConstraint, ...constraints);
      const snapshot = await getDocs(q);
      
      console.log(`[BANCA: ${bancaId}] Fetched ${snapshot.size} records from ${this.collectionName}`);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (e) {
      console.error(`Error fetching from ${this.collectionName}:`, e);
      return [];
    }
  }

  /**
   * Busca um registro por ID validando se pertence à banca ativa.
   */
  async getById(id: string): Promise<T | null> {
    if (!id) return null;
    try {
      const bancaId = this.getTenantId();
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data() as T;
      
      // Validação Crítica de Segurança SaaS
      if (data.bancaId && data.bancaId !== bancaId && bancaId !== 'global') {
        console.error(`[SECURITY ALERT] Tentativa de acesso cross-tenant: ID ${id} não pertence à banca ${bancaId}`);
        return null;
      }

      return { ...data, id: docSnap.id };
    } catch (e) {
      console.error(`Error fetching ${id} from ${this.collectionName}:`, e);
      return null;
    }
  }

  /**
   * Salva dados no Firestore com await e injeção automática de bancaId.
   */
  async save(data: T): Promise<void> {
    const bancaId = data.bancaId || this.getTenantId();
    
    if (!bancaId && this.collectionName !== 'bancas') {
      throw new Error("bancaId obrigatório para salvar dados.");
    }

    const now = new Date().toISOString();
    const docRef = doc(this.db, this.collectionName, data.id);
    
    const docData = {
      ...data,
      bancaId,
      updatedAt: now,
      createdAt: (data as any).createdAt || now
    };

    try {
      console.log(`[BANCA: ${bancaId}] Gravando em ${this.collectionName}/${data.id}...`);
      await setDoc(docRef, docData, { merge: true });
    } catch (error) {
      console.error(`[CRITICAL ERROR] Falha ao salvar em ${this.collectionName}:`, error);
      throw error; // Re-throw para o chamador tratar (UI)
    }
  }

  /**
   * Exclui um registro validando a posse da banca.
   */
  async delete(id: string): Promise<void> {
    try {
      const bancaId = this.getTenantId();
      const existing = await this.getById(id);
      
      if (!existing) return;

      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);
      console.log(`[BANCA: ${bancaId}] Record ${id} deleted from ${this.collectionName}`);
    } catch (error) {
      console.error(`[Firestore Delete Error] ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }
}
