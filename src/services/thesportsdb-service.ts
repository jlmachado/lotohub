/**
 * @fileOverview Serviço de integração com a API TheSportsDB (v1).
 * Foco em ligas brasileiras, times, eventos e classificação.
 */

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';

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
  private async request(endpoint: string) {
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        next: { revalidate: 300 } // Cache de 5 minutos
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`[TheSportsDB] Falha no endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  async getAllLeagues(): Promise<ApiLeague[]> {
    const data = await this.request('all_leagues.php');
    return data.leagues || [];
  }

  async getTeamsInLeague(leagueId: string): Promise<ApiTeam[]> {
    const data = await this.request(`lookup_all_teams.php?id=${leagueId}`);
    return data.teams || [];
  }

  async getNextMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsnextleague.php?id=${leagueId}`);
    return data.events || [];
  }

  async getPastMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventspastleague.php?id=${leagueId}`);
    return data.events || [];
  }

  async getStandings(leagueId: string, season: string = '2024'): Promise<ApiStanding[]> {
    const data = await this.request(`lookuptable.php?l=${leagueId}&s=${season}`);
    return data.table || [];
  }
}

export const theSportsDB = new TheSportsDBService();
