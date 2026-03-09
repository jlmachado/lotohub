/**
 * @fileOverview Motor de sincronização e normalização de dados de futebol.
 */

import { theSportsDB, ApiMatch, ApiStanding } from './thesportsdb-service';

export interface NormalizedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  date: string;
  time: string;
  status: string;
  league: string;
  homeBadge?: string;
  awayBadge?: string;
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
}

export async function syncMatches(): Promise<{ today: NormalizedMatch[]; next: NormalizedMatch[] }> {
  const [nextApi, pastApi] = await Promise.all([
    theSportsDB.getNextMatches(),
    theSportsDB.getPastMatches()
  ]);

  const todayStr = new Date().toISOString().split('T')[0];

  const normalize = (m: ApiMatch): NormalizedMatch => ({
    id: m.idEvent,
    homeTeam: m.strHomeTeam,
    awayTeam: m.strAwayTeam,
    homeScore: m.intHomeScore || '0',
    awayScore: m.intAwayScore || '0',
    date: m.dateEvent,
    time: m.strTime,
    status: m.strStatus,
    league: 'Brasileirão Série A'
  });

  const allMatches = [...pastApi, ...nextApi].map(normalize);

  return {
    today: allMatches.filter(m => m.date === todayStr),
    next: allMatches.filter(m => m.date > todayStr).sort((a, b) => a.date.localeCompare(b.date))
  };
}

export async function syncStandings(): Promise<NormalizedStanding[]> {
  const apiTable = await theSportsDB.getStandings();
  
  return apiTable.map((s: ApiStanding) => ({
    position: parseInt(s.intRank),
    teamId: s.idTeam,
    teamName: s.strTeam,
    teamBadge: s.strTeamBadge,
    played: parseInt(s.intPlayed),
    points: parseInt(s.intPoints),
    wins: parseInt(s.intWin),
    draws: parseInt(s.intDraw),
    losses: parseInt(s.intLoss),
    goalsDiff: parseInt(s.intGoalDifference)
  }));
}
