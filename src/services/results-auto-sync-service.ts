/**
 * @fileOverview Serviço de gerenciamento da sincronização automática.
 * Gerencia o estado e a lógica de decisão de disparo do scraper.
 */

import { getStorageItem, setStorageItem } from "@/utils/safe-local-storage";
import { ResultsSyncService, SyncSummary } from "./results-sync-service";

export interface AutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  status: 'idle' | 'running' | 'error';
  lastSummary: SyncSummary | null;
}

const AUTO_SYNC_KEY = 'app:jdb_auto_sync_cfg:v1';

const DEFAULT_CONFIG: AutoSyncConfig = {
  enabled: true,
  intervalMinutes: 5,
  lastRunAt: null,
  nextRunAt: null,
  status: 'idle',
  lastSummary: null
};

export class ResultsAutoSyncService {
  static getConfig(): AutoSyncConfig {
    return getStorageItem<AutoSyncConfig>(AUTO_SYNC_KEY, DEFAULT_CONFIG);
  }

  static updateConfig(updates: Partial<AutoSyncConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...updates };
    setStorageItem(AUTO_SYNC_KEY, updated);
    window.dispatchEvent(new Event('app:data-changed'));
  }

  /**
   * Executa um ciclo de sincronização automática se as condições forem atendidas.
   */
  static async runCycle(): Promise<SyncSummary | null> {
    const config = this.getConfig();
    if (!config.enabled || config.status === 'running') return null;

    this.updateConfig({ status: 'running' });

    try {
      const summary = await ResultsSyncService.syncToday();
      
      const now = new Date();
      const next = new Date(now.getTime() + config.intervalMinutes * 60000);

      this.updateConfig({
        status: 'idle',
        lastRunAt: now.toISOString(),
        nextRunAt: next.toISOString(),
        lastSummary: summary
      });

      return summary;
    } catch (error: any) {
      this.updateConfig({ status: 'error' });
      console.error('[AutoSync] Cycle failed:', error.message);
      return null;
    }
  }

  /**
   * Força uma execução imediata e reseta o timer
   */
  static async forceRun() {
    return this.runCycle();
  }
}
