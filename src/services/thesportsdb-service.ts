/**
 * @fileOverview Serviço de integração com a API TheSportsDB (Gratuita).
 * Foco: Campeonato Brasileiro Série A (League ID: 4351).
 */

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/1';
const BR_SERIE_A_ID = '4351';

export interface ApiMatch {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime: string;
  strThumb: string;
  strStatus: string;
}

export interface ApiStanding {
  idTeam: string;
  strTeam: string;
  strTeamBadge: string;
  intRank: string;
  intPlayed: string;
  intWin: string;
  intLoss: string;
  intDraw: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intGoalDifference: string;
  intPoints: string;
}

class TheSportsDBService {
  /**
   * Busca os próximos jogos da liga.
   */
  async getNextMatches(): Promise<ApiMatch[]> {
    try {
      const response = await fetch(`${BASE_URL}/eventsnextleague.php?id=${BR_SERIE_A_ID}`);
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Erro ao buscar próximos jogos:', error);
      return [];
    }
  }

  /**
   * Busca jogos passados (usado para resultados de hoje/recentes).
   */
  async getPastMatches(): Promise<ApiMatch[]> {
    try {
      const response = await fetch(`${BASE_URL}/eventspastleague.php?id=${BR_SERIE_A_ID}`);
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Erro ao buscar jogos passados:', error);
      return [];
    }
  }

  /**
   * Busca a classificação atual.
   */
  async getStandings(): Promise<ApiStanding[]> {
    try {
      // Usando a temporada 2024 como padrão para o Brasileirão atual
      const response = await fetch(`${BASE_URL}/lookuptable.php?l=${BR_SERIE_A_ID}&s=2024`);
      const data = await response.json();
      return data.table || [];
    } catch (error) {
      console.error('Erro ao buscar classificação:', error);
      return [];
    }
  }

  /**
   * Busca detalhes de um time (principalmente para pegar o Badge).
   */
  async getTeamDetails(idTeam: string) {
    try {
      const response = await fetch(`${BASE_URL}/lookupteam.php?id=${idTeam}`);
      const data = await response.json();
      return data.teams ? data.teams[0] : null;
    } catch (error) {
      console.error('Erro ao buscar detalhes do time:', error);
      return null;
    }
  }
}

export const theSportsDB = new TheSportsDBService();
