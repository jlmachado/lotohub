/**
 * @fileOverview Motor de sincronização e normalização de dados do Futebol via TheSportsDB V1.
 */

import { theSportsDB, ApiMatch, ApiStanding, ApiLeague } from './thesportsdb-service';

export interface NormalizedMatch {
  id: string;
  idLeague: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  homeScore: string;
  awayScore: string;
  date: string;
  time: string;
  status: string;
  venue?: string;
  thumb?: string;
}

export interface NormalizedStanding {
  position: number;
  teamId: string;
  teamName: string;
  teamBadge: string;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsDiff: number;
  leagueId: string;
}

export interface NormalizedLeague {
  id: string;
  name: string;
  country: string;
  badge: string;
  importar: boolean;
  lastSync?: string;
}

const normalizeMatch = (m: ApiMatch): NormalizedMatch => ({
  id: m.idEvent,
  idLeague: m.idLeague,
  league: m.strLeague,
  homeTeam: m.strHomeTeam,
  awayTeam: m.strAwayTeam,
  idHomeTeam: m.idHomeTeam,
  idAwayTeam: m.idAwayTeam,
  homeScore: m.intHomeScore || '0',
  awayScore: m.intAwayScore || '0',
  date: m.dateEvent,
  time: m.strTime,
  status: m.strStatus,
  venue: m.strVenue,
  thumb: m.strThumb
});

export async function fetchBrazilianLeagues(): Promise<NormalizedLeague[]> {
  const leagues = await theSportsDB.getLeaguesByCountry('Brazil', 'Soccer');
  return leagues.map(l => ({
    id: l.idLeague,
    name: l.strLeague,
    country: l.strCountry || 'Brazil',
    badge: l.strBadge || '',
    importar: l.strLeague.includes('Serie A') // Pré-ativa Série A por padrão
  }));
}

export async function syncFootballMatches(leagueIds: string[]): Promise<{
  today: NormalizedMatch[],
  next: NormalizedMatch[],
  past: NormalizedMatch[]
}> {
  let allToday: NormalizedMatch[] = [];
  let allNext: NormalizedMatch[] = [];
  let allPast: NormalizedMatch[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (const id of leagueIds) {
    try {
      const [nextApi, pastApi] = await Promise.all([
        theSportsDB.getNextMatches(id),
        theSportsDB.getPastMatches(id)
      ]);

      const normalizedNext = (nextApi || []).map(normalizeMatch);
      const normalizedPast = (pastApi || []).map(normalizeMatch);

      // Agrega e separa por período
      allNext = [...allNext, ...normalizedNext.filter(m => m.date > todayStr)];
      allToday = [...allToday, 
        ...normalizedNext.filter(m => m.date === todayStr), 
        ...normalizedPast.filter(m => m.date === todayStr)
      ];
      allPast = [...allPast, ...normalizedPast.filter(m => m.date < todayStr)];
    } catch (e) {
      console.error(`Erro ao sincronizar jogos da liga ${id}:`, e);
    }
  }

  // Remove duplicatas de hoje (pode acontecer entre endpoints)
  const uniqueToday = Array.from(new Map(allToday.map(m => [m.id, m])).values());

  return {
    today: uniqueToday,
    next: allNext.sort((a, b) => a.date.localeCompare(b.date)),
    past: allPast.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)
  };
}

export async function syncFootballStandings(leagueIds: string[]): Promise<NormalizedStanding[]> {
  let allStandings: NormalizedStanding[] = [];

  for (const id of leagueIds) {
    try {
      const table = await theSportsDB.getStandings(id);
      if (table && Array.isArray(table)) {
        const normalized = table.map(s => ({
          position: parseInt(s.intRank),
          teamId: s.idTeam,
          teamName: s.strTeam,
          teamBadge: s.strTeamBadge,
          played: parseInt(s.intPlayed),
          points: parseInt(s.intPoints),
          wins: parseInt(s.intWin),
          draws: parseInt(s.intDraw),
          losses: parseInt(s.intLoss),
          goalsDiff: parseInt(s.intGoalDifference),
          leagueId: id
        }));
        allStandings = [...allStandings, ...normalized];
      }
    } catch (e) {
      console.error(`Erro ao sincronizar classificação da liga ${id}:`, e);
    }
  }

  return allStandings;
}
