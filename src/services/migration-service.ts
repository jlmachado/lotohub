
'use client';

/**
 * @fileOverview MigrationService - Motor de espelhamento total LocalStorage -> Firebase.
 * Sincroniza todas as chaves existentes para garantir persistência na nuvem.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { Firestore } from 'firebase/firestore';
import { BaseRepository } from '@/repositories/base-repository';

const CLOUD_SYNC_STATUS_KEY = 'app:cloud_sync:status:v4';

export class MigrationService {
  /**
   * Executa a migração de todas as chaves do sistema para o Firestore.
   */
  static async syncToCloud(db: Firestore) {
    if (typeof window === 'undefined') return;

    console.log("🚀 [Migration] Iniciando espelhamento total com Firebase...");

    const collectionsToSync = [
      { local: 'app:users:v1', cloud: 'users' },
      { local: 'app:bancas:v1', cloud: 'bancas' },
      { local: 'app:ledger:v1', cloud: 'ledgerEntries' },
      { local: 'app:apostas:v1', cloud: 'apostas' },
      { local: 'app:football_bets:v1', cloud: 'football_bets' },
      { local: 'app:snooker_channels:v1', cloud: 'snooker_channels' },
      { local: 'app:snooker_bets:v1', cloud: 'snooker_bets' },
      { local: 'app:snooker_history:v1', cloud: 'snooker_history' },
      { local: 'app:bingo_draws:v1', cloud: 'bingo_draws' },
      { local: 'app:bingo_tickets:v1', cloud: 'bingo_tickets' },
      { local: 'app:banners:v1', cloud: 'banners' },
      { local: 'app:popups:v1', cloud: 'popups' },
      { local: 'news_messages', cloud: 'news_messages' },
      { local: 'app:jdb_results:v1', cloud: 'jdbResults' },
      { local: 'app:casino_settings:v1', cloud: 'system_settings', isSingleDoc: true, docId: 'casino_settings' },
      { local: 'app:bingo_settings:v1', cloud: 'system_settings', isSingleDoc: true, docId: 'bingo_settings' },
      { local: 'app:snooker_cfg:v1', cloud: 'system_settings', isSingleDoc: true, docId: 'snooker_live_config' }
    ];

    try {
      let totalItemsSynced = 0;

      for (const mapping of collectionsToSync) {
        const localData = getStorageItem<any>(mapping.local, null);
        
        if (!localData) continue;

        const repo = new BaseRepository<any>(mapping.cloud);

        if ((mapping as any).isSingleDoc) {
          repo.save({ ...localData, id: (mapping as any).docId });
          totalItemsSynced++;
          continue;
        }

        if (Array.isArray(localData)) {
          console.log(`- [Migration] Sincronizando ${localData.length} itens de ${mapping.cloud}...`);
          for (const item of localData) {
            const docId = item.id || (item.terminal ? `u-${item.terminal}` : null);
            if (docId) {
              repo.save({ ...item, id: docId });
              totalItemsSynced++;
            }
          }
        }
      }

      console.log(`💎 [Migration] Sincronização finalizada! ${totalItemsSynced} registros enviados.`);
    } catch (e) {
      console.error("❌ [Migration] Erro crítico:", e);
    }
  }
}
