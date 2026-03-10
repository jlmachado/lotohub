/**
 * @fileOverview Serviço de integração com o Proxy da ESPN.
 */

class ESPNApiService {
  private async request(league: string, resource: string = 'scoreboard', params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(`${window.location.origin}/api/espn`);
      url.searchParams.append('league', league);
      url.searchParams.append('resource', resource);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`[ESPN Service] Recurso indisponível: ${resource}/${league} (HTTP ${response.status})`);
        return null;
      }

      const result = await response.json();
      if (!result.ok) {
        console.warn(`[ESPN Service] Proxy reportou falha para ${resource}/${league}: ${result.message}`);
        return null;
      }

      return result.data;
    } catch (e: any) {
      console.error(`[ESPN Service] Erro na requisição ${resource}/${league}:`, e.message);
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

  async getSummary(eventId: string, league: string = 'bra.1') {
    return this.request(league, 'summary', { event: eventId });
  }
}

export const espnService = new ESPNApiService();
