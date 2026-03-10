/**
 * @fileOverview Catálogo manual de ligas brasileiras suportadas pela ESPN API.
 */

export interface ESPNLeagueConfig {
  id: string;
  name: string;
  slug: string;
  category: 'NACIONAL' | 'ESTADUAL' | 'COPA' | 'FEMININO';
  priority: number;
  active: boolean;
  useStandings: boolean;
  useTeams: boolean;
  useNews: boolean;
}

export const ESPN_BRAZILIAN_LEAGUES: ESPNLeagueConfig[] = [
  {
    id: 'bra-serie-a',
    name: 'Brasileirão Série A',
    slug: 'bra.1',
    category: 'NACIONAL',
    priority: 1,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true
  },
  {
    id: 'bra-serie-b',
    name: 'Brasileirão Série B',
    slug: 'bra.2',
    category: 'NACIONAL',
    priority: 2,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true
  },
  {
    id: 'bra-serie-c',
    name: 'Brasileirão Série C',
    slug: 'bra.3',
    category: 'NACIONAL',
    priority: 3,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: false
  },
  {
    id: 'bra-copa-brasil',
    name: 'Copa do Brasil',
    slug: 'bra.copa_do_brasil',
    category: 'COPA',
    priority: 4,
    active: true,
    useStandings: false,
    useTeams: true,
    useNews: true
  },
  {
    id: 'bra-nordeste',
    name: 'Copa do Nordeste',
    slug: 'bra.copa_do_nordeste',
    category: 'COPA',
    priority: 5,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: false
  },
  {
    id: 'est-paulista',
    name: 'Campeonato Paulista',
    slug: 'bra.campeonato_paulista',
    category: 'ESTADUAL',
    priority: 10,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: false
  },
  {
    id: 'est-carioca',
    name: 'Campeonato Carioca',
    slug: 'bra.carioca',
    category: 'ESTADUAL',
    priority: 11,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: false
  },
  {
    id: 'est-gaucho',
    name: 'Campeonato Gaúcho',
    slug: 'bra.gaucho',
    category: 'ESTADUAL',
    priority: 12,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: false
  },
  {
    id: 'est-mineiro',
    name: 'Campeonato Mineiro',
    slug: 'bra.mineiro',
    category: 'ESTADUAL',
    priority: 13,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: false
  }
];
