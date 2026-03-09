import ApiFootballService from './api-football';
import type { 
  FootballMatch, 
  FootballChampionship, 
  FootballTeam, 
  FootballApiConfig 
} from '@/context/AppContext';

/**
 * @fileOverview Orquestrador de sincronização da API-FOOTBALL.
 * Gerencia o fluxo de importação respeitando o limite do plano free e temporadas atuais.
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
    leagueIds?: string[];
  } = {}
): Promise<SyncResult & { data: any }> {
  const api = new ApiFootballService({ 
    apiKey: config.apiKey, 
    baseUrl: config.baseUrl || 'https://v3.football.api-sports.io' 
  });

  const results: SyncResult & { data: any } = {
    success: true,
    message: 'Sincronização iniciada',
    counts: { leagues: 0, teams: 0, fixtures: 0, standings: 0 },
    data: { championships: [], teams: [], matches: [] }
  };

  try {
    // 1. Sincronizar Ligas (Identificando Temporada Atual)
    let activeLeagues = currentData.championships;
    if (options.syncLeagues) {
      const apiLeagues = await api.getLeagues({ current: 'true' });
      
      results.data.championships = apiLeagues.map((l: any) => {
        const existingChamp = currentData.championships.find((c: any) => c.apiId === String(l.league.id));
        const currentSeason = l.seasons.find((s: any) => s.current === true) || l.seasons[l.seasons.length - 1];
        
        return {
          id: `champ-${l.league.id}`,
          apiId: String(l.league.id),
          name: l.league.name,
          logo: l.league.logo,
          bancaId: config.bancaId,
          importar: existingChamp ? existingChamp.importar : false,
          country: l.country.name,
          type: l.league.type,
          currentSeason: currentSeason?.year || new Date().getFullYear(),
          coverage: currentSeason?.coverage || {}
        };
      });
      
      results.counts.leagues = apiLeagues.length;
      activeLeagues = results.data.championships;
    }

    // 2. Filtrar ligas selecionadas para sync de detalhes
    const leaguesToSync = activeLeagues.filter(l => 
      options.leagueIds ? options.leagueIds.includes(l.apiId) : l.importar
    );

    if (leaguesToSync.length === 0 && (options.syncTeams || options.syncFixtures)) {
      return { ...results, message: 'Selecione ligas para importar e clique em sincronizar.' };
    }

    // 3. Sync de Dados Operacionais (Times e Jogos)
    for (const league of leaguesToSync) {
      const season = league.currentSeason || new Date().getFullYear();

      // Sincronizar Times
      if (options.syncTeams) {
        try {
          let apiTeams;
          try {
            apiTeams = await api.getTeams(Number(league.apiId), Number(season));
          } catch (e: any) {
            // Fallback para plano Free que bloqueia temporadas atuais
            if (e.message.includes("Free plans do not have access to this season")) {
              apiTeams = await api.getTeams(Number(league.apiId), 2024);
            } else {
              throw e;
            }
          }

          const mappedTeams = apiTeams.map((t: any) => ({
            id: String(t.team.id),
            bancaId: config.bancaId,
            name: t.team.name,
            logo: t.team.logo,
            country: t.team.country
          }));
          results.data.teams = [...results.data.teams, ...mappedTeams];
          results.counts.teams += mappedTeams.length;
        } catch (e: any) {
          console.error(`[SYNC] Erro times liga ${league.apiId}:`, e.message);
        }
      }

      // Sincronizar Jogos (Apenas Futuros/Recentes da Temporada Atual)
      if (options.syncFixtures) {
        try {
          let apiFixtures;
          try {
            apiFixtures = await api.getFixtures({ 
              league: league.apiId, 
              season: String(season),
              next: '50' 
            });
          } catch (e: any) {
            // Fallback para plano Free que bloqueia temporadas atuais
            if (e.message.includes("Free plans do not have access to this season")) {
              apiFixtures = await api.getFixtures({ 
                league: league.apiId, 
                season: '2024',
                next: '50' 
              });
            } else {
              throw e;
            }
          }

          const mappedMatches = apiFixtures.map((f: any) => ({
            id: String(f.fixture.id),
            bancaId: config.bancaId,
            championshipApiId: league.apiId,
            homeTeamId: String(f.teams.home.id),
            awayTeamId: String(f.teams.away.id),
            dateTime: f.fixture.date,
            status: normalizeStatus(f.fixture.status.short),
            isImported: true,
            odds: { home: 1.95, draw: 3.20, away: 3.40 },
            venue: f.fixture.venue?.name || 'Estádio Indisponível',
            round: f.league.round
          }));

          results.data.matches = [...results.data.matches, ...mappedMatches];
          results.counts.fixtures += mappedMatches.length;
        } catch (e: any) {
          console.error(`[SYNC] Erro jogos liga ${league.apiId}:`, e.message);
        }
      }
    }

    results.message = `Sincronização concluída. ${results.counts.fixtures} jogos atuais processados.`;
    return results;

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro na sincronização',
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
    'FT': 'finished',
    'CANC': 'cancelled',
    'ABD': 'cancelled'
  };
  return map[apiStatus] || 'scheduled';
}
