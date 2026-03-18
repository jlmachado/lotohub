/**
 * @fileOverview Utilitário avançado para resolução de Tenant (Banca).
 * Detecta o bancaId via subdomínio ou contexto administrativo.
 */
import { getBancas, getCurrentBancaContext, Banca, BancaModulos, BancaContext } from './bancasStorage';

export const getActiveContext = (): BancaContext | null => {
  return getCurrentBancaContext();
};

/**
 * Extrai o subdomínio da URL atual.
 * Ex: 'banca1.lotohub.app' -> 'banca1'
 */
export const getSubdomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  
  // Ignora localhost e domínios de desenvolvimento
  if (hostname === 'localhost' || hostname.includes('webcontainer.io')) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0];
  }
  return null;
};

/**
 * Resolve a banca ativa com prioridade: 
 * 1. Subdomínio da URL
 * 2. Contexto Admin selecionado (para SuperAdmin)
 * 3. Parâmetro de URL (debug)
 */
export const resolveCurrentBanca = (): Banca | null => {
  if (typeof window === 'undefined') return null;

  const subdomain = getSubdomain();
  const context = getCurrentBancaContext();
  const params = new URLSearchParams(window.location.search);
  const debugId = params.get('banca');

  const bancas = getBancas();
  
  // Se houver subdomínio, ele é a autoridade máxima de tenant
  if (subdomain && subdomain !== 'www' && subdomain !== 'lotohub') {
    return bancas.find(b => b.subdomain === subdomain) || null;
  }

  // Se for SuperAdmin navegando, respeita o contexto escolhido
  if (context?.mode === 'BANCA' && context.bancaId) {
    return bancas.find(b => b.id === context.bancaId) || null;
  }

  // Fallback para debug
  if (debugId) {
    return bancas.find(b => b.id === debugId || b.subdomain === debugId) || null;
  }

  return null;
};

export const getEnabledModules = (): BancaModulos => {
  const currentBanca = resolveCurrentBanca();
  
  if (!currentBanca) {
    return {
      bingo: true, cassino: true, jogoDoBicho: true, seninha: true,
      quininha: true, lotinha: true, futebol: true, sinucaAoVivo: true, loteriaUruguai: true
    };
  }

  return currentBanca.modulos;
};

export const isModuleEnabled = (moduleName: keyof BancaModulos): boolean => {
  const modules = getEnabledModules();
  return modules[moduleName];
};
