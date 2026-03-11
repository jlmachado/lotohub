/**
 * @fileOverview Serviço de Mapeamento e Unificação de Dados de Futebol.
 * Responsável por cruzar diferentes fontes ou enriquecer dados de uma fonte única (ESPN).
 */

import { NormalizedESPNMatch } from '@/utils/espn-normalizer';
import { BettingMarket } from './football-markets-engine';

export interface MatchModel {
  id: string;
  espnId?: string;
  league: string;
  leagueSlug: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  kickoff: string;
  status: string;
  minute: string;
  scoreHome: number;
  scoreAway: number;
  hasOdds: boolean;
  odds: { home: number; draw: number; away: number; };
  markets?: BettingMarket[];
  isLive: boolean;
  isFinished: boolean;
  marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED';
}

export class MatchMapperService {
  /**
   * Transforma o modelo bruto da ESPN para o modelo Bettable consumido pela UI.
   * Garante que objetos complexos sejam transformados em strings renderizáveis.
   */
  static transformEspnToBettable(match: NormalizedESPNMatch): MatchModel {
    return {
      id: match.id,
      espnId: match.id,
      league: match.leagueName,
      leagueSlug: match.leagueSlug,
      // Garantir que homeTeam e awayTeam sejam strings (nomes)
      homeTeam: String(match.homeTeam?.name || 'Time Mandante'),
      awayTeam: String(match.awayTeam?.name || 'Time Visitante'),
      // Mapear logos para o nível superior para facilitar acesso
      homeLogo: match.homeTeam?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
      awayLogo: match.awayTeam?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
      kickoff: match.date,
      status: match.status,
      minute: match.clock || '',
      scoreHome: typeof match.homeTeam?.score === 'number' ? match.homeTeam.score : 0,
      scoreAway: typeof match.awayTeam?.score === 'number' ? match.awayTeam.score : 0,
      hasOdds: false, 
      odds: { home: 1.0, draw: 1.0, away: 1.0 },
      isLive: match.status === 'LIVE',
      isFinished: match.status === 'FINISHED',
      marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'OPEN'
    };
  }
}
