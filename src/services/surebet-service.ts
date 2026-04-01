/**
 * @fileOverview Serviço de busca e normalização de odds para Surebet via The Odds API.
 * Implementa Mock Mode para garantir funcionamento mesmo sem chave de API válida (Error 401).
 */

export interface SurebetOpportunity {
  id: string;
  eventId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  bookmaker: string; // Adicionado para compatibilidade com o job
  odds: {
    home: number;
    away: number;
    draw: number;
  };
}

// Chave de demonstração (Substitua por uma real para produção)
const THE_ODDS_API_KEY = "6792ae0bd6cfdaecae60cc6a"; 
const BASE_URL = "https://api.the-odds-api.com/v4/sports/soccer/odds/";

export class SurebetService {
  /**
   * Busca odds reais de casas externas.
   * Implementa Fallback para Mocks em caso de erro 401 (Não autorizado).
   */
  static async fetchExternalOdds(): Promise<any[]> {
    try {
      const url = `${BASE_URL}?apiKey=${THE_ODDS_API_KEY}&regions=eu&markets=h2h`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (response.status === 401) {
        console.warn('[SurebetService] Chave de API inválida (401). Utilizando modo de simulação (Mock Mode).');
        return this.getMockOdds();
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) return this.getMockOdds();

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
              draw: oddsMap['draw'] || oddsMap['draw'] || 1.0
            },
            bookmaker: bm.title
          };
        }).filter(Boolean);
      });
    } catch (error: any) {
      console.warn('[SurebetService] Falha na conexão:', error.message);
      return this.getMockOdds();
    }
  }

  /**
   * Gera oportunidades simuladas de alta qualidade para o protótipo.
   */
  private static getMockOdds(): any[] {
    const teams = [
      { h: 'Real Madrid', a: 'Barcelona', l: 'La Liga' },
      { h: 'Manchester City', a: 'Arsenal', l: 'Premier League' },
      { h: 'Bayern Munich', a: 'Dortmund', l: 'Bundesliga' },
      { h: 'Flamengo', a: 'Palmeiras', l: 'Brasileirão' },
      { h: 'Liverpool', a: 'Chelsea', l: 'Premier League' }
    ];

    const bookmakers = ['Bet365', 'Betano', 'Pinacle', 'Betfair', 'SportingBet'];
    const results: any[] = [];

    teams.forEach((t, i) => {
      // Gera odds ligeiramente diferentes para cada bookmaker para criar surebets
      bookmakers.forEach((bm, idx) => {
        const variance = (idx * 0.05);
        results.push({
          eventId: `mock-event-${i}`,
          sport: 'Soccer',
          league: t.l,
          homeTeam: t.h,
          awayTeam: t.a,
          startTime: new Date(Date.now() + 3600000).toISOString(),
          odds: {
            home: parseFloat((1.90 + variance).toFixed(2)),
            draw: 3.40,
            away: parseFloat((3.80 - variance).toFixed(2))
          },
          bookmaker: bm
        });
      });
    });

    return results;
  }
}
