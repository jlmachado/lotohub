/**
 * @fileOverview Serviço para integração com a Live Score API via proxy interno.
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
        console.warn(`[LiveScore Service] Erro HTTP ${response.status} em ${resource}`);
        return null;
      }

      const result = await response.json();
      return result.ok ? result.data : null;
    } catch (e) {
      console.error(`[LiveScore Service] Falha na requisição ${resource}:`, e);
      return null;
    }
  }

  async getLiveMatches(): Promise<LiveScoreMatch[]> {
    const data = await this.request('scores/live.json');
    if (!data?.match) return [];
    return data.match.map(normalizeLiveScoreMatch);
  }

  async getFixtures(date?: string): Promise<LiveScoreMatch[]> {
    const params: any = {};
    if (date) params.date = date;
    const data = await this.request('scores/history.json', params);
    if (!data?.match) return [];
    return data.match.map(normalizeLiveScoreMatch);
  }

  async getMatchOdds(matchId: string) {
    return this.request('matches/odds.json', { match_id: matchId });
  }

  async getMatchEvents(matchId: string) {
    return this.request('scores/events.json', { id: matchId });
  }
}

export const liveScoreService = new LiveScoreApiService();
