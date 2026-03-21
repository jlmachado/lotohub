/**
 * @fileOverview Utilitário avançado para resolução de Tenant (Banca).
 * Detecta o bancaId via subdomínio ou contexto administrativo com suporte multi-banca.
 */
import { getBancas, getCurrentBancaContext, Banca, BancaModulos, BancaContext } from './bancasStorage';
import { getSession } from './auth';

export const getActiveContext = (): BancaContext | null => {
  return getCurrentBancaContext();
};

/**
 * Retorna o ID da banca ativa baseado na prioridade:
 * 1. Usuário logado
 * 2. Subdomínio
 * 3. Contexto selecionado
 * 4. Default
 */
export const getCurrentBancaId = (): string => {
  const session = getSession();
  if (session?.bancaId) return session.bancaId;

  const subdomain = getSubdomain();
  const context = getCurrentBancaContext();
  const bancas = getBancas();

  if (subdomain && subdomain !== 'www' && subdomain !== 'lotohub') {
    const found = bancas.find(b => b.subdomain === subdomain);
    if (found) return found.id;
  }

  if (context?.mode === 'BANCA' && context.bancaId) {
    return context.bancaId;
  }

  return 'default';
};

/**
 * Extrai o subdomínio da URL atual.
 */
export const getSubdomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  
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
 * Resolve o objeto da banca ativa.
 */
export const resolveCurrentBanca = (): Banca | null => {
  const bancaId = getCurrentBancaId();
  const bancas = getBancas();
  return bancas.find(b => b.id === bancaId) || bancas.find(b => b.id === 'default') || null;
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
