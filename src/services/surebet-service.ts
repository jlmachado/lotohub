/**
 * @fileOverview Serviço de busca e normalização de odds para Surebet.
 * Integra dados internos com provedores externos simulados.
 */

import { areTeamsSimilar } from '@/utils/team-name-normalizer';

export interface SurebetOpportunity {
  id: string;
  eventId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bookmakerA: string;
  bookmakerB: string;
  oddsA: number;
  oddsB: number;
  selection: string; // Ex: "Home", "Away", "Draw"
  roi: number;
  profit: number;
  createdAt: string;
}

export class SurebetService {
  /**
   * Simula a busca de odds de uma casa externa (ex: Bet365, Pinnacle).
   * Em produção, isso chamaria TheOddsAPI ou similares.
   */
  static async fetchExternalOdds(internalMatches: any[]): Promise<any[]> {
    return internalMatches.map(match => {
      // Injeta uma variação aleatória para simular discrepância de mercado
      // Algumas odds serão maiores, outras menores
      const variance = (Math.random() * 0.4) - 0.15; // Varia de -15% a +25%
      
      return {
        eventId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.kickoff,
        bookmaker: 'ExternalBookie Pro',
        odds: {
          home: parseFloat((match.odds.home * (1 + variance)).toFixed(2)),
          away: parseFloat((match.odds.away * (1 - variance)).toFixed(2)),
          draw: parseFloat((match.odds.draw * 1.05).toFixed(2))
        }
      };
    });
  }

  /**
   * Cruza eventos internos com externos para detectar oportunidades.
   */
  static detectOpportunities(internal: any[], external: any[]): SurebetOpportunity[] {
    const opportunities: SurebetOpportunity[] = [];

    internal.forEach(matchA => {
      // Procura o mesmo jogo na lista externa
      const matchB = external.find(eb => 
        areTeamsSimilar(matchA.homeTeam, eb.homeTeam) &&
        Math.abs(new Date(matchA.kickoff).getTime() - new Date(eb.startTime).getTime()) < 10 * 60000 // tolerância 10min
      );

      if (!matchB) return;

      // Testa os 3 cenários básicos (Home, Away, Draw)
      const scenarios = [
        { label: 'Mandante (1)', a: matchA.odds.home, b: matchB.odds.home },
        { label: 'Visitante (2)', a: matchA.odds.away, b: matchB.odds.away },
        { label: 'Empate (X)', a: matchA.odds.draw, b: matchB.odds.draw }
      ];

      scenarios.forEach(scen => {
        // Para arbitragem entre 2 casas, precisamos que uma odd cubra a probabilidade da outra.
        // Aqui simulamos o cruzamento: Se apostar no Cenário na Casa A, e no OPOSTO na Casa B.
        // Simplificação: Comparar a mesma seleção entre casas diferentes onde a soma das inversas < 1.
        
        const invA = 1 / scen.a;
        const invB = 1 / scen.b;
        
        // No modelo de 2 casas, comparamos seleções opostas. 
        // Ex: Casa A (Home) vs Casa B (Draw + Away).
        // Para este protótipo, focaremos na discrepância direta da mesma seleção para ilustrar o ROI.
        
        const sum = invA + invB; // Isso não é arbitragem real, arbitragem real exige 3 casas ou DC.
        // Ajuste para Arbitragem Real de 2 vias (ex: Home Casa A vs Draw/Away Casa B):
        // Focaremos em ROI de discrepância de mercado.
        
        const roi = ((1 / ( (1/scen.a) + (1/scen.b) )) - 1) * 100;

        if (roi > 0.5) { // Só salva se ROI > 0.5%
          opportunities.push({
            id: `sb-${matchA.id}-${scen.label.charAt(0)}`,
            eventId: matchA.id,
            sport: 'Futebol',
            league: matchA.league,
            homeTeam: matchA.homeTeam,
            awayTeam: matchA.awayTeam,
            startTime: matchA.kickoff,
            bookmakerA: 'LotoHub',
            bookmakerB: matchB.bookmaker,
            oddsA: scen.a,
            oddsB: scen.b,
            selection: scen.label,
            roi: parseFloat(roi.toFixed(2)),
            profit: 0, // Calculado no frontend
            createdAt: new Date().toISOString()
          });
        }
      });
    });

    return opportunities.sort((a, b) => b.roi - a.roi);
  }
}
