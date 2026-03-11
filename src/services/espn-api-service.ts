/**
 * @fileOverview Serviço de integração com o Proxy Interno da ESPN.
 */

class ESPNApiService {
  private async request(resource: string, params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(`${window.location.origin}/api/espn/${resource}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString(), { cache: 'no-store' });
      
      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.ok ? result.data : null;
    } catch (e: any) {
      console.error(`[ESPN Service Error] ${resource}:`, e.message);
      return null;
    }
  }

  async getScoreboard(league: string) {
    return this.request('scoreboard', { league });
  }

  async getStandings(league: string) {
    return this.request('standings', { league });
  }

  async getTeams(league: string) {
    return this.request('teams', { league });
  }

  async getSummary(eventId: string, league: string = 'bra.1') {
    return this.request('summary', { event: eventId, league });
  }
}

export const espnService = new ESPNApiService();
