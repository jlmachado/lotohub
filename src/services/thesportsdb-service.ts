/**
 * @fileOverview Serviço de integração com a API TheSportsDB (v1).
 * Foco em ligas brasileiras, times, eventos e classificação.
 */

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/1';

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
      return { error: true, message: String(error) };
    }
  }

  // Busca todas as ligas filtradas por país e esporte
  async getLeaguesByCountry(country: string = 'Brazil', sport: string = 'Soccer'): Promise<ApiLeague[]> {
    const data = await this.request(`search_all_leagues.php?c=${country}&s=${sport}`);
    return data?.countrys || [];
  }

  // Busca times de uma liga específica pelo nome
  async getTeamsInLeague(leagueName: string): Promise<ApiTeam[]> {
    const data = await this.request(`search_all_teams.php?l=${encodeURIComponent(leagueName)}`);
    return data?.teams || [];
  }

  // Busca os próximos 15 jogos de uma liga
  async getNextMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsnextleague.php?id=${leagueId}`);
    return data?.events || [];
  }

  // Busca os últimos 15 resultados de uma liga
  async getPastMatches(leagueId: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventspastleague.php?id=${leagueId}`);
    return data?.events || [];
  }

  // Busca jogos de um dia específico
  async getMatchesByDate(date: string): Promise<ApiMatch[]> {
    const data = await this.request(`eventsday.php?d=${date}&s=Soccer`);
    return data?.events || [];
  }

  // Busca a tabela de classificação (standings)
  async getStandings(leagueId: string, season: string = String(new Date().getFullYear())): Promise<ApiStanding[]> {
    const data = await this.request(`lookuptable.php?l=${leagueId}&s=${season}`);
    
    // Se não encontrar para o ano atual, tenta o ano anterior (transição de temporada)
    if (!data?.table) {
      const lastYear = String(parseInt(season) - 1);
      const fallbackData = await this.request(`lookuptable.php?l=${leagueId}&s=${lastYear}`);
      return fallbackData?.table || [];
    }
    
    return data?.table || [];
  }
}

export const theSportsDB = new TheSportsDBService();
