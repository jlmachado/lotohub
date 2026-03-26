/**
 * @fileOverview Job de Automação Surebet.
 * Realiza a varredura, cruzamento e persistência de oportunidades no Firestore.
 */

import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { SurebetService } from './surebet-service';
import { ArbitrageEngine } from '@/utils/arbitrage-engine';
import { matchEvents } from '@/utils/matchEvents';

export class SurebetJob {
  /**
   * Executa um ciclo completo de detecção de arbitragem.
   */
  static async run(bancaId: string = 'default') {
    const { firestore } = initializeFirebase();
    
    try {
      console.log(`[Surebet Job] Iniciando varredura para banca: ${bancaId}`);
      
      // 1. Busca odds de múltiplos bookmakers
      const odds = await SurebetService.fetchExternalOdds();
      if (!odds || odds.length === 0) return [];

      const opportunities: any[] = [];

      // 2. Compara todos os pares em busca de arbitragem (Matching cruzado)
      for (let i = 0; i < odds.length; i++) {
        for (let j = i + 1; j < odds.length; j++) {
          // Só compara se for o mesmo evento real
          if (!matchEvents(odds[i], odds[j])) continue;

          // Cenário 1: Casa (Bookmaker A) vs Fora (Bookmaker B)
          const res1 = ArbitrageEngine.calculate(odds[i].odds.home, odds[j].odds.away, 1000);
          if (res1) {
            opportunities.push({
              id: `sb-${odds[i].eventId}-H${i}-A${j}`,
              event: `${odds[i].homeTeam} vs ${odds[i].awayTeam}`,
              homeTeam: odds[i].homeTeam,
              awayTeam: odds[i].awayTeam,
              selection: 'Vencedor Casa / Visitante',
              ...res1,
              bookmakerA: odds[i].bookmaker,
              bookmakerB: odds[j].bookmaker,
              bancaId,
              createdAt: new Date().toISOString()
            });
          }

          // Cenário 2: Fora (Bookmaker A) vs Casa (Bookmaker B)
          const res2 = ArbitrageEngine.calculate(odds[i].odds.away, odds[j].odds.home, 1000);
          if (res2) {
            opportunities.push({
              id: `sb-${odds[i].eventId}-A${i}-H${j}`,
              event: `${odds[i].homeTeam} vs ${odds[i].awayTeam}`,
              homeTeam: odds[i].homeTeam,
              awayTeam: odds[i].awayTeam,
              selection: 'Visitante / Vencedor Casa',
              ...res2,
              bookmakerA: odds[i].bookmaker,
              bookmakerB: odds[j].bookmaker,
              bancaId,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. Salva os resultados no Firestore (bancas/{bancaId}/surebets)
      const surebetsCol = collection(firestore, `bancas/${bancaId}/surebets`);
      
      // Persiste apenas as 15 melhores oportunidades para evitar flood no banco
      const topOpps = opportunities.sort((a, b) => b.roi - a.roi).slice(0, 15);

      for (const opp of topOpps) {
        const docRef = doc(surebetsCol, opp.id);
        await setDoc(docRef, opp, { merge: true });
      }

      console.log(`[Surebet Job] Ciclo finalizado. ${topOpps.length} oportunidades persistidas.`);
      return topOpps;

    } catch (error: any) {
      console.error('[Surebet Job Error]', error.message);
      throw error;
    }
  }
}
