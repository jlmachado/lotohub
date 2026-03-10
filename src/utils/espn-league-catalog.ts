/**
 * @fileOverview Catálogo manual de ligas mapeando ESPN e LiveScore API.
 * Contém os principais campeonatos mundiais pré-configurados.
 */

export interface ESPNLeagueConfig {
  id: string;
  name: string;
  slug: string;
  livescoreId?: string;
  category: 'NACIONAL' | 'ESTADUAL' | 'COPA' | 'FEMININO' | 'INTERNACIONAL' | 'SELECAO';
  country?: string;
  priority: number;
  active: boolean;
  useStandings: boolean;
  useTeams: boolean;
  useNews: boolean;
  
  // Betting Specific Configs
  habilitarPrematch: boolean;
  habilitarLive: boolean;
  lockBetMinutesBeforeKickoff: number;
  autoCloseOnLiveStart: boolean;
  autoSuspendWhenNoOdds: boolean;
}

export const ESPN_LEAGUE_CATALOG: ESPNLeagueConfig[] = [
  // --- BRASIL ---
  {
    id: 'bra-serie-a',
    name: 'Brasileirão Série A',
    slug: 'bra.1',
    livescoreId: '1',
    category: 'NACIONAL',
    country: 'Brasil',
    priority: 1,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'bra-serie-b',
    name: 'Brasileirão Série B',
    slug: 'bra.2',
    livescoreId: '2',
    category: 'NACIONAL',
    country: 'Brasil',
    priority: 2,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'bra-copa-brasil',
    name: 'Copa do Brasil',
    slug: 'bra.copa_do_brasil',
    livescoreId: '10',
    category: 'COPA',
    country: 'Brasil',
    priority: 4,
    active: true,
    useStandings: false,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },

  // --- EUROPA PRINCIPAIS ---
  {
    id: 'eng-pl',
    name: 'Premier League',
    slug: 'eng.1',
    livescoreId: '3',
    category: 'NACIONAL',
    country: 'Inglaterra',
    priority: 5,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'esp-laliga',
    name: 'La Liga',
    slug: 'esp.1',
    livescoreId: '4',
    category: 'NACIONAL',
    country: 'Espanha',
    priority: 6,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'ita-serie-a',
    name: 'Serie A (ITA)',
    slug: 'ita.1',
    livescoreId: '5',
    category: 'NACIONAL',
    country: 'Itália',
    priority: 7,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'ger-bundesliga',
    name: 'Bundesliga',
    slug: 'ger.1',
    livescoreId: '6',
    category: 'NACIONAL',
    country: 'Alemanha',
    priority: 8,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  },
  {
    id: 'fra-ligue1',
    name: 'Ligue 1',
    slug: 'fra.1',
    livescoreId: '7',
    category: 'NACIONAL',
    country: 'França',
    priority: 9,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true,
    lockBetMinutesBeforeKickoff: 0,
    autoCloseOnLiveStart: true,
    autoSuspendWhenNoOdds: true
  }
];
