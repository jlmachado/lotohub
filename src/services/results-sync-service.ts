/**
 * @fileOverview Orquestrador central de sincronização de resultados.
 */

import { JDBNormalizedResult, SyncLogEntry } from "@/types/result-types";
import { PortalBrasilProvider } from "./result-providers/portal-brasil-provider";
import { getStorageItem, setStorageItem } from "@/utils/safe-local-storage";

const RESULTS_KEY = 'app:jdb_results:v1';
const SYNC_LOGS_KEY = 'app:jdb_sync_logs:v1';

export class ResultsSyncService {
  /**
   * Sincroniza resultados do dia atual usando os providers disponíveis.
   */
  static async syncToday(): Promise<{ news: number; updated: number; errors: number }> {
    const logs = getStorageItem<SyncLogEntry[]>(SYNC_LOGS_KEY, []);
    const currentResults = getStorageItem<JDBNormalizedResult[]>(RESULTS_KEY, []);
    
    let news = 0;
    let updated = 0;
    let errors = 0;

    try {
      this.addLog('Iniciando sincronização automática', 'SUCCESS');
      
      const imported = await PortalBrasilProvider.fetchResults();
      
      const newResultsList = [...currentResults];

      imported.forEach(result => {
        const existingIdx = newResultsList.findIndex(r => r.id === result.id);
        
        if (existingIdx === -1) {
          newResultsList.unshift(result);
          news++;
        } else {
          const existing = newResultsList[existingIdx];
          // Se o resultado já existe mas o status permite atualização
          if (existing.status !== 'PUBLICADO' && existing.checksum !== result.checksum) {
            newResultsList[existingIdx] = { 
              ...existing, 
              ...result, 
              status: 'DIVERGENTE',
              updatedAt: new Date().toISOString()
            };
            updated++;
          }
        }
      });

      setStorageItem(RESULTS_KEY, newResultsList);
      this.addLog(`Sincronização concluída. ${news} novos, ${updated} atualizados.`, 'SUCCESS');

    } catch (e: any) {
      errors++;
      this.addLog(`Falha crítica no Sync: ${e.message}`, 'ERROR');
    }

    return { news, updated, errors };
  }

  private static addLog(message: string, status: SyncLogEntry['status']) {
    const logs = getStorageItem<SyncLogEntry[]>(SYNC_LOGS_KEY, []);
    const newLog: SyncLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SYNC',
      status,
      message
    };
    setStorageItem(SYNC_LOGS_KEY, [newLog, ...logs].slice(0, 100));
    window.dispatchEvent(new Event('app:data-changed'));
  }
}
