'use server';
import type { FootballApiConfig } from '@/context/AppContext';

/**
 * @fileOverview Serviço de integração com APIs de Futebol.
 * Suporta API-Futebol (Brasil) e API-Football (football-data.org).
 */

export interface ApiMatch {
  id: string;
  championshipId: string;
  championshipName: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  dateTime: string;
  status: string;
}

export interface ApiChampionship {
  id: string;
  name: string;
  logo: string;
}

export interface ApiTeam {
  id: string;
  name: string;
  logo: string;
}

abstract class ApiProviderBase {
  protected apiKey: string;
  protected mode: 'test' | 'live';
  
  constructor(config: FootballApiConfig) { 
    this.apiKey = config.apiKey; 
    this.mode = config.mode; 
  }

  abstract validarConexao(): Promise<boolean>;
  abstract getCampeonatos(): Promise<ApiChampionship[]>;
  abstract buscarTodosJogosFuturos(): Promise<ApiMatch[]>;
}

/**
 * Implementação para API-Futebol (api-futebol.com.br)
 */
class ApiFutebolProvider extends ApiProviderBase {
  private baseUrl = 'https://api.api-futebol.com.br/v1';

  async validarConexao() {
    if (this.mode === 'test') return true;
    try {
      const res = await fetch(`${this.baseUrl}/meu-plano`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        next: { revalidate: 0 }
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async getCampeonatos(): Promise<ApiChampionship[]> {
    if (this.mode === 'test') return [];
    try {
      const res = await fetch(`${this.baseUrl}/campeonatos`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((c: any) => ({
        id: String(c.campeonato_id),
        name: c.nome_popular,
        logo: c.logo
      }));
    } catch (e) {
      console.error("Erro ao buscar campeonatos API-Futebol:", e);
      return [];
    }
  }

  async buscarTodosJogosFuturos(): Promise<ApiMatch[]> {
    if (this.mode === 'test') return [];
    const campeonatos = await this.getCampeonatos();
    let allMatches: ApiMatch[] = [];

    for (const camp of campeonatos) {
      try {
        const res = await fetch(`${this.baseUrl}/campeonatos/${camp.id}/partidas`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        if (!res.ok) continue;
        const data = await res.json();
        
        const matches = (data.partidas?.proximas || []).map((m: any) => ({
          id: String(m.partida_id),
          championshipId: camp.id,
          championshipName: camp.name,
          homeTeamId: String(m.time_mandante.time_id),
          homeTeamName: m.time_mandante.nome_popular,
          homeTeamLogo: m.time_mandante.escudo,
          awayTeamId: String(m.time_visitante.time_id),
          awayTeamName: m.time_visitante.nome_popular,
          awayTeamLogo: m.time_visitante.escudo,
          dateTime: m.data_realizacao_iso,
          status: 'SCHEDULED'
        }));
        allMatches = [...allMatches, ...matches];
      } catch (e) {
        console.error(`Erro ao buscar partidas do campeonato ${camp.id}:`, e);
      }
    }
    return allMatches;
  }
}

/**
 * Implementação para API-Football (football-data.org) - Versão 4
 */
class ApiFootballDataProvider extends ApiProviderBase {
  private baseUrl = 'https://api.football-data.org/v4';
  
  // Ligas suportadas conforme solicitado, incluindo BSA (Brasileirão)
  private readonly SUPPORTED_CODES = [
    'BSA', 'PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'WC', 'DED', 'ELC', 'PPL', 'EC'
  ];

  async validarConexao() {
    if (this.mode === 'test') return true;
    if (!this.apiKey) return false;
    
    try {
      const res = await fetch(`${this.baseUrl}/competitions/PL`, {
        headers: { 'X-Auth-Token': this.apiKey },
        next: { revalidate: 0 }
      });
      return res.status === 200;
    } catch (e) {
      console.error("Erro na validação do token football-data.org:", e);
      return false;
    }
  }

  async getCampeonatos(): Promise<ApiChampionship[]> {
    try {
      const res = await fetch(`${this.baseUrl}/competitions`, {
        headers: { 'X-Auth-Token': this.apiKey }
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error("Erro API Football (competitions):", err);
        return [];
      }
      
      const data = await res.json();
      // Filtra apenas as ligas suportadas para reduzir ruído e garantir compatibilidade
      return (data.competitions || [])
        .filter((c: any) => this.SUPPORTED_CODES.includes(c.code))
        .map((c: any) => ({
          id: c.code,
          name: c.name,
          logo: c.emblem
        }));
    } catch (e) {
      console.error("Erro ao processar campeonatos:", e);
      return [];
    }
  }

  async buscarTodosJogosFuturos(): Promise<ApiMatch[]> {
    try {
      const now = new Date();
      const dateFrom = now.toISOString().split('T')[0];
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dateTo = nextWeek.toISOString().split('T')[0];

      // Explicitamente solicita as ligas suportadas (incluindo BSA) via parâmetro de query
      // Isso garante que a API inclua essas partidas na resposta
      const codes = this.SUPPORTED_CODES.join(',');
      const res = await fetch(`${this.baseUrl}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=${codes}`, {
        headers: { 'X-Auth-Token': this.apiKey }
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Erro API Football (matches):", err);
        return [];
      }

      const data = await res.json();
      return (data.matches || []).map((m: any) => ({
        id: String(m.id),
        championshipId: m.competition.code,
        championshipName: m.competition.name,
        homeTeamId: String(m.homeTeam.id),
        homeTeamName: m.homeTeam.name,
        homeTeamLogo: m.homeTeam.crest,
        awayTeamId: String(m.awayTeam.id),
        awayTeamName: m.awayTeam.name,
        awayTeamLogo: m.awayTeam.crest,
        dateTime: m.utcDate,
        status: m.status
      }));
    } catch (e) {
      console.error("Erro ao processar partidas:", e);
      return [];
    }
  }
}

class FootballApiService {
  private provider: ApiProviderBase;

  constructor(config: FootballApiConfig) {
    if (config.provider === 'api-football') {
      this.provider = new ApiFootballDataProvider(config);
    } else {
      this.provider = new ApiFutebolProvider(config);
    }
  }

  async validarConexao() { return this.provider.validarConexao(); }
  async getCampeonatos() { return this.provider.getCampeonatos(); }
  async buscarTodosJogosFuturos() { return this.provider.buscarTodosJogosFuturos(); }
}

export default FootballApiService;
