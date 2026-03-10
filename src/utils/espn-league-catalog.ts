/**
 * @fileOverview Catálogo manual de ligas mapeando ESPN e LiveScore API.
 */

export interface ESPNLeagueConfig {
  id: string;
  name: string;
  slug: string;
  livescoreId?: string; // Mapeamento para a Live Score API
  category: 'NACIONAL' | 'ESTADUAL' | 'COPA' | 'FEMININO' | 'INTERNACIONAL';
  priority: number;
  active: boolean;
  useStandings: boolean;
  useTeams: boolean;
  useNews: boolean;
}

export const ESPN_LEAGUE_CATALOG: ESPNLeagueConfig[] = [
  {
    id: 'bra-serie-a',
    name: 'Brasileirão Série A',
    slug: 'bra.1',
    livescoreId: '1', // Exemplo: ID real da Serie A na LiveScore
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
    livescoreId: '2',
    category: 'NACIONAL',
    priority: 2,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true
  },
  {
    id: 'bra-copa-brasil',
    name: 'Copa do Brasil',
    slug: 'bra.copa_do_brasil',
    livescoreId: '10',
    category: 'COPA',
    priority: 4,
    active: true,
    useStandings: false,
    useTeams: true,
    useNews: true
  },
  {
    id: 'est-paulista',
    name: 'Campeonato Paulista',
    slug: 'bra.campeonato_paulista',
    livescoreId: '15',
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
    livescoreId: '16',
    category: 'ESTADUAL',
    priority: 11,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: false
  }
];
