/**
 * @fileOverview Serviço aprimorado para mapeamento ESPN <-> LiveScore.
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
  minute: string;
  scoreHome: number;
  scoreAway: number;
  hasOdds: boolean;
  odds: { home: number; draw: number; away: number; };
  isLive: boolean;
  isFinished: boolean;
  marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED';
}

export class MatchMapperService {
  static mapEspnWithLiveScore(
    espnMatches: NormalizedESPNMatch[],
    liveMatches: LiveScoreMatch[]
  ): MatchModel[] {
    const mapped: MatchModel[] = [];
    const now = new Date();

    espnMatches.forEach(espn => {
      // Matching inteligente: Janela de 4 horas + similaridade de nomes
      const liveMatch = liveMatches.find(l => {
        const timeDiff = Math.abs(new Date(espn.date).getTime() - new Date(l.scheduled).getTime()) / 3600000;
        return timeDiff < 4.0 && 
               (areTeamsSimilar(espn.homeTeam.name, l.homeTeam) || areTeamsSimilar(espn.awayTeam.name, l.awayTeam));
      });

      const isLive = espn.status === 'LIVE' || liveMatch?.status === 'LIVE';
      const isFinished = espn.status === 'FINISHED' || liveMatch?.status === 'FINISHED';
      
      let odds = liveMatch?.odds || generateDefaultOdds();
      const hasOdds = !!liveMatch?.odds;

      let marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED' = 'CLOSED';
      if (!isFinished) {
        marketStatus = hasOdds ? 'OPEN' : 'SUSPENDED';
      }

      mapped.push({
        id: espn.id,
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
        minute: liveMatch?.minute || '',
        scoreHome: liveMatch ? liveMatch.homeScore : espn.homeTeam.score,
        scoreAway: liveMatch ? liveMatch.awayScore : espn.awayTeam.score,
        hasOdds,
        odds,
        isLive,
        isFinished,
        marketStatus
      });
    });

    return mapped.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }
}
