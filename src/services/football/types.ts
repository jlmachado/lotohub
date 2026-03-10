/**
 * @fileOverview Definições de tipos para o catálogo e validação de ligas de futebol.
 */

export type LeagueCategory = 'NACIONAL' | 'ESTADUAL' | 'FEMININO' | 'OUTROS';

export type ValidationStatus = 
  | 'NAO_TESTADA'
  | 'DISPONIVEL'
  | 'DISPONIVEL_PARCIAL'
  | 'SEM_EVENTOS'
  | 'SEM_TIMES'
  | 'SEM_CLASSIFICACAO'
  | 'NAO_ENCONTRADA'
  | 'FALHA_API';

export type CoverageStatus = 
  | 'COMPLETA'
  | 'PARCIAL'
  | 'LIMITADA_NO_FREE'
  | 'INDISPONIVEL'
  | 'A_CONFIRMAR';

export interface CatalogLeague {
  internalId: string;
  nomeExibicao: string;
  possiveisNomesNaAPI: string[];
  idLeague?: string;
  categoria: LeagueCategory;
  genero: 'Male' | 'Female';
  divisao: string;
  prioridade: number;
  ativa: boolean;
  recomendada: boolean;
  
  // Status de Validação
  statusValidacao: ValidationStatus;
  statusCobertura: CoverageStatus;
  ultimaValidacao?: string;
  erroValidacao?: string;
  
  // Contadores
  totalJogos?: number;
  totalTimes?: number;
  temTabela?: boolean;
  
  // Metadados API
  badge?: string;
  logo?: string;
}
