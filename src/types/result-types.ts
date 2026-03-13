/**
 * @fileOverview Definições de tipos para o módulo de resultados e sincronização.
 */

export type ResultStatus = 'PENDENTE' | 'IMPORTADO' | 'CONFERIDO' | 'DIVERGENTE' | 'PUBLICADO' | 'ERRO';
export type SourceType = 'API' | 'SCRAPER' | 'MANUAL' | 'MOCK';

export interface JDBPrizeDetail {
  position: number;
  milhar: string;
  centena: string;
  dezena: string;
  grupo: string;
  animal: string;
}

export interface JDBNormalizedResult {
  id: string;
  externalId?: string;
  bancaId: string;
  stateCode: string;
  stateName: string;
  lotteryId: string;
  lotteryName: string;
  extractionName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: ResultStatus;
  sourceType: SourceType;
  sourceName: string;
  prizes: JDBPrizeDetail[];
  checksum: string;
  isDivergent: boolean;
  importedAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy?: string;
  notes?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}
