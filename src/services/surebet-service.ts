/**
 * @fileOverview Serviço de busca e normalização de odds para Surebet via The Odds API.
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
  stakeA?: number;
  stakeB?: number;
}

// Chave de demonstração (substituir por env real em produção)
const THE_ODDS_API_KEY = "6792ae0bd6cfdaecae60cc6a"; 
const BASE_URL = "https://api.the-odds-api.com/v4/sports/soccer/odds/";

export class SurebetService {
  /**
   * Busca odds reais de casas externas.
   * Normaliza os dados para o formato exigido pelo motor de arbitragem.
   */
  static async fetchExternalOdds(): Promise<any[]> {
    try {
      const url = `${BASE_URL}?apiKey=${THE_ODDS_API_KEY}&regions=eu&markets=h2h`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) return [];

      return data.flatMap((event: any) => {
        if (!event.bookmakers || !Array.isArray(event.bookmakers)) return [];

        return event.bookmakers.map((bm: any) => {
          const market = bm.markets.find((m: any) => m.key === 'h2h');
          if (!market) return null;

          const oddsMap = market.outcomes.reduce((acc: any, o: any) => {
            acc[o.name.toLowerCase()] = o.price;
            return acc;
          }, {});

          return {
            eventId: event.id,
            sport: event.sport_title,
            league: event.league_title || event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: event.commence_time,
            odds: {
              home: oddsMap[event.home_team.toLowerCase()] || 1.0,
              away: oddsMap[event.away_team.toLowerCase()] || 1.0,
              draw: oddsMap['draw'] || 1.0
            },
            bookmaker: bm.title
          };
        }).filter(Boolean);
      });
    } catch (error: any) {
      console.error('[SurebetService] Erro ao buscar odds:', error.message);
      return [];
    }
  }
}
