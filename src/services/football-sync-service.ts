import ApiFootballService from './api-football';
import type { 
  FootballMatch, 
  FootballChampionship, 
  FootballTeam, 
  FootballApiConfig 
} from '@/context/AppContext';

/**
 * @fileOverview Orquestrador de sincronização da API-FOOTBALL.
 * Gerencia o fluxo de importação respeitando o coverage das ligas.
 */

export interface SyncResult {
  success: boolean;
  message: string;
  counts: {
    leagues: number;
    teams: number;
    fixtures: number;
    standings: number;
  };
}

export async function syncFromApiFootball(
  config: FootballApiConfig,
  currentData: { 
    championships: FootballChampionship[]; 
    teams: FootballTeam[]; 
    matches: FootballMatch[] 
  },
  options: {
    syncLeagues?: boolean;
    syncTeams?: boolean;
    syncFixtures?: boolean;
    leagueIds?: string[]; // IDs para sync focado
  } = {}
): Promise<SyncResult & { data: any }> {
  const api = new ApiFootballService({ 
    apiKey: config.apiKey, 
    baseUrl: 'https://v3.football.api-sports.io' 
  });

  const results: SyncResult & { data: any } = {
    success: true,
    message: 'Sincronização iniciada',
    counts: { leagues: 0, teams: 0, fixtures: 0, standings: 0 },
    data: { championships: [], teams: [], matches: [] }
  };

  try {
    // 1. Sincronizar Ligas (Base de tudo)
    let activeLeagues = currentData.championships;
    if (options.syncLeagues) {
      const apiLeagues = await api.getLeagues({ current: 'true' });
      
      results.data.championships = apiLeagues.map((l: any) => ({
        id: `champ-${l.league.id}`,
        apiId: String(l.league.id),
        name: l.league.name,
        logo: l.league.logo,
        bancaId: config.bancaId,
        importar: results.data.championships.find((c: any) => c.apiId === String(l.league.id))?.importar ?? false,
        country: l.country.name,
        type: l.league.type,
        coverage: l.seasons[0]?.coverage || {} // Pega coverage da temporada atual
      }));
      
      results.counts.leagues = apiLeagues.length;
      activeLeagues = results.data.championships;
    }

    // 2. Filtrar ligas para sync de times/jogos
    const leaguesToSync = activeLeagues.filter(l => 
      options.leagueIds ? options.leagueIds.includes(l.apiId) : l.importar
    );

    if (leaguesToSync.length === 0 && (options.syncTeams || options.syncFixtures)) {
      return { ...results, message: 'Nenhuma liga ativa selecionada para sincronização de dados.' };
    }

    // 3. Sync de Times e Jogos (Limitado às ligas ativas para economizar API)
    const currentYear = new Date().getFullYear();

    for (const league of leaguesToSync) {
      // Sync Teams
      if (options.syncTeams) {
        const apiTeams = await api.getTeams(Number(league.apiId), currentYear);
        const mappedTeams = apiTeams.map((t: any) => ({
          id: String(t.team.id),
          bancaId: config.bancaId,
          name: t.team.name,
          logo: t.team.logo,
          country: t.team.country
        }));
        results.data.teams = [...results.data.teams, ...mappedTeams];
        results.counts.teams += mappedTeams.length;
      }

      // Sync Fixtures (Jogos)
      if (options.syncFixtures) {
        // Busca jogos dos próximos 7 dias
        const apiFixtures = await api.getFixtures({ 
          league: league.apiId, 
          season: String(currentYear),
          next: '50' // Próximos 50 jogos da liga
        });

        const mappedMatches = apiFixtures.map((f: any) => ({
          id: String(f.fixture.id),
          bancaId: config.bancaId,
          championshipApiId: league.apiId,
          homeTeamId: String(f.teams.home.id),
          awayTeamId: String(f.teams.away.id),
          dateTime: f.fixture.date,
          status: normalizeStatus(f.fixture.status.short),
          isImported: true,
          odds: { home: 0, draw: 0, away: 0 }, // Odds virão de outro sync ou sub-call
          venue: f.fixture.venue.name,
          round: f.league.round
        }));

        results.data.matches = [...results.data.matches, ...mappedMatches];
        results.counts.fixtures += mappedMatches.length;
      }
    }

    results.message = `Sucesso: ${results.counts.leagues} ligas, ${results.counts.teams} times e ${results.counts.fixtures} jogos processados.`;
    return results;

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro desconhecido na sincronização',
      counts: results.counts,
      data: results.data
    };
  }
}

function normalizeStatus(apiStatus: string): FootballMatch['status'] {
  const map: Record<string, FootballMatch['status']> = {
    'NS': 'scheduled',
    '1H': 'live',
    'HT': 'live',
    '2H': 'live',
    'ET': 'live',
    'BT': 'live',
    'P': 'live',
    'SUSP': 'live',
    'INT': 'live',
    'FT': 'finished',
    'AET': 'finished',
    'PEN': 'finished',
    'CANC': 'cancelled',
    'ABD': 'cancelled',
    'AWD': 'cancelled',
    'WO': 'cancelled'
  };
  return map[apiStatus] || 'scheduled';
}
