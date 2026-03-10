/**
 * @fileOverview Serviço responsável por cruzar dados da ESPN com LiveScore.
 * Gera o modelo unificado MatchModel para o sistema.
 */

import { NormalizedESPNMatch } from '@/utils/espn-normalizer';
import { LiveScoreMatch } from '@/utils/livescore-normalizer';
import { areTeamsSimilar } from '@/utils/team-name-normalizer';
import { generateDefaultOdds } from '@/utils/odds-generator';

export interface MatchModel {
  id: string;
  espnId?: string;
  liveScoreId?: string;
  league: string;
  leagueSlug: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  kickoff: string;
  status: string;
  statusLabel: string;
  minute: string;
  scoreHome: number;
  scoreAway: number;
  hasOdds: boolean;
  oddsSource: 'API' | 'AUTO';
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  isLive: boolean;
  isFinished: boolean;
  isBettable: boolean;
  marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED';
  mappingConfidence: number;
}

export class MatchMapperService {
  /**
   * Une as listas de jogos da ESPN e LiveScore criando um modelo unificado.
   */
  static mapEspnWithLiveScore(
    espnMatches: NormalizedESPNMatch[],
    liveMatches: LiveScoreMatch[]
  ): MatchModel[] {
    const mapped: MatchModel[] = [];
    const now = new Date();

    espnMatches.forEach(espn => {
      // Tenta encontrar correspondente no LiveScore
      const liveMatch = liveMatches.find(l => {
        const espnDate = new Date(espn.date).getTime();
        const liveDate = new Date(l.scheduled).getTime();
        const hourDiff = Math.abs(espnDate - liveDate) / 3600000;
        
        // Critérios de Matching: Mesma janela de 3h E nomes similares
        return hourDiff < 3.0 && 
               areTeamsSimilar(espn.homeTeam.name, l.homeTeam) && 
               areTeamsSimilar(espn.awayTeam.name, l.awayTeam);
      });

      const isLive = espn.status === 'LIVE' || liveMatch?.status === 'LIVE';
      const isFinished = espn.status === 'FINISHED' || liveMatch?.status === 'FINISHED';
      const kickoffDate = new Date(espn.date);
      const hasStarted = now >= kickoffDate;
      
      let odds = liveMatch?.odds || { home: 0, draw: 0, away: 0 };
      let oddsSource: 'API' | 'AUTO' = 'API';

      // Se não tem odds da API, gera automáticas para jogos futuros
      if (!isFinished && (!odds || odds.home <= 1)) {
        odds = generateDefaultOdds();
        oddsSource = 'AUTO';
      }

      const hasOdds = odds.home > 1;

      // Regra de Apostabilidade Profissional
      let marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED' = 'CLOSED';
      
      if (isFinished) {
        marketStatus = 'CLOSED';
      } else if (isLive) {
        // No momento, permitimos live apenas se tiver odds da API. 
        // Odds automáticas em live requerem motor de cálculo complexo.
        marketStatus = (oddsSource === 'API' && hasOdds) ? 'OPEN' : 'SUSPENDED';
      } else if (!hasStarted) {
        marketStatus = hasOdds ? 'OPEN' : 'CLOSED';
      }

      mapped.push({
        id: `match-${espn.id}`,
        espnId: espn.id,
        liveScoreId: liveMatch?.id,
        league: espn.leagueName,
        leagueSlug: espn.leagueSlug,
        homeTeam: espn.homeTeam.name,
        awayTeam: espn.awayTeam.name,
        homeLogo: espn.homeTeam.logo,
        awayLogo: espn.awayTeam.logo,
        kickoff: espn.date,
        status: espn.status,
        statusLabel: isLive ? (espn.statusDetail || 'Ao Vivo') : (isFinished ? 'Encerrado' : 'Agendado'),
        minute: liveMatch?.minute || '',
        scoreHome: isLive ? (liveMatch?.homeScore ?? espn.homeTeam.score) : espn.homeTeam.score,
        scoreAway: isLive ? (liveMatch?.awayScore ?? espn.awayTeam.score) : espn.awayTeam.score,
        hasOdds,
        oddsSource,
        odds,
        isLive,
        isFinished,
        isBettable: marketStatus === 'OPEN',
        marketStatus,
        mappingConfidence: liveMatch ? 1 : 0
      });
    });

    return mapped.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }
}
