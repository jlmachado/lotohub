/**
 * @fileOverview Catálogo manual de ligas mapeando ESPN e LiveScore API.
 * Contém os principais campeonatos mundiais mapeados entre os dois provedores.
 */

export interface ESPNLeagueConfig {
  id: string;
  name: string;
  slug: string; // Slug usado na URL da ESPN (ex: bra.1)
  livescoreId: string; // Competition ID na LiveScore API
  category: 'NACIONAL' | 'ESTADUAL' | 'COPA' | 'INTERNACIONAL' | 'SELECAO';
  country?: string;
  priority: number;
  active: boolean;
  useStandings: boolean;
  useTeams: boolean;
  useNews: boolean;
  
  // Betting Specific Configs
  habilitarPrematch: boolean;
  habilitarLive: boolean;
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
    habilitarLive: true
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
    habilitarLive: true
  },
  {
    id: 'bra-copa-brasil',
    name: 'Copa do Brasil',
    slug: 'bra.copa_do_brasil',
    livescoreId: '10',
    category: 'COPA',
    country: 'Brasil',
    priority: 3,
    active: true,
    useStandings: false,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },

  // --- INTERNACIONAIS / COPAS ---
  {
    id: 'uefa-cl',
    name: 'Champions League',
    slug: 'uefa.champions',
    livescoreId: '244',
    category: 'COPA',
    country: 'Europa',
    priority: 4,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'uefa-el',
    name: 'Europa League',
    slug: 'uefa.europa',
    livescoreId: '245',
    category: 'COPA',
    country: 'Europa',
    priority: 5,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'conmebol-lib',
    name: 'Libertadores',
    slug: 'conmebol.libertadores',
    livescoreId: '242',
    category: 'COPA',
    country: 'América do Sul',
    priority: 6,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },

  // --- EUROPA LIGAS ---
  {
    id: 'eng-pl',
    name: 'Premier League',
    slug: 'eng.1',
    livescoreId: '3',
    category: 'NACIONAL',
    country: 'Inglaterra',
    priority: 10,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'eng-ch',
    name: 'Championship',
    slug: 'eng.2',
    livescoreId: '4',
    category: 'NACIONAL',
    country: 'Inglaterra',
    priority: 11,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'esp-laliga',
    name: 'La Liga',
    slug: 'esp.1',
    livescoreId: '5',
    category: 'NACIONAL',
    country: 'Espanha',
    priority: 12,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'ita-serie-a',
    name: 'Serie A (ITA)',
    slug: 'ita.1',
    livescoreId: '6',
    category: 'NACIONAL',
    country: 'Itália',
    priority: 13,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'ger-bundesliga',
    name: 'Bundesliga',
    slug: 'ger.1',
    livescoreId: '7',
    category: 'NACIONAL',
    country: 'Alemanha',
    priority: 14,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'fra-ligue1',
    name: 'Ligue 1',
    slug: 'fra.1',
    livescoreId: '8',
    category: 'NACIONAL',
    country: 'França',
    priority: 15,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'por-liga',
    name: 'Liga Portugal',
    slug: 'por.1',
    livescoreId: '11',
    category: 'NACIONAL',
    country: 'Portugal',
    priority: 16,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'ned-ere',
    name: 'Eredivisie',
    slug: 'ned.1',
    livescoreId: '12',
    category: 'NACIONAL',
    country: 'Holanda',
    priority: 17,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'bel-pro',
    name: 'Pro League (BEL)',
    slug: 'bel.1',
    livescoreId: '13',
    category: 'NACIONAL',
    country: 'Bélgica',
    priority: 18,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'tur-super',
    name: 'Super Lig (TUR)',
    slug: 'tur.1',
    livescoreId: '14',
    category: 'NACIONAL',
    country: 'Turquia',
    priority: 19,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'usa-mls',
    name: 'MLS',
    slug: 'usa.1',
    livescoreId: '15',
    category: 'NACIONAL',
    country: 'EUA',
    priority: 20,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'mex-liga',
    name: 'Liga MX',
    slug: 'mex.1',
    livescoreId: '16',
    category: 'NACIONAL',
    country: 'México',
    priority: 21,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'arg-liga',
    name: 'Liga Argentina',
    slug: 'arg.1',
    livescoreId: '17',
    category: 'NACIONAL',
    country: 'Argentina',
    priority: 22,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'sau-liga',
    name: 'Saudi Pro League',
    slug: 'sau.1',
    livescoreId: '18',
    category: 'NACIONAL',
    country: 'Arábia Saudita',
    priority: 23,
    active: true,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'sco-prem',
    name: 'Scottish Premiership',
    slug: 'sco.1',
    livescoreId: '19',
    category: 'NACIONAL',
    country: 'Escócia',
    priority: 24,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  },
  {
    id: 'jpn-j1',
    name: 'J1 League',
    slug: 'jpn.1',
    livescoreId: '20',
    category: 'NACIONAL',
    country: 'Japão',
    priority: 25,
    active: false,
    useStandings: true,
    useTeams: true,
    useNews: true,
    habilitarPrematch: true,
    habilitarLive: true
  }
];
