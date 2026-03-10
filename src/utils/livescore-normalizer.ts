/**
 * @fileOverview Normalizador de dados da Live Score API para o formato interno.
 * Garante que status, placares e odds sejam mapeados de forma resiliente.
 */

export interface LiveScoreMatch {
  id: string;
  fixtureId: string;
  competitionId: string;
  competitionName: string;
  countryName: string;
  status: 'LIVE' | 'FINISHED' | 'SCHEDULED' | 'POSTPONED' | 'CANCELED';
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
  // 1. Mapeamento de Status
  let status: LiveScoreMatch['status'] = 'SCHEDULED';
  const apiStatus = (m.status || '').toUpperCase();
  
  if (['LIVE', 'IN PLAY', '1H', '2H', 'HT', 'ET', 'P'].includes(apiStatus)) {
    status = 'LIVE';
  } else if (['FT', 'FINISHED', 'AET', 'AP'].includes(apiStatus)) {
    status = 'FINISHED';
  } else if (['POSTPONED', 'PST'].includes(apiStatus)) {
    status = 'POSTPONED';
  } else if (['CANCELED', 'CAN'].includes(apiStatus)) {
    status = 'CANCELED';
  }

  // 2. Extração de Placares (trata formatos "1 - 0" ou campos individuais)
  let homeScore = 0;
  let awayScore = 0;
  if (m.score && m.score.includes(' - ')) {
    [homeScore, awayScore] = m.score.split(' - ').map((s: string) => parseInt(s) || 0);
  } else {
    homeScore = parseInt(m.home_score) || 0;
    awayScore = parseInt(m.away_score) || 0;
  }

  // 3. Extração de Odds (Live > Pre-game > Fallback)
  // Nota: A API retorna odds em locais diferentes dependendo do endpoint
  const homeOdd = m.odds?.live?.['1'] || m.odds?.pre?.['1'] || m.odds?.['1'] || 1.95;
  const drawOdd = m.odds?.live?.['X'] || m.odds?.pre?.['X'] || m.odds?.['X'] || 3.20;
  const awayOdd = m.odds?.live?.['2'] || m.odds?.pre?.['2'] || m.odds?.['2'] || 3.45;

  return {
    id: String(m.id || m.fixture_id),
    fixtureId: String(m.fixture_id || m.id),
    competitionId: String(m.competition_id || m.league_id || ''),
    competitionName: m.league_name || m.competition?.name || 'Soccer',
    countryName: m.country?.name || m.country_name || '',
    status,
    minute: String(m.time || m.minute || '0'),
    scheduled: m.scheduled || m.date || '',
    homeTeam: m.home_name || m.home_team_name || 'Home',
    awayTeam: m.away_name || m.away_team_name || 'Away',
    homeLogo: m.home_id ? `https://livescore-api.com/api-client/teams/logo.json?id=${m.home_id}` : '',
    awayLogo: m.away_id ? `https://livescore-api.com/api-client/teams/logo.json?id=${m.away_id}` : '',
    homeScore,
    awayScore,
    htScore: m.ht_score || '',
    ftScore: m.ft_score || '',
    hasLiveOdds: !!(m.odds?.live || m.odds?.['1']),
    odds: {
      home: parseFloat(String(homeOdd)),
      draw: parseFloat(String(drawOdd)),
      away: parseFloat(String(awayOdd))
    }
  };
}
