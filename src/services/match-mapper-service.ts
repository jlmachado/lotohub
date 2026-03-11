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
   * Nota: Este serviço foi simplificado para focar no enriquecimento dos dados ESPN
   * com o motor de precificação interno configurado no AppContext.
   */
  static transformEspnToBettable(match: NormalizedESPNMatch): MatchModel {
    return {
      id: match.id,
      espnId: match.id,
      league: match.leagueName,
      leagueSlug: match.leagueSlug,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeLogo: match.homeTeam.logo,
      awayLogo: match.awayTeam.logo,
      kickoff: match.date,
      status: match.status,
      minute: match.clock || '',
      scoreHome: match.homeTeam.score,
      scoreAway: match.awayTeam.score,
      hasOdds: false, // Será preenchido pelo motor de odds
      odds: { home: 1.0, draw: 1.0, away: 1.0 },
      isLive: match.status === 'LIVE',
      isFinished: match.status === 'FINISHED',
      marketStatus: match.status === 'FINISHED' ? 'CLOSED' : 'SUSPENDED'
    };
  }
}
