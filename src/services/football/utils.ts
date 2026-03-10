import { CatalogLeague, ValidationStatus, CoverageStatus } from './types';

/**
 * Normaliza nomes de ligas para facilitar o matching.
 * Remove acentos, caracteres especiais e coloca em lowercase.
 */
export const normalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Tenta encontrar uma liga do catálogo que corresponda a um resultado da API.
 */
export const matchLeagueToCatalog = (apiLeagueName: string, catalog: CatalogLeague[]): CatalogLeague | null => {
  const normApi = normalizeName(apiLeagueName);
  
  return catalog.find(item => {
    // 1. Tentar por nomes possíveis cadastrados
    const matchByNames = item.possiveisNomesNaAPI.some(p => normalizeName(p) === normApi);
    if (matchByNames) return true;
    
    // 2. Tentar por nome de exibição
    if (normalizeName(item.nomeExibicao) === normApi) return true;
    
    return false;
  }) || null;
};

/**
 * Deriva o status de cobertura baseado no resultado da validação.
 */
export const deriveCoverage = (status: ValidationStatus): CoverageStatus => {
  switch (status) {
    case 'DISPONIVEL': return 'COMPLETA';
    case 'DISPONIVEL_PARCIAL': return 'PARCIAL';
    case 'SEM_CLASSIFICACAO': return 'LIMITADA_NO_FREE';
    case 'SEM_EVENTOS': 
    case 'SEM_TIMES': 
    case 'NAO_ENCONTRADA':
    case 'FALHA_API': 
      return 'INDISPONIVEL';
    default: return 'A_CONFIRMAR';
  }
};
