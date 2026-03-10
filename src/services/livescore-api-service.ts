/**
 * @fileOverview Serviço para integração com a Live Score API via proxy interno.
 * Centraliza as chamadas para jogos ao vivo, odds e competições.
 */

import { LiveScoreMatch, normalizeLiveScoreMatch } from '@/utils/livescore-normalizer';

class LiveScoreApiService {
  private async request(resource: string, params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(`${window.location.origin}/api/livescore/${resource}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString(), { cache: 'no-store' });
      
      if (!response.ok) {
        console.warn(`[LiveScore Service] Falha na requisição ${resource}. Status: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result.ok ? result.data : null;
    } catch (e) {
      console.error(`[LiveScore Service] Erro técnico na requisição ${resource}:`, e);
      return null;
    }
  }

  /**
   * Busca todas as partidas ao vivo.
   */
  async getLiveMatches(): Promise<LiveScoreMatch[]> {
    const data = await this.request('scores/live.json');
    if (!data?.match) return [];
    
    // Filtra e normaliza os dados brutos da API
    const matches = Array.isArray(data.match) ? data.match : [data.match];
    return matches.map(normalizeLiveScoreMatch);
  }

  /**
   * Busca partidas agendadas ou passadas por data.
   */
  async getFixtures(date?: string): Promise<LiveScoreMatch[]> {
    const params: any = {};
    if (date) params.date = date;
    const data = await this.request('scores/history.json', params);
    if (!data?.match) return [];
    
    const matches = Array.isArray(data.match) ? data.match : [data.match];
    return matches.map(normalizeLiveScoreMatch);
  }

  /**
   * Busca odds para uma partida específica.
   */
  async getMatchOdds(matchId: string) {
    return this.request('matches/odds.json', { match_id: matchId });
  }

  /**
   * Lista competições cobertas pela API para mapeamento.
   */
  async getCompetitions() {
    return this.request('competitions/list.json');
  }
}

export const liveScoreService = new LiveScoreApiService();
