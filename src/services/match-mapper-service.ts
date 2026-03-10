/**
 * @fileOverview Serviço responsável por cruzar dados da ESPN com LiveScore.
 */

import { NormalizedESPNMatch } from '@/utils/espn-normalizer';
import { LiveScoreMatch } from '@/utils/livescore-normalizer';
import { areTeamsSimilar } from '@/utils/team-name-normalizer';

export interface MatchModel {
  id: string;
  espnId?: string;
  liveScoreId?: string;
  league: string;
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
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  isLive: boolean;
  isFinished: boolean;
  isBettable: boolean;
}

export class MatchMapperService {
  /**
   * Une as listas de jogos da ESPN e LiveScore.
   */
  static mapEspnWithLiveScore(
    espnMatches: NormalizedESPNMatch[],
    liveMatches: LiveScoreMatch[]
  ): MatchModel[] {
    const mapped: MatchModel[] = [];

    // 1. Processar jogos da ESPN (Base estrutural)
    espnMatches.forEach(espn => {
      // Tenta encontrar correspondente no LiveScore
      const liveMatch = liveMatches.find(l => {
        // Comparar data (mesmo dia ou diferença de 2h)
        const espnDate = new Date(espn.date).getTime();
        const liveDate = new Date(l.scheduled).getTime();
        const hourDiff = Math.abs(espnDate - liveDate) / 3600000;
        
        if (hourDiff > 2) return false;

        // Comparar nomes dos times
        return areTeamsSimilar(espn.homeTeam.name, l.homeTeam) && 
               areTeamsSimilar(espn.awayTeam.name, l.awayTeam);
      });

      const isLive = espn.status === 'LIVE' || (liveMatch?.status === 'LIVE');
      const isFinished = espn.status === 'FINISHED' || (liveMatch?.status === 'FINISHED');
      
      const odds = liveMatch?.odds || { home: 0, draw: 0, away: 0 };
      const hasOdds = odds.home > 0;

      mapped.push({
        id: `match-${espn.id}`,
        espnId: espn.id,
        liveScoreId: liveMatch?.id,
        league: espn.leagueName,
        homeTeam: espn.homeTeam.name,
        awayTeam: espn.awayTeam.name,
        homeLogo: espn.homeTeam.logo,
        awayLogo: espn.awayTeam.logo,
        kickoff: espn.date,
        status: isLive ? (espn.statusDetail || 'Ao Vivo') : espn.status,
        minute: liveMatch?.minute || '',
        scoreHome: isLive ? (liveMatch?.homeScore ?? espn.homeTeam.score) : espn.homeTeam.score,
        scoreAway: isLive ? (liveMatch?.awayScore ?? espn.awayTeam.score) : espn.awayTeam.score,
        hasOdds,
        odds,
        isLive,
        isFinished,
        isBettable: !isFinished && hasOdds
      });
    });

    // 2. Adicionar jogos que estão no LiveScore mas não vieram da ESPN (evita perda de dados)
    liveMatches.forEach(l => {
      const alreadyMapped = mapped.some(m => m.liveScoreId === l.id);
      if (!alreadyMapped && l.status === 'LIVE') {
        mapped.unshift({
          id: `ls-${l.id}`,
          liveScoreId: l.id,
          league: l.competitionName,
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          homeLogo: l.homeLogo || '',
          awayLogo: l.awayLogo || '',
          kickoff: l.scheduled,
          status: 'LIVE',
          minute: l.minute,
          scoreHome: l.homeScore,
          scoreAway: l.awayScore,
          hasOdds: l.hasLiveOdds,
          odds: l.odds,
          isLive: true,
          isFinished: false,
          isBettable: true
        });
      }
    });

    return mapped.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }
}
