/**
 * @fileOverview Serviço de integração com o Proxy Interno da ESPN.
 * Nenhuma chamada é feita diretamente para o domínio externo da ESPN pelo browser.
 */

class ESPNApiService {
  private async request(resource: string, params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      // Monta URL para a rota interna da API
      const url = new URL(`${window.location.origin}/api/espn/${resource}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[ESPN Service] Erro HTTP ${response.status} em /api/espn/${resource}:`, errorText);
        return null;
      }

      const result = await response.json();
      if (!result.ok) {
        console.warn(`[ESPN Service] Proxy reportou falha para ${resource}:`, result.message);
        return null;
      }

      return result.data;
    } catch (e: any) {
      console.error(`[ESPN Service] Falha na requisição local para ${resource}:`, e.message);
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

  async getTeamSchedule(teamId: string, league: string = 'bra.1') {
    return this.request('schedule', { team: teamId, league });
  }
}

export const espnService = new ESPNApiService();
