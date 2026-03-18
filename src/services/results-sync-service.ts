
/**
 * @fileOverview Orquestrador central de sincronização de resultados.
 * Refatorado para retornar os dados para o AppContext salvar no Firestore.
 */

import { JDBNormalizedResult, SyncLogEntry } from "@/types/result-types";
import { PortalBrasilProvider } from "./result-providers/portal-brasil-provider";
import { getStorageItem, setStorageItem } from "@/utils/safe-local-storage";

const SYNC_LOGS_KEY = 'app:jdb_sync_logs:v1';

export interface SyncSummary {
  news: number;
  updated: number;
  errors: number;
  totalProcessed: number;
}

export class ResultsSyncService {
  /**
   * Captura os resultados externos.
   */
  static async fetchExternal(): Promise<JDBNormalizedResult[]> {
    return await PortalBrasilProvider.fetchResults();
  }

  /**
   * Sincroniza e retorna os resultados formatados para o dia de hoje.
   */
  static async syncToday(): Promise<SyncSummary> {
    try {
      this.addLog('Iniciando sincronização de resultados...', 'SUCCESS');
      const imported = await this.fetchExternal();
      return { news: imported.length, updated: 0, errors: 0, totalProcessed: imported.length };
    } catch (e: any) {
      this.addLog(`Falha na sincronização: ${e.message}`, 'ERROR');
      return { news: 0, updated: 0, errors: 1, totalProcessed: 0 };
    }
  }

  static async getLatestResults(): Promise<JDBNormalizedResult[]> {
    return await this.fetchExternal();
  }

  static addLog(message: string, status: SyncLogEntry['status'], action: string = 'SYNC') {
    const logs = getStorageItem<SyncLogEntry[]>(SYNC_LOGS_KEY, []);
    const newLog: SyncLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action,
      status,
      message
    };
    setStorageItem(SYNC_LOGS_KEY, [newLog, ...logs].slice(0, 50));
  }
}
