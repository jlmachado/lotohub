/**
 * @fileOverview Provider real que consome a API interna de scraping do Portal Brasil.
 * Versão V2: Com normalização de ID e Nomes.
 */

import { JDBNormalizedResult } from "@/types/result-types";
import { normalizeString } from "@/lib/draw-engine";

export class PortalBrasilProvider {
  static async fetchResults(): Promise<JDBNormalizedResult[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/resultados/jogodobicho', { 
        signal: controller.signal,
        cache: 'no-store' 
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) return [];
      
      const json = await response.json();
      if (!json.success || !json.data) return [];

      return json.data.map((ext: any) => {
        const stateCode = ext.stateCode || "UN";
        const normalizedBank = normalizeString(ext.extractionName);
        
        // ID determinístico para evitar duplicidade
        const uniqueId = `jdb-${ext.date}-${ext.time}-${stateCode.toLowerCase()}-${normalizedBank.toLowerCase().replace(/\s/g, '-')}`;

        return {
          id: uniqueId,
          bancaId: 'global',
          stateCode,
          stateName: ext.stateName || "Nacional",
          lotteryId: 'jdb',
          lotteryName: 'Jogo do Bicho',
          extractionName: normalizedBank,
          date: ext.date,
          time: ext.time,
          status: 'PUBLICADO',
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
      console.error('[PortalBrasilProvider] Falha:', error);
      return [];
    }
  }
}
