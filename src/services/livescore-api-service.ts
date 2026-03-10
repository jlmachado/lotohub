/**
 * @fileOverview Serviço para integração com a Live Score API (Jogos ao vivo e Odds).
 * Consome exclusivamente as rotas internas /api/livescore/* para segurança.
 */

export interface LiveScoreMatch {
  id: string;
  home_name: string;
  away_name: string;
  score: string;
  time: string;
  league_name: string;
  status: 'LIVE' | 'FINISHED' | 'SCHEDULED';
  odds?: {
    '1': number;
    'X': number;
    '2': number;
  };
}

class LiveScoreApiService {
  private async request(resource: string, params: Record<string, string> = {}) {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(`${window.location.origin}/api/livescore/${resource}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString());
      if (!response.ok) return null;

      const result = await response.json();
      return result.data;
    } catch (e) {
      console.error(`[LiveScore Service] Falha na requisição ${resource}:`, e);
      return null;
    }
  }

  /**
   * Busca jogos que estão ocorrendo no momento.
   * A API free retorna um subset de jogos.
   */
  async getLiveMatches(): Promise<LiveScoreMatch[]> {
    const data = await this.request('scores/live.json');
    if (!data?.success || !data.data?.match) return [];
    
    // Mapeia os dados da API para o formato interno
    return data.data.match.map((m: any) => ({
      id: String(m.id),
      home_name: m.home_name,
      away_name: m.away_name,
      score: m.score,
      time: m.time,
      league_name: m.league_name,
      status: 'LIVE'
    }));
  }

  /**
   * Busca odds para uma partida específica.
   * Nota: Na API free, as odds podem estar limitadas.
   */
  async getMatchOdds(matchId: string) {
    const data = await this.request('matches/odds.json', { match_id: matchId });
    if (!data?.success) return null;
    return data.data?.odds || null;
  }
}

export const liveScoreService = new LiveScoreApiService();
