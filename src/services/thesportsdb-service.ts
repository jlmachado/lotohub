/**
 * @fileOverview Serviço de integração com a API TheSportsDB (v1).
 * Consome o proxy interno para garantir estabilidade e tratamento de erros real.
 */

export interface ApiLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueAlternate?: string;
  strCountry?: string;
  strBadge?: string;
}

export interface ApiMatch {
  idEvent: string;
  idLeague: string;
  strLeague: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime: string;
  strStatus: string;
  strVenue?: string;
  strThumb?: string;
  idHomeTeam: string;
  idAwayTeam: string;
}

export interface ApiStanding {
  idTeam: string;
  strTeam: string;
  strTeamBadge: string;
  intRank: string;
  intPlayed: string;
  intWin: string;
  intLoss: string;
  intDraw: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intGoalDifference: string;
  intPoints: string;
}

class TheSportsDBService {
  /**
   * Faz requisição para a API TheSportsDB através da rota de proxy interna.
   * Lança erros reais para diagnóstico no frontend.
   */
  private async request(endpoint: string) {
    try {
      const response = await fetch(`/api/thesportsdb?endpoint=${encodeURIComponent(endpoint)}`, {
        cache: 'no-store'
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        const errorMsg = result.message || 'Erro desconhecido no proxy';
        const logMsg = `[TheSportsDB Service] Erro no endpoint ${endpoint}: ${errorMsg}`;
        console.error(logMsg, result);
        throw new Error(errorMsg);
      }
      
      return result.data;
    } catch (error: any) {
      console.error(`[TheSportsDB Service] Falha na comunicação:`, error.message);
      throw error;
    }
  }

  async getLeaguesByCountry(country: string = 'Brazil', sport: string = 'Soccer'): Promise<ApiLeague[]> {
    const data = await this.request(`search_all_leagues.php?c=${encodeURIComponent(country)}&s=${encodeURIComponent(sport)}`);
    return data?.countrys || [];
  }

  async getTeamsInLeague(leagueName: string): Promise<any[]> {
    const data = await this.request(`search_all_teams.php?l=${encodeURIComponent(leagueName)}`);
    return data?.teams || [];
  }

  async getNextMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsnextleague.php?id=${leagueId}`);
    return data?.events || [];
  }

  async getPastMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventspastleague.php?id=${leagueId}`);
    return data?.events || [];
  }

  async getMatchesByDate(date: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsday.php?d=${date}&s=Soccer`);
    return data?.events || [];
  }

  async getStandings(leagueId: string, season: string): Promise<ApiStanding[]> {
    const data = await this.request(`lookuptable.php?l=${leagueId}&s=${season}`);
    
    // Fallback para temporada anterior se a atual estiver vazia
    if (!data?.table) {
      const lastYear = String(parseInt(season) - 1);
      const fallbackData = await this.request(`lookuptable.php?l=${leagueId}&s=${lastYear}`);
      return fallbackData?.table || [];
    }
    
    return data?.table || [];
  }
}

export const theSportsDB = new TheSportsDBService();
