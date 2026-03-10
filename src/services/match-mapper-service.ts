/**
 * @fileOverview Serviço responsável por cruzar dados da ESPN com LiveScore.
 * Implementa lógica de matching por similaridade de nomes e janelas de tempo.
 */

import { NormalizedESPNMatch } from '@/utils/espn-normalizer';
import { LiveScoreMatch } from '@/utils/livescore-normalizer';
import { areTeamsSimilar } from '@/utils/team-name-normalizer';

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
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  isLive: boolean;
  isFinished: boolean;
  isBettable: boolean;
  marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED';
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

    // 1. Processar jogos da ESPN como base estrutural
    espnMatches.forEach(espn => {
      // Tenta encontrar correspondente no LiveScore (Odds/Tempo Real)
      const liveMatch = liveMatches.find(l => {
        const espnDate = new Date(espn.date).getTime();
        const liveDate = new Date(l.scheduled).getTime();
        const hourDiff = Math.abs(espnDate - liveDate) / 3600000;
        
        // Critérios de Matching: Mesma janela de 2h E nomes similares
        return hourDiff < 2.5 && areTeamsSimilar(espn.homeTeam.name, l.homeTeam) && areTeamsSimilar(espn.awayTeam.name, l.awayTeam);
      });

      const isLive = espn.status === 'LIVE' || liveMatch?.status === 'LIVE';
      const isFinished = espn.status === 'FINISHED' || liveMatch?.status === 'FINISHED';
      
      const odds = liveMatch?.odds || { home: 0, draw: 0, away: 0 };
      const hasOdds = odds.home > 1;

      // Determina se o mercado está aberto
      let marketStatus: 'OPEN' | 'SUSPENDED' | 'CLOSED' = 'CLOSED';
      if (!isFinished && hasOdds) {
        marketStatus = 'OPEN';
      } else if (isLive && !hasOdds) {
        marketStatus = 'SUSPENDED';
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
        odds,
        isLive,
        isFinished,
        isBettable: marketStatus === 'OPEN',
        marketStatus
      });
    });

    // 2. Adicionar jogos exclusivos da LiveScore (que não estão na ESPN) para garantir cobertura live
    liveMatches.forEach(l => {
      const alreadyMapped = mapped.some(m => m.liveScoreId === l.id);
      if (!alreadyMapped && l.status === 'LIVE') {
        mapped.push({
          id: `ls-${l.id}`,
          liveScoreId: l.id,
          league: l.competitionName,
          leagueSlug: 'other',
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          homeLogo: l.homeLogo || '',
          awayLogo: l.awayLogo || '',
          kickoff: l.scheduled,
          status: 'LIVE',
          statusLabel: 'Ao Vivo',
          minute: l.minute,
          scoreHome: l.homeScore,
          scoreAway: l.awayScore,
          hasOdds: l.odds.home > 1,
          odds: l.odds,
          isLive: true,
          isFinished: false,
          isBettable: l.odds.home > 1,
          marketStatus: l.odds.home > 1 ? 'OPEN' : 'SUSPENDED'
        });
      }
    });

    return mapped.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }
}
