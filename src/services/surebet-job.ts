/**
 * @fileOverview Job de Automação Surebet.
 * Realiza a varredura e persistência de oportunidades no Firestore respeitando taxas administrativas.
 */

import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
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
      // 1. Busca configurações da banca
      const settingsRef = doc(firestore, `bancas/${bancaId}/configuracoes/surebet_settings`);
      const settingsSnap = await getDoc(settingsRef);
      const settings = settingsSnap.exists() ? settingsSnap.data() : { 
        enabled: true, 
        depositFee: 0, 
        withdrawFee: 0, 
        minRoi: 0.5 
      };

      if (!settings.enabled) return [];

      // 2. Busca odds de múltiplos provedores
      const odds = await SurebetService.fetchExternalOdds();
      if (!odds || odds.length === 0) return [];

      const opportunities: any[] = [];

      // 3. Cruzamento quadrático para encontrar janelas de lucro
      for (let i = 0; i < odds.length; i++) {
        for (let j = i + 1; j < odds.length; j++) {
          if (!matchEvents(odds[i], odds[j])) continue;

          // Cenário: Casa na Bookmaker A vs Fora na Bookmaker B
          // Aplica as taxas configuradas no painel admin
          const res = ArbitrageEngine.calculate(
            odds[i].odds.home, 
            odds[j].odds.away, 
            1000, 
            { deposit: settings.depositFee, withdraw: settings.withdrawFee }
          );

          if (res && res.roi >= settings.minRoi) { 
            opportunities.push({
              id: `sb-${odds[i].eventId}-${i}-${j}`,
              event: `${odds[i].homeTeam} vs ${odds[i].awayTeam}`,
              homeTeam: odds[i].homeTeam,
              awayTeam: odds[i].awayTeam,
              league: odds[i].league || 'Sportsbook',
              startTime: odds[i].startTime,
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

      // 4. Persistência Cloud (Filtra as 15 melhores para performance)
      const topOpps = opportunities.sort((a, b) => b.roi - a.roi).slice(0, 15);
      const surebetsCol = collection(firestore, `bancas/${bancaId}/surebets`);

      // Limpeza de oportunidades antigas (opcional, aqui apenas sobrescrevemos/adicionamos)
      for (const opp of topOpps) {
        await setDoc(doc(surebetsCol, opp.id), opp, { merge: true });
      }

      console.log(`[Surebet Job][${bancaId}] Ciclo concluído: ${topOpps.length} oportunidades salvas com ROI >= ${settings.minRoi}%`);
      return topOpps;

    } catch (error: any) {
      console.error('[Surebet Job Error]', error.message);
      throw error;
    }
  }
}
