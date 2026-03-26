/**
 * @fileOverview Job de Automação Surebet.
 * Realiza a varredura e persistência de oportunidades no Firestore.
 */

import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { SurebetService } from './surebet-service';
import { ArbitrageEngine } from '@/utils/arbitrage-engine';
import { matchEvents } from '@/utils/matchEvents';

export class SurebetJob {
  /**
   * Executa um ciclo completo de detecção de arbitragem.
   * Filtra as melhores oportunidades e as persiste no banco de dados.
   */
  static async run(bancaId: string = 'default') {
    const { firestore } = initializeFirebase();
    
    try {
      // 1. Busca odds de múltiplos provedores
      const odds = await SurebetService.fetchExternalOdds();
      if (!odds || odds.length === 0) return [];

      const opportunities: any[] = [];

      // 2. Cruzamento quadrático para encontrar janelas de lucro
      for (let i = 0; i < odds.length; i++) {
        for (let j = i + 1; j < odds.length; j++) {
          // Só compara se for o mesmo jogo real
          if (!matchEvents(odds[i], odds[j])) continue;

          // Cenário: Casa na Bookmaker A vs Fora na Bookmaker B
          const res = ArbitrageEngine.calculate(odds[i].odds.home, odds[j].odds.away, 1000);
          if (res && res.roi > 0.5) { // ROI mínimo de 0.5% para ser listado
            opportunities.push({
              id: `sb-${odds[i].eventId}-${i}-${j}`,
              event: `${odds[i].homeTeam} vs ${odds[i].awayTeam}`,
              homeTeam: odds[i].homeTeam,
              awayTeam: odds[i].awayTeam,
              selection: 'Casa / Fora',
              ...res,
              bookmakerA: odds[i].bookmaker,
              bookmakerB: odds[j].bookmaker,
              bancaId,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. Persistência Cloud (Filtra as 10 melhores para performance)
      const topOpps = opportunities.sort((a, b) => b.roi - a.roi).slice(0, 10);
      const surebetsCol = collection(firestore, `bancas/${bancaId}/surebets`);

      for (const opp of topOpps) {
        await setDoc(doc(surebetsCol, opp.id), opp, { merge: true });
      }

      console.log(`[Surebet Scheduler] Ciclo concluído: ${topOpps.length} oportunidades salvas.`);
      return topOpps;

    } catch (error: any) {
      console.error('[Surebet Job Error]', error.message);
      throw error;
    }
  }
}
