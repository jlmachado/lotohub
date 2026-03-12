/**
 * Utilitários para resolver o contexto da banca atual.
 */
import { getBancas, getCurrentBancaContext, Banca, BancaModulos, BancaContext } from './bancasStorage';

export const getActiveContext = (): BancaContext | null => {
  return getCurrentBancaContext();
};

export const resolveCurrentBanca = (): Banca | null => {
  if (typeof window === 'undefined') return null;

  // 1. Tentar por parâmetro de URL (Dev override)
  const params = new URLSearchParams(window.location.search);
  const bancaParam = params.get('banca');
  
  // 2. Tentar por contexto administrativo salvo
  const context = getCurrentBancaContext();
  
  // Prioridade: Contexto Admin > Parâmetro URL
  const searchKey = context?.subdomain || context?.bancaId || bancaParam;

  if (searchKey) {
    const bancas = getBancas();
    return bancas.find(b => b.subdomain === searchKey || b.id === searchKey) || null;
  }

  // Se nada for encontrado, retorna null (Modo Master Global)
  return null;
};

export const getEnabledModules = (): BancaModulos => {
  const currentBanca = resolveCurrentBanca();
  
  // Se não há banca selecionada (Modo Global), todos os módulos aparecem
  if (!currentBanca) {
    return {
      bingo: true,
      cassino: true,
      jogoDoBicho: true,
      seninha: true,
      quininha: true,
      lotinha: true,
      futebol: true,
      sinucaAoVivo: true,
      loteriaUruguai: true
    };
  }

  return currentBanca.modulos;
};

export const isModuleEnabled = (moduleName: keyof BancaModulos): boolean => {
  const modules = getEnabledModules();
  return modules[moduleName];
};
