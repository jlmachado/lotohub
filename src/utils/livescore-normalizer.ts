/**
 * @fileOverview Normalizador de dados da Live Score API para o formato interno.
 */

export interface LiveScoreMatch {
  id: string;
  fixtureId: string;
  competitionId: string;
  competitionName: string;
  countryName: string;
  status: 'LIVE' | 'FINISHED' | 'SCHEDULED' | 'POSTPONED';
  minute: string;
  scheduled: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  htScore: string;
  ftScore: string;
  hasLiveOdds: boolean;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
}

export function normalizeLiveScoreMatch(m: any): LiveScoreMatch {
  // Tenta extrair odds se existirem na resposta da API (depende do plano contratado)
  const homeOdd = m.odds?.live?.['1'] || m.odds?.pre?.['1'] || 1.95;
  const drawOdd = m.odds?.live?.['X'] || m.odds?.pre?.['X'] || 3.20;
  const awayOdd = m.odds?.live?.['2'] || m.odds?.pre?.['2'] || 3.45;

  return {
    id: String(m.id),
    fixtureId: String(m.fixture_id || m.id),
    competitionId: String(m.competition_id || m.league_id),
    competitionName: m.league_name || m.competition?.name || 'Soccer',
    countryName: m.country?.name || '',
    status: m.status === 'LIVE' || m.status === 'IN PLAY' ? 'LIVE' : m.status === 'FINISHED' ? 'FINISHED' : 'SCHEDULED',
    minute: String(m.time || m.minute || '0'),
    scheduled: m.scheduled || m.date,
    homeTeam: m.home_name,
    awayTeam: m.away_name,
    homeLogo: `https://livescore-api.com/api-client/teams/logo.json?id=${m.home_id}`,
    awayLogo: `https://livescore-api.com/api-client/teams/logo.json?id=${m.away_id}`,
    homeScore: parseInt(m.score?.split(' - ')[0] || '0'),
    awayScore: parseInt(m.score?.split(' - ')[1] || '0'),
    htScore: m.ht_score || '',
    ftScore: m.ft_score || '',
    hasLiveOdds: !!m.odds?.live,
    odds: {
      home: parseFloat(String(homeOdd)),
      draw: parseFloat(String(drawOdd)),
      away: parseFloat(String(awayOdd))
    }
  };
}
