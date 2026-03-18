
'use client';

/**
 * @fileOverview MigrationService - Motor de espelhamento total LocalStorage -> Firebase.
 * Sincroniza todas as chaves existentes para garantir persistência na nuvem.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { Firestore } from 'firebase/firestore';
import { BaseRepository } from '@/repositories/base-repository';

const CLOUD_SYNC_STATUS_KEY = 'app:cloud_sync:status:v2';

export class MigrationService {
  /**
   * Executa a migração de todas as chaves do sistema para o Firestore.
   */
  static async syncToCloud(db: Firestore) {
    if (typeof window === 'undefined') return;

    const syncStatus = getStorageItem(CLOUD_SYNC_STATUS_KEY, { lastFullSync: null });
    const now = Date.now();

    // Evita loop de sincronização, mas permite um check a cada 30 minutos
    if (syncStatus.lastFullSync && (now - syncStatus.lastFullSync < 1800000)) return;

    console.log("🚀 Iniciando migração de segurança para nuvem...");

    const collectionsToSync = [
      { local: 'app:users:v1', cloud: 'users', idKey: 'terminal' },
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
      for (const mapping of collectionsToSync) {
        const items = getStorageItem<any[]>(mapping.local, []);
        if (items.length === 0) continue;

        const repo = new BaseRepository<any>(db, mapping.cloud);
        
        for (const item of items) {
          // Garante ID consistente para o Firestore
          const docId = item.id || (mapping.idKey === 'terminal' ? `u-${item.terminal}` : null);
          if (docId) {
            repo.save({ ...item, id: docId });
          }
        }
        console.log(`✅ Coleção [${mapping.cloud}] sincronizada.`);
      }

      setStorageItem(CLOUD_SYNC_STATUS_KEY, { lastFullSync: now });
      console.log("💎 Sincronização Cloud finalizada com sucesso.");
    } catch (e) {
      console.error("❌ Erro durante migração para o Firebase:", e);
    }
  }
}
