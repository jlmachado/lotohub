/**
 * @fileOverview Provider real que consome a API interna de scraping do Portal Brasil.
 */

import { JDBNormalizedResult, JDBPrizeDetail } from "@/types/result-types";
import { JDB_STATES } from "@/utils/jdb-constants";

export class PortalBrasilProvider {
  static async fetchResults(): Promise<JDBNormalizedResult[]> {
    try {
      const response = await fetch('/api/resultados/jogodobicho');
      if (!response.ok) throw new Error('Falha na resposta do Scraper');
      
      const json = await response.json();
      if (!json.success || !json.data) return [];

      return json.data.map((ext: any) => {
        // Tentar encontrar o código do estado pelo nome
        const state = JDB_STATES.find(s => 
          ext.stateName.toLowerCase().includes(s.name.toLowerCase()) || 
          s.name.toLowerCase().includes(ext.stateName.toLowerCase())
        );

        const stateCode = state?.code || "UN";
        const stateName = state?.name || ext.stateName;

        return {
          id: `jdb-${ext.date}-${ext.time}-${stateCode.toLowerCase()}-${ext.extractionName.toLowerCase().replace(/\s/g, '-')}`,
          bancaId: 'global',
          stateCode,
          stateName,
          lotteryId: 'jdb',
          lotteryName: 'Jogo do Bicho',
          extractionName: ext.extractionName,
          date: ext.date,
          time: ext.time,
          status: 'IMPORTADO',
          sourceType: 'SCRAPER',
          sourceName: 'Portal Brasil',
          prizes: ext.prizes,
          checksum: ext.checksum,
          isDivergent: false,
          importedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as JDBNormalizedResult;
      });
    } catch (error) {
      console.error('[PortalBrasilProvider] Error:', error);
      throw error;
    }
  }
}
