'use client';

/**
 * @fileOverview Serviço de migração LocalStorage -> Firebase Firestore.
 */

import { getStorageItem, setStorageItem } from '@/utils/safe-local-storage';
import { usersRepo } from '@/repositories/users-repository';
import { bancasRepo } from '@/repositories/bancas-repository';
import { ledgerRepo } from '@/repositories/ledger-repository';
import { BaseRepository } from '@/repositories/base-repository';

const MIGRATION_STATUS_KEY = 'app:migration:firebase:v1';

export class MigrationService {
  static async run() {
    if (typeof window === 'undefined') return;

    const status = getStorageItem(MIGRATION_STATUS_KEY, { done: false });
    if (status.done) return;

    console.log("🚀 Iniciando migração para Firebase Cloud...");

    try {
      // 1. Migrar Usuários
      const users = getStorageItem('app:users:v1', []);
      for (const user of users) {
        await usersRepo.save(user);
      }

      // 2. Migrar Bancas
      const bancas = getStorageItem('app:bancas:v1', []);
      for (const banca of bancas) {
        await bancasRepo.save(banca);
      }

      // 3. Migrar Ledger
      const ledger = getStorageItem('app:ledger:v1', []);
      for (const entry of ledger) {
        await ledgerRepo.save(entry);
      }

      // 4. Migrar Outras Entidades
      await this.migrateGeneric('app:banners:v1', 'banners');
      await this.migrateGeneric('app:popups:v1', 'popups');
      await this.migrateGeneric('news_messages', 'newsMessages');
      await this.migrateGeneric('app:football_bets:v1', 'footballBets');

      setStorageItem(MIGRATION_STATUS_KEY, { done: true, at: new Date().toISOString() });
      console.log("✅ Migração Cloud concluída com sucesso.");
    } catch (e) {
      console.error("❌ Falha na migração Cloud:", e);
    }
  }

  private static async migrateGeneric(localKey: string, collectionName: string) {
    const items = getStorageItem(localKey, []);
    const repo = new BaseRepository<any>(collectionName);
    for (const item of items) {
      if (item.id) await repo.save(item);
    }
  }
}
