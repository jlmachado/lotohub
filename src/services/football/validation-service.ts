import { theSportsDB } from '../thesportsdb-service';
import { CatalogLeague, ValidationStatus } from './types';
import { deriveCoverage } from './utils';

/**
 * @fileOverview Serviço de validação de cobertura para as ligas do catálogo.
 */

export interface ValidationResult {
  status: ValidationStatus;
  totalGames: number;
  totalTeams: number;
  hasTable: boolean;
  badge?: string;
  error?: string;
}

export const validateLeagueAvailability = async (league: CatalogLeague): Promise<ValidationResult> => {
  if (!league.idLeague) {
    return { status: 'NAO_ENCONTRADA', totalGames: 0, totalTeams: 0, hasTable: false };
  }

  try {
    // 1. Validar se a liga existe e pegar o badge
    const leagueDetails = await theSportsDB.getLeaguesByCountry('Brazil', 'Soccer');
    const apiLeague = leagueDetails.find(l => l.idLeague === league.idLeague);
    const badge = apiLeague?.strBadge;

    // 2. Tentar buscar times da liga (Free API v1 permite busca por nome da liga)
    const teams = await theSportsDB.request(`search_all_teams.php?l=${encodeURIComponent(league.possiveisNomesNaAPI[0])}`);
    const teamsCount = teams?.teams?.length || 0;

    // 3. Tentar buscar próximos jogos
    const nextMatches = await theSportsDB.getNextMatches(league.idLeague);
    const pastMatches = await theSportsDB.getPastMatches(league.idLeague);
    const totalMatches = (nextMatches?.length || 0) + (pastMatches?.length || 0);

    // 4. Tentar buscar classificação (Lookuptable)
    const currentYear = new Date().getFullYear();
    const standings = await theSportsDB.getStandings(league.idLeague, String(currentYear));
    const hasTable = Array.isArray(standings) && standings.length > 0;

    // Determinar Status
    let status: ValidationStatus = 'DISPONIVEL';
    
    if (totalMatches === 0) status = 'SEM_EVENTOS';
    else if (teamsCount === 0) status = 'SEM_TIMES';
    else if (!hasTable) status = 'SEM_CLASSIFICACAO';
    else if (totalMatches < 5) status = 'DISPONIVEL_PARCIAL';

    return {
      status,
      totalGames: totalMatches,
      totalTeams: teamsCount,
      hasTable,
      badge
    };

  } catch (e: any) {
    return {
      status: 'FALHA_API',
      totalGames: 0,
      totalTeams: 0,
      hasTable: false,
      error: e.message
    };
  }
};
