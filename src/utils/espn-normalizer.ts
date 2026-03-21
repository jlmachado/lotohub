/**
 * @fileOverview Normalizador de dados da ESPN API para o formato interno estável.
 * Processa Scoreboard e Standings.
 */

export interface NormalizedESPNMatch {
  id: string;
  leagueSlug: string;
  leagueName: string;
  name: string;
  shortName: string;
  date: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  statusDetail: string;
  period?: number;
  clock?: string;
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
    score: number;
    winner?: boolean;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
    score: number;
    winner?: boolean;
  };
  venue?: string | null;
  broadcast?: string | null;
}

export interface NormalizedESPNStanding {
  position: number;
  teamId: string;
  teamName: string;
  logo: string;
  stats: {
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalsDiff: number;
  };
}

export const normalizeESPNScoreboard = (data: any, leagueSlug: string): NormalizedESPNMatch[] => {
  if (!data?.events) return [];

  const leagueName = data.leagues?.[0]?.name || 'Soccer';

  return data.events.map((event: any) => {
    const competition = event.competitions?.[0];
    const homeCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'home');
    const awayCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'away');
    const statusType = event.status?.type?.name;

    let internalStatus: NormalizedESPNMatch['status'] = 'SCHEDULED';
    if (statusType === 'STATUS_IN_PROGRESS' || statusType === 'STATUS_HALFTIME') internalStatus = 'LIVE';
    if (statusType === 'STATUS_FULL_TIME' || statusType === 'STATUS_FINAL') internalStatus = 'FINISHED';
    if (statusType === 'STATUS_POSTPONED') internalStatus = 'POSTPONED';
    if (statusType === 'STATUS_CANCELED') internalStatus = 'CANCELLED';

    // Higienização de dados: Firestore não aceita 'undefined'. Usar fallback para null ou string.
    return {
      id: event.id,
      leagueSlug,
      leagueName,
      name: event.name || 'Unknown Match',
      shortName: event.shortName || 'Unknown',
      date: event.date,
      status: internalStatus,
      statusDetail: event.status?.type?.detail || '',
      period: event.status?.period || 0,
      clock: event.status?.displayClock || '',
      homeTeam: {
        id: homeCompetitor?.team?.id || '0',
        name: homeCompetitor?.team?.displayName || 'Home Team',
        abbreviation: homeCompetitor?.team?.abbreviation || 'HOM',
        logo: homeCompetitor?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
        score: parseInt(homeCompetitor?.score || '0'),
        winner: homeCompetitor?.winner || false
      },
      awayTeam: {
        id: awayCompetitor?.team?.id || '0',
        name: awayCompetitor?.team?.displayName || 'Away Team',
        abbreviation: awayCompetitor?.team?.abbreviation || 'AWY',
        logo: awayCompetitor?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
        score: parseInt(awayCompetitor?.score || '0'),
        winner: awayCompetitor?.winner || false
      },
      venue: competition?.venue?.fullName || null,
      broadcast: competition?.broadcasts?.[0]?.names?.[0] || null
    };
  });
};

export const normalizeESPNStandings = (data: any): NormalizedESPNStanding[] => {
  if (!data?.children?.[0]?.standings?.entries) return [];

  return data.children[0].standings.entries.map((entry: any) => {
    const team = entry.team;
    const stats = entry.stats || [];

    const getStat = (name: string) => stats.find((s: any) => s.name === name)?.value || 0;

    return {
      position: entry.stats.find((s: any) => s.name === 'rank')?.value || 0,
      teamId: team.id,
      teamName: team.displayName,
      logo: team.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
      stats: {
        points: getStat('points'),
        played: getStat('gamesPlayed'),
        wins: getStat('wins'),
        draws: getStat('ties'),
        losses: getStat('losses'),
        goalsFor: getStat('pointsFor'),
        goalsAgainst: getStat('pointsAgainst'),
        goalsDiff: getStat('pointDifferential')
      }
    };
  });
};
