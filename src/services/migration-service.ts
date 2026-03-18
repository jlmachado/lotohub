
'use client';

/**
 * @fileOverview MigrationService - Motor de espelhamento total LocalStorage -> Firebase.
 * Sincroniza todas as chaves existentes para garantir persistência na nuvem.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { Firestore } from 'firebase/firestore';
import { BaseRepository } from '@/repositories/base-repository';

const CLOUD_SYNC_STATUS_KEY = 'app:cloud_sync:status:v3';

export class MigrationService {
  /**
   * Executa a migração de todas as chaves do sistema para o Firestore.
   */
  static async syncToCloud(db: Firestore) {
    if (typeof window === 'undefined') return;

    console.log("🚀 [Migration] Iniciando verificação de sincronismo com Firebase...");

    const collectionsToSync = [
      { local: 'app:users:v1', cloud: 'users', idKey: 'id' },
      { local: 'app:bancas:v1', cloud: 'bancas', idKey: 'id' },
      { local: 'app:ledger:v1', cloud: 'ledgerEntries', idKey: 'id' },
      { local: 'app:apostas:v1', cloud: 'apostas', idKey: 'id' },
      { local: 'app:football_bets:v1', cloud: 'football_bets', idKey: 'id' },
      { local: 'app:snooker_channels:v1', cloud: 'snooker_channels', idKey: 'id' },
      { local: 'app:bingo_draws:v1', cloud: 'bingo_draws', idKey: 'id' },
      { local: 'app:bingo_tickets:v1', cloud: 'bingo_tickets', idKey: 'id' },
      { local: 'app:banners:v1', cloud: 'banners', idKey: 'id' },
      { local: 'app:popups:v1', cloud: 'popups', idKey: 'id' },
      { local: 'news_messages', cloud: 'news_messages', idKey: 'id' }
    ];

    try {
      let totalItemsSynced = 0;

      for (const mapping of collectionsToSync) {
        const items = getStorageItem<any[]>(mapping.local, []);
        if (!items || items.length === 0) {
          console.log(`- [Migration] Coleção local ${mapping.local} está vazia.`);
          continue;
        }

        console.log(`- [Migration] Sincronizando ${items.length} itens para a coleção [${mapping.cloud}]...`);
        const repo = new BaseRepository<any>(db, mapping.cloud);
        
        for (const item of items) {
          // Garante ID consistente para o Firestore
          const docId = item.id || (item.terminal ? `u-${item.terminal}` : null);
          if (docId) {
            repo.save({ ...item, id: docId });
            totalItemsSynced++;
          }
        }
      }

      setStorageItem(CLOUD_SYNC_STATUS_KEY, { lastFullSync: Date.now(), total: totalItemsSynced });
      console.log(`💎 [Migration] Sincronização finalizada! ${totalItemsSynced} registros enviados.`);
    } catch (e) {
      console.error("❌ [Migration] Erro durante migração para o Firebase:", e);
    }
  }
}
