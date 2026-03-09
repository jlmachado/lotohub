/**
 * @fileOverview Motor de sincronização e normalização EXCLUSIVO para TheSportsDB com suporte a SP Timezone.
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

/**
 * Retorna a data atual formatada como YYYY-MM-DD no fuso de São Paulo
 */
export const getSPDate = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

/**
 * Remove acentos e normaliza texto para comparação segura
 */
const normalizeText = (text: string) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

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
  try {
    const leagues = await theSportsDB.getLeaguesByCountry('Brazil', 'Soccer');
    
    // Lista expandida de ativação padrão para campeonatos brasileiros
    const keywords = [
      'serie a', 'série a', 
      'serie b', 'série b',
      'serie c', 'série c',
      'serie d', 'série d',
      'copa do brasil', 
      'paulista', 'carioca', 'mineiro', 'gaucho', 'gaúcho',
      'baiano', 'paranaense', 'pernambucano', 'cearense'
    ];
    
    let mapped = (leagues || []).map(l => {
      const name = normalizeText(l.strLeague || '');
      const alt = normalizeText(l.strLeagueAlternate || '');
      
      const shouldImport = keywords.some(k => 
        name.includes(k) || alt.includes(k)
      );

      return {
        id: l.idLeague,
        name: l.strLeague,
        country: l.strCountry || 'Brazil',
        badge: l.strBadge || '',
        importar: shouldImport
      };
    });

    // Fallback: Se nenhuma liga foi ativada pelas keywords, ativa as 5 primeiras para não ficar vazio
    if (mapped.length > 0 && !mapped.some(m => m.importar)) {
      console.log("[Football Sync] Nenhuma liga casou com as keywords. Ativando fallback.");
      for (let i = 0; i < Math.min(5, mapped.length); i++) {
        mapped[i].importar = true;
      }
    }
    
    return mapped;
  } catch (e) {
    console.error("[Football Sync] Erro ao buscar ligas brasileiras:", e);
    throw e;
  }
}

export async function syncFootballMatches(leagueIds: string[]): Promise<{
  today: NormalizedMatch[],
  next: NormalizedMatch[],
  past: NormalizedMatch[]
}> {
  let allToday: NormalizedMatch[] = [];
  let allNext: NormalizedMatch[] = [];
  let allPast: NormalizedMatch[] = [];

  const todayStr = getSPDate();

  // 1. Reforço de jogos de hoje via endpoint global por data
  try {
    const dailyEvents = await theSportsDB.getMatchesByDate(todayStr);
    if (dailyEvents && Array.isArray(dailyEvents)) {
      const activeLeaguesSet = new Set(leagueIds);
      allToday = dailyEvents
        .filter(m => activeLeaguesSet.has(m.idLeague))
        .map(normalizeMatch);
    }
  } catch (e) {
    console.warn("[Football Sync] Aviso ao buscar eventos do dia (eventsday):", e);
  }

  // 2. Busca detalhada por liga (Next e Past)
  for (const id of leagueIds) {
    try {
      const [nextApi, pastApi] = await Promise.all([
        theSportsDB.getNextMatches(id),
        theSportsDB.getPastMatches(id)
      ]);

      const normalizedNext = (nextApi || []).map(normalizeMatch);
      const normalizedPast = (pastApi || []).map(normalizeMatch);

      // Filtrar jogos futuros
      allNext = [...allNext, ...normalizedNext.filter(m => m.date > todayStr)];
      
      // Filtrar jogos de hoje
      const todayFromNext = normalizedNext.filter(m => m.date === todayStr);
      const todayFromPast = normalizedPast.filter(m => m.date === todayStr);
      allToday = [...allToday, ...todayFromNext, ...todayFromPast];
      
      // Filtrar resultados passados
      allPast = [...allPast, ...normalizedPast.filter(m => m.date < todayStr)];
    } catch (e) {
      console.error(`[Football Sync] Erro na liga ${id}:`, e);
    }
  }

  // Remover duplicatas por ID de evento
  const removeDuplicates = (arr: NormalizedMatch[]) => {
    const seen = new Set();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  return {
    today: removeDuplicates(allToday),
    next: removeDuplicates(allNext).sort((a, b) => a.date.localeCompare(b.date)),
    past: removeDuplicates(allPast).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)
  };
}

export async function syncFootballStandings(leagueIds: string[]): Promise<NormalizedStanding[]> {
  let allStandings: NormalizedStanding[] = [];
  const currentYear = getSPDate().split('-')[0];

  for (const id of leagueIds) {
    try {
      const table = await theSportsDB.getStandings(id, currentYear);
      if (table && Array.isArray(table) && table.length > 0) {
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
      console.warn(`[Football Sync] Aviso classificação liga ${id}:`, e);
    }
  }

  return allStandings;
}
