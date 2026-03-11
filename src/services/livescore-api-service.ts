/**
 * @fileOverview Serviço de integração com a Live Score API via Proxy.
 */

import { LiveScoreMatch, normalizeLiveScoreMatch } from '@/utils/livescore-normalizer';

class LiveScoreApiService {
  private async request(resource: string, params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      // TODA CHAMADA DEVE SER FEITA PARA A ROTA INTERNA /api/livescore
      const url = new URL(`${window.location.origin}/api/livescore/${resource}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString(), { cache: 'no-store' });
      
      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.ok ? result.data : null;
    } catch (e) {
      console.error(`[LiveScore API Error] Falha na requisição ${resource}:`, e);
      return null;
    }
  }

  async getLiveMatches(): Promise<LiveScoreMatch[]> {
    const data = await this.request('scores/live.json');
    if (!data?.match) return [];
    const matches = Array.isArray(data.match) ? data.match : [data.match];
    return matches.map(normalizeLiveScoreMatch);
  }

  async getFixturesByCompetition(competitionId: string): Promise<LiveScoreMatch[]> {
    const data = await this.request('scores/history.json', { competition_id: competitionId });
    if (!data?.match) return [];
    const matches = Array.isArray(data.match) ? data.match : [data.match];
    return matches.map(normalizeLiveScoreMatch);
  }

  async getMatchOdds(matchId: string) {
    return this.request('matches/odds.json', { match_id: matchId });
  }
}

export const liveScoreService = new LiveScoreApiService();
