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
      
      const newResultsList = [...currentResults];

      imported.forEach(result => {
        // Chave única para evitar duplicidade entre estados e extrações
        const uniqueKey = `${result.date}_${result.stateCode}_${result.extractionName}`.toLowerCase();
        
        const existingIdx = newResultsList.findIndex(r => {
          const rKey = `${r.date}_${r.stateCode}_${r.extractionName}`.toLowerCase();
          return rKey === uniqueKey;
        });
        
        if (existingIdx === -1) {
          newResultsList.unshift(result);
          news++;
        } else {
          const existing = newResultsList[existingIdx];
          // Se o resultado já existe mas o status permite atualização (não publicado)
          // ou se o checksum mudou (indicando correção na fonte)
          if (existing.status !== 'PUBLICADO' && existing.checksum !== result.checksum) {
            newResultsList[existingIdx] = { 
              ...existing, 
              ...result, 
              status: existing.status === 'DIVERGENTE' ? 'DIVERGENTE' : 'IMPORTADO',
              updatedAt: new Date().toISOString()
            };
            updated++;
          }
        }
      });

      // Ordenar por data e hora decrescente
      newResultsList.sort((a, b) => {
        const dateTimeA = `${a.date}T${a.time}`;
        const dateTimeB = `${b.date}T${b.time}`;
        return dateTimeB.localeCompare(dateTimeA);
      });

      setStorageItem(RESULTS_KEY, newResultsList.slice(0, 2000)); // Manter histórico saudável
      
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

  /**
   * Limpa logs antigos de sincronização
   */
  static clearLogs() {
    setStorageItem(SYNC_LOGS_KEY, []);
    window.dispatchEvent(new Event('app:data-changed'));
  }
}
