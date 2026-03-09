/**
 * @fileOverview Serviço oficial e exclusivo de integração com a API TheSportsDB (v1).
 * Fonte única de dados para o módulo de futebol utilizando a chave Free 123 via proxy interno.
 */

export interface ApiLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueAlternate?: string;
  strCountry?: string;
  strBadge?: string;
}

export interface ApiTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strTeamBadge?: string;
  strStadium?: string;
  strLocation?: string;
  idLeague: string;
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
   * Isso resolve erros de "Failed to fetch" no browser.
   */
  private async request(endpoint: string) {
    try {
      const response = await fetch(`/api/thesportsdb?endpoint=${encodeURIComponent(endpoint)}`);
      
      if (!response.ok) {
        if (response.status === 404) return { error: true, code: 404 };
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[TheSportsDB Proxy Request] Falha no endpoint ${endpoint}:`, error);
      return { error: true, message: String(error) };
    }
  }

  async getLeaguesByCountry(country: string = 'Brazil', sport: string = 'Soccer'): Promise<ApiLeague[]> {
    const data = await this.request(`search_all_leagues.php?c=${encodeURIComponent(country)}&s=${encodeURIComponent(sport)}`);
    if (data?.error) return [];
    return data?.countrys || [];
  }

  async getTeamsInLeague(leagueName: string): Promise<ApiTeam[]> {
    const data = await this.request(`search_all_teams.php?l=${encodeURIComponent(leagueName)}`);
    if (data?.error) return [];
    return data?.teams || [];
  }

  async getNextMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsnextleague.php?id=${leagueId}`);
    if (data?.error) return [];
    return data?.events || [];
  }

  async getPastMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventspastleague.php?id=${leagueId}`);
    if (data?.error) return [];
    return data?.events || [];
  }

  async getMatchesByDate(date: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsday.php?d=${date}&s=Soccer`);
    if (data?.error) return [];
    return data?.events || [];
  }

  async getStandings(leagueId: string, season: string): Promise<ApiStanding[]> {
    const data = await this.request(`lookuptable.php?l=${leagueId}&s=${season}`);
    
    if (!data?.table) {
      const lastYear = String(parseInt(season) - 1);
      const fallbackData = await this.request(`lookuptable.php?l=${leagueId}&s=${lastYear}`);
      if (fallbackData?.error) return [];
      return fallbackData?.table || [];
    }
    
    return data?.table || [];
  }
}

export const theSportsDB = new TheSportsDBService();
