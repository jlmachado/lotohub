/**
 * @fileOverview Serviço de integração com o Proxy da ESPN.
 */

class ESPNApiService {
  private async request(league: string, resource: string = 'scoreboard', params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    const url = new URL(`${window.location.origin}/api/espn`);
    url.searchParams.append('league', league);
    url.searchParams.append('resource', resource);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    try {
      const response = await fetch(url.toString());
      const result = await response.json();
      if (!result.ok) throw new Error(result.message || 'Erro na ESPN API');
      return result.data;
    } catch (e) {
      console.error(`[ESPN Service] Erro no recurso ${resource} da liga ${league}:`, e);
      return null;
    }
  }

  async getScoreboard(league: string) {
    return this.request(league, 'scoreboard');
  }

  async getStandings(league: string) {
    return this.request(league, 'standings');
  }

  async getTeams(league: string) {
    return this.request(league, 'teams');
  }

  async getSummary(eventId: string) {
    // Para o resumo, passamos um slug fixo ou genérico pois o eventId é soberano no proxy
    return this.request('bra.1', 'summary', { event: eventId });
  }
}

export const espnService = new ESPNApiService();
