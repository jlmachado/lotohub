import { BancaContext } from "./bancasStorage";

/**
 * @fileOverview Gerenciamento de persistência de preferências de filtros de relatórios.
 * Salva o estado da UI para que o usuário não precise re-selecionar datas ao navegar.
 */

export type QuickRange = 'today' | 'yesterday' | '7days' | '30days' | 'month' | null;

export interface ReportFiltersData {
  version: number;
  savedAt: number;
  dateStart: string;
  dateEnd: string;
  quickRange: QuickRange;
  searchTerm: string;
  status?: string | null;
  modulo?: string | null;
}

const BASE_KEY = 'app:report_filters:v1';

/**
 * Gera uma chave única baseada no contexto (Global ou Banca específica) e no tipo de relatório.
 */
export const getReportFilterKey = (ctx: BancaContext, reportType: string) => {
  const scope = ctx.mode === 'GLOBAL' ? 'GLOBAL' : `BANCA:${ctx.bancaId}`;
  return `${BASE_KEY}:${scope}:${reportType}`;
};

/**
 * Salva as preferências de filtro no LocalStorage.
 */
export const saveReportFilters = (ctx: BancaContext, reportType: string, filters: Omit<ReportFiltersData, 'version' | 'savedAt'>) => {
  if (typeof window === 'undefined' || !ctx) return;
  const key = getReportFilterKey(ctx, reportType);
  const data: ReportFiltersData = {
    ...filters,
    version: 1,
    savedAt: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Carrega as preferências salvas.
 */
export const loadReportFilters = (ctx: BancaContext, reportType: string): ReportFiltersData | null => {
  if (typeof window === 'undefined' || !ctx) return null;
  const key = getReportFilterKey(ctx, reportType);
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed.version === 1) return parsed;
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Limpa as preferências salvas para um relatório específico no contexto atual.
 */
export const clearReportFilters = (ctx: BancaContext, reportType: string) => {
  if (typeof window === 'undefined' || !ctx) return;
  const key = getReportFilterKey(ctx, reportType);
  localStorage.removeItem(key);
};
