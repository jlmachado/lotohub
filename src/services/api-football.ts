'use server';

/**
 * @fileOverview Cliente HTTP de baixo nível para a API-FOOTBALL (v3).
 * Trata autenticação, endpoints e erros de comunicação.
 */

export interface ApiFootballConfig {
  apiKey: string;
  baseUrl: string;
}

class ApiFootballService {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ApiFootballConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://v3.football.api-sports.io';
  }

  private async request(endpoint: string, params: Record<string, string> = {}) {
    if (!this.apiKey) throw new Error('API Key não configurada');

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-apisports-key': this.apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        next: { revalidate: 0 } // Cache controlado pelo serviço de sync
      });

      if (response.status === 429) throw new Error('Limite de requisições da API atingido (Rate Limit)');
      if (response.status === 401 || response.status === 403) throw new Error('Chave de API inválida ou sem permissão');

      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        const errorMsg = Object.values(data.errors).join(', ');
        throw new Error(errorMsg);
      }

      return data.response;
    } catch (error: any) {
      console.error(`[API-FOOTBALL] Erro no endpoint ${endpoint}:`, error.message);
      throw error;
    }
  }

  // --- Endpoints ---

  async testConnection() {
    return this.request('countries', { name: 'Brazil' });
  }

  async getLeagues(params: { current?: string; active?: string; country?: string } = {}) {
    return this.request('leagues', params);
  }

  async getTeams(leagueId: number, season: number) {
    return this.request('teams', { league: String(leagueId), season: String(season) });
  }

  async getStandings(leagueId: number, season: number) {
    return this.request('standings', { league: String(leagueId), season: String(season) });
  }

  async getFixtures(params: { league?: string; season?: string; date?: string; live?: string; next?: string } = {}) {
    return this.request('fixtures', params);
  }

  async getOdds(fixtureId: number) {
    return this.request('odds', { fixture: String(fixtureId) });
  }

  async getFixtureDetails(fixtureId: number) {
    return this.request('fixtures', { id: String(fixtureId) });
  }
}

export default ApiFootballService;
