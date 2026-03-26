/**
 * @fileOverview Serviço de busca e normalização de odds para Surebet via The Odds API.
 * Integra dados internos com provedores externos reais.
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
  selection: string; 
  roi: number;
  profit: number;
  createdAt: string;
}

const THE_ODDS_API_KEY = "6792ae0bd6cfdaecae60cc6a"; // Placeholder - Substituir pela chave real do cliente
const BASE_URL = "https://api.the-odds-api.com/v4/sports/soccer/odds/";

export class SurebetService {
  /**
   * Busca odds reais de casas externas via The Odds API.
   */
  static async fetchExternalOdds(): Promise<any[]> {
    try {
      const url = `${BASE_URL}?apiKey=${THE_ODDS_API_KEY}&regions=eu&markets=h2h`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`The Odds API retornou status ${response.status}`);
      }

      const data = await response.json();

      return data.map((event: any) => {
        const bookmaker = event.bookmakers[0];
        if (!bookmaker || !bookmaker.markets[0]) return null;

        // Normaliza as odds para um mapa de fácil acesso
        const oddsMap = bookmaker.markets[0].outcomes.reduce((acc: any, o: any) => {
          acc[o.name.toLowerCase()] = o.price;
          return acc;
        }, {});

        return {
          eventId: event.id,
          sport: event.sport_title,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          startTime: event.commence_time,
          odds: {
            home: oddsMap[event.home_team.toLowerCase()] || 1.0,
            away: oddsMap[event.away_team.toLowerCase()] || 1.0,
            draw: oddsMap['draw'] || 1.0
          },
          bookmaker: bookmaker.title
        };
      }).filter(Boolean);
    } catch (error: any) {
      console.error('[SurebetService] Erro ao buscar odds externas:', error.message);
      return [];
    }
  }

  /**
   * Cruza eventos internos com externos para detectar oportunidades de arbitragem.
   */
  static detectOpportunities(internalMatches: any[], externalOdds: any[]): SurebetOpportunity[] {
    const opportunities: SurebetOpportunity[] = [];

    internalMatches.forEach(matchA => {
      // Encontra o evento correspondente na API externa
      const matchB = externalOdds.find(eb => 
        areTeamsSimilar(matchA.homeTeam, eb.homeTeam) &&
        Math.abs(new Date(matchA.kickoff).getTime() - new Date(eb.startTime).getTime()) < 15 * 60000 
      );

      if (!matchB) return;

      const scenarios = [
        { label: 'Mandante (1)', a: matchA.odds.home, b: matchB.odds.home },
        { label: 'Visitante (2)', a: matchA.odds.away, b: matchB.odds.away },
        { label: 'Empate (X)', a: matchA.odds.draw, b: matchB.odds.draw }
      ];

      scenarios.forEach(scen => {
        // Cálculo de ROI baseado na discrepância direta
        const roi = ((1 / ((1 / scen.a) + (1 / scen.b))) - 1) * 100;

        if (roi > 0.1) { // Limiar de detecção
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
            profit: 0,
            createdAt: new Date().toISOString()
          });
        }
      });
    });

    return opportunities.sort((a, b) => b.roi - a.roi);
  }
}
