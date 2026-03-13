/**
 * @fileOverview Provider real que consome a API interna de scraping do Portal Brasil.
 */

import { JDBNormalizedResult, JDBPrizeDetail } from "@/types/result-types";
import { normalizePrize, generateResultChecksum } from "@/utils/jdb-utils";

export class PortalBrasilProvider {
  static async fetchResults(date?: string): Promise<JDBNormalizedResult[]> {
    try {
      const response = await fetch('/api/resultados/jogodobicho');
      if (!response.ok) throw new Error('Falha na resposta do Scraper');
      
      const data = await response.json();
      if (!data.extracoes) return [];

      const normalizedDate = data.data.split('/').reverse().join('-');

      return data.extracoes.map((ext: any) => {
        const time = ext.titulo.split('–')[0].trim().replace('h', ':');
        const name = ext.titulo.split('–')[1]?.trim() || 'Importado';
        
        const rawPrizes = ext.itens.map((i: any) => i.numero);
        const prizes: JDBPrizeDetail[] = ext.itens.map((item: any) => 
          normalizePrize(item.numero, item.pos)
        );

        return {
          id: `jdb-${normalizedDate}-${time}-${name.toLowerCase().replace(/\s/g, '-')}`,
          bancaId: 'global',
          lotteryId: name.toLowerCase(),
          lotteryName: name,
          extractionName: name,
          date: normalizedDate,
          time,
          status: 'IMPORTADO',
          sourceType: 'SCRAPER',
          sourceName: 'Portal Brasil',
          prizes,
          checksum: generateResultChecksum(rawPrizes),
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
