/**
 * @fileOverview Provider real que consome a API interna de scraping do Portal Brasil.
 */

import { JDBNormalizedResult } from "@/types/result-types";

export class PortalBrasilProvider {
  static async fetchResults(): Promise<JDBNormalizedResult[]> {
    try {
      // Adicionado AbortController para timeout de 25 segundos no client
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/resultados/jogodobicho', { 
        signal: controller.signal,
        cache: 'no-store' 
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[PortalBrasilProvider] Scraper retornou status:', response.status);
        return [];
      }
      
      const json = await response.json();
      if (!json.success || !json.data) return [];

      return json.data.map((ext: any) => {
        const stateCode = ext.stateCode || "UN";
        const stateName = ext.stateName || "Desconhecido";

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[PortalBrasilProvider] Timeout na requisição ao Scraper (25s)');
      } else {
        console.error('[PortalBrasilProvider] Falha de rede ou servidor:', error.message);
      }
      return []; // Retorna array vazio em vez de crashar
    }
  }
}
