/**
 * @fileOverview Orquestrador central de sincronização de resultados.
 */

import { JDBNormalizedResult, SyncLogEntry } from "@/types/result-types";
import { PortalBrasilProvider } from "./result-providers/portal-brasil-provider";
import { getStorageItem, setStorageItem } from "@/utils/safe-local-storage";

const RESULTS_KEY = 'app:jdb_results:v1';
const SYNC_LOGS_KEY = 'app:jdb_sync_logs:v1';

export interface SyncSummary {
  news: number;
  updated: number;
  errors: number;
  totalProcessed: number;
}

export class ResultsSyncService {
  /**
   * Sincroniza resultados usando os providers disponíveis.
   */
  static async syncToday(): Promise<SyncSummary> {
    const currentResults = getStorageItem<JDBNormalizedResult[]>(RESULTS_KEY, []);
    
    let news = 0;
    let updated = 0;
    let errors = 0;

    try {
      this.addLog('Iniciando sincronização de resultados...', 'SUCCESS');
      
      const imported = await PortalBrasilProvider.fetchResults();
      
      // Se falhar o fetch, imported virá como array vazio
      if (!imported || imported.length === 0) {
        this.addLog('Nenhum resultado capturado pela fonte.', 'WARNING');
        return { news: 0, updated: 0, errors: 0, totalProcessed: 0 };
      }
      
      const newResultsList = [...currentResults];

      imported.forEach(result => {
        const uniqueKey = `${result.date}_${result.stateCode}_${result.extractionName}_${result.time}`.toLowerCase();
        
        const existingIdx = newResultsList.findIndex(r => {
          const rKey = `${r.date}_${r.stateCode}_${r.extractionName}_${r.time}`.toLowerCase();
          return rKey === uniqueKey;
        });
        
        if (existingIdx === -1) {
          // Resultado novo: Já entra como PUBLICADO e aguarda processamento pelo AppContext
          newResultsList.unshift({
            ...result,
            status: 'PUBLICADO',
            publishedAt: new Date().toISOString(),
            isSettled: false
          });
          news++;
        } else {
          const existing = newResultsList[existingIdx];
          // Se o checksum mudou (correção na fonte)
          if (existing.checksum !== result.checksum) {
            newResultsList[existingIdx] = { 
              ...existing, 
              ...result, 
              status: 'PUBLICADO',
              isSettled: false, // Força nova conferência se o resultado mudou
              updatedAt: new Date().toISOString()
            };
            updated++;
          }
        }
      });

      newResultsList.sort((a, b) => {
        const dateTimeA = `${a.date}T${a.time}`;
        const dateTimeB = `${b.date}T${b.time}`;
        return dateTimeB.localeCompare(dateTimeA);
      });

      setStorageItem(RESULTS_KEY, newResultsList.slice(0, 3000));
      
      this.addLog(`Sync finalizado: ${news} novos, ${updated} atualizados.`, 'SUCCESS');
      window.dispatchEvent(new Event('app:data-changed'));

      return { news, updated, errors, totalProcessed: imported.length };

    } catch (e: any) {
      errors++;
      this.addLog(`Falha na sincronização: ${e.message}`, 'ERROR');
      return { news, updated, errors, totalProcessed: 0 };
    }
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
    setStorageItem(SYNC_LOGS_KEY, [newLog, ...logs].slice(0, 100));
    window.dispatchEvent(new Event('app:data-changed'));
  }

  static clearLogs() {
    setStorageItem(SYNC_LOGS_KEY, []);
    window.dispatchEvent(new Event('app:data-changed'));
  }
}
