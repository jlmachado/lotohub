'use client';

/**
 * @fileOverview Serviço de Sincronização Silenciosa LocalStorage -> Firebase Cloud.
 * Este serviço garante que dados locais sejam espelhados na nuvem sem deletar nada local.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { Firestore } from 'firebase/firestore';
import { BaseRepository } from '@/repositories/base-repository';

const CLOUD_SYNC_STATUS_KEY = 'app:cloud_sync:status:v1';

export class MigrationService {
  /**
   * Executa a sincronização de "espelhamento" de forma não destrutiva.
   */
  static async syncToCloud(db: Firestore) {
    if (typeof window === 'undefined') return;

    const syncStatus = getStorageItem(CLOUD_SYNC_STATUS_KEY, { lastSync: null });
    
    // Evita sync excessivo (roda uma vez por sessão ou a cada 1 hora)
    const now = Date.now();
    if (syncStatus.lastSync && (now - syncStatus.lastSync < 3600000)) return;

    console.log("☁️ Sincronizando dados locais com a nuvem...");

    try {
      // 1. Sincronizar Usuários (Promotores, Cambistas, Admins inclusive)
      await this.mirrorCollection(db, 'app:users:v1', 'users');

      // 2. Sincronizar Bancas
      await this.mirrorCollection(db, 'app:bancas:v1', 'bancas');

      // 3. Sincronizar Livro Razão (Ledger)
      await this.mirrorCollection(db, 'app:ledger:v1', 'ledgerEntries');

      // 4. Sincronizar Apostas de Futebol
      await this.mirrorCollection(db, 'app:football_bets:v1', 'football_bets');

      // 5. Sincronizar Apostas de Loteria
      await this.mirrorCollection(db, 'app:apostas:v1', 'apostas');

      setStorageItem(CLOUD_SYNC_STATUS_KEY, { lastSync: now });
      console.log("✅ Dados espelhados na nuvem com sucesso.");
    } catch (e) {
      console.error("⚠️ Falha parcial na sincronização cloud:", e);
    }
  }

  /**
   * Lê do LocalStorage e garante que o Firestore tenha a mesma versão (sem apagar local).
   */
  private static async mirrorCollection(db: Firestore, localKey: string, collectionName: string) {
    const localItems = getStorageItem<any[]>(localKey, []);
    if (localItems.length === 0) return;

    const repo = new BaseRepository<any>(db, collectionName);
    
    // Faz o upload de cada item. O BaseRepository.save usa merge:true,
    // então ele apenas atualiza ou cria, nunca apaga.
    for (const item of localItems) {
      if (item.id || item.terminal) {
        // Normaliza ID caso seja terminal
        const id = item.id || `u-${item.terminal}`;
        repo.save({ ...item, id });
      }
    }
  }
}
