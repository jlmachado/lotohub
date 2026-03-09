/**
 * @fileOverview Serviço de integração com a API TheSportsDB (v1).
 * Consome o proxy interno para garantir estabilidade e tratamento de erros real.
 */

export interface ApiLeague {
  idLeague: string;
  idAPIfootball?: string;
  idAPIfootballv3?: string;
  strSport: string;
  strLeague: string;
  strLeagueAlternate: string;
  intDivision: string;
  idCup: string;
  strCurrentSeason: string;
  intFormedYear: string;
  dateFirstEvent: string;
  strGender: string;
  strCountry: string;
  strWebsite: string;
  strDescriptionEN: string;
  strBadge: string;
  strLogo: string;
  strPoster: string;
  strTrophy: string;
  strNaming: string;
  strComplete: string;
  strLocked: string;
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
   * Faz requisição para a API através da rota de proxy interna com tratamento resiliente.
   */
  private async request(endpoint: string) {
    if (typeof window === 'undefined') return null;

    try {
      const baseUrl = window.location.origin;
      const proxyUrl = `${baseUrl}/api/thesportsdb?endpoint=${encodeURIComponent(endpoint)}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      const result = await response.json();
      
      // Se o proxy reportar erro interno (5xx), lançamos erro
      if (!response.ok) {
        throw new Error(result.message || `Erro no servidor: ${response.status}`);
      }
      
      // Se o proxy retornou ok: false (erro reportado pelo proxy na comunicação com o upstream)
      if (result.ok === false) {
        console.warn(`[TheSportsDB Service] Aviso em ${endpoint}:`, result.message);
        return null;
      }
      
      return result.data;
    } catch (error: any) {
      console.error(`[TheSportsDB Service] Erro crítico (${endpoint}):`, error.message);
      return null; // Retorna null para evitar quebras em cadeia
    }
  }

  async getLeaguesByCountry(country: string = 'Brazil', sport: string = 'Soccer'): Promise<ApiLeague[]> {
    const data = await this.request(`search_all_leagues.php?c=${encodeURIComponent(country)}&s=${encodeURIComponent(sport)}`);
    return data?.countrys || data?.countries || [];
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
    return data?.table || [];
  }

  async getSeasons(leagueId: string): Promise<any[]> {
    const data = await this.request(`search_all_seasons.php?id=${leagueId}`);
    return data?.seasons || [];
  }
}

export const theSportsDB = new TheSportsDBService();
