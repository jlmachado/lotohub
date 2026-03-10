/**
 * @fileOverview Cliente HTTP para TheSportsDB via Proxy Interno.
 * Utilizado para resultados de loterias e dados complementares.
 */

class TheSportsDBService {
  private async request(endpoint: string) {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(`${window.location.origin}/api/thesportsdb`);
      url.searchParams.append('endpoint', endpoint);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`[TheSportsDB Service] Falha no proxy: HTTP ${response.status}`);
        return null;
      }

      const result = await response.json();
      
      if (!result.ok) {
        console.warn(`[TheSportsDB Service] Erro reportado: ${result.message}`);
        return null;
      }

      return result.data;
    } catch (error: any) {
      console.error(`[TheSportsDB Service] Erro técnico (${endpoint}):`, error.message);
      return null;
    }
  }

  async getLeaguesByCountry(country: string, sport: string) {
    const data = await this.request(`search_all_leagues.php?c=${country}&s=${sport}`);
    return data?.countries || [];
  }

  async getNextMatches(idLeague: string) {
    const data = await this.request(`eventsnextleague.php?id=${idLeague}`);
    return data?.events || [];
  }

  async getPastMatches(idLeague: string) {
    const data = await this.request(`eventspastleague.php?id=${idLeague}`);
    return data?.events || [];
  }

  async getMatchesByDate(date: string) {
    const data = await this.request(`eventsday.php?d=${date}&s=Soccer`);
    return data?.events || [];
  }

  async getStandings(idLeague: string, season: string) {
    const data = await this.request(`lookuptable.php?l=${idLeague}&s=${season}`);
    return data?.table || [];
  }
}

export const theSportsDB = new TheSportsDBService();
