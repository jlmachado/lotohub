
'use client';

/**
 * @fileOverview Persistência de Bancas via LocalStorage e Firestore.
 */

import { getStorageItem, setStorageItem } from './safe-local-storage';
import { BaseRepository } from '@/repositories/base-repository';

export interface BancaModulos {
  bingo: boolean;
  cassino: boolean;
  jogoDoBicho: boolean;
  seninha: boolean;
  quininha: boolean;
  lotinha: boolean;
  futebol: boolean;
  sinucaAoVivo: boolean;
  loteriaUruguai: boolean;
}

export interface DescargaConfig {
  limitePremio: number;
  ativo: boolean;
  updatedAt: number;
}

export interface Banca {
  id: string;
  subdomain: string;
  adminLogin: string;
  adminPassword: string;
  nome: string;
  cidade?: string;
  whatsapp?: string;
  baseTerminal: number; // Base numérica para geração de terminais
  modulos: BancaModulos;
  descargaConfig: DescargaConfig;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

/**
 * Contexto de navegação administrativa
 */
export interface BancaContext {
  mode: 'GLOBAL' | 'BANCA';
  bancaId: string | null;
  subdomain: string | null;
  updatedAt: string;
}

const BANCAS_KEY = 'app:bancas:v1';
const CURRENT_BANCA_KEY = 'app:current_banca:v1';

// Repositório Cloud
const bancasRepo = new BaseRepository<Banca>('bancas');

export const getBancas = (): Banca[] => {
  const bancas = getStorageItem<Banca[]>(BANCAS_KEY, []);
  if (bancas.length === 0) {
    const defaultBanca: Banca = {
      id: 'default',
      subdomain: 'matriz',
      nome: 'LotoHub Matriz',
      adminLogin: 'admin',
      adminPassword: 'password',
      status: 'ACTIVE',
      baseTerminal: 10000, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modulos: {
        bingo: true,
        cassino: true,
        jogoDoBicho: true,
        seninha: true,
        quininha: true,
        lotinha: true,
        futebol: true,
        sinucaAoVivo: true,
        loteriaUruguai: true
      },
      descargaConfig: { limitePremio: 10000, ativo: true, updatedAt: Date.now() }
    };
    setStorageItem(BANCAS_KEY, [defaultBanca]);
    bancasRepo.save(defaultBanca);
    return [defaultBanca];
  }
  return bancas;
};

export const saveBancas = (bancas: Banca[]) => {
  setStorageItem(BANCAS_KEY, bancas);
};

export const upsertBanca = (bancaData: Partial<Banca> & { subdomain: string }) => {
  const bancas = getBancas();
  const index = bancas.findIndex(b => b.subdomain === bancaData.subdomain);
  const now = new Date().toISOString();

  let finalBanca: Banca;

  if (index >= 0) {
    finalBanca = { ...bancas[index], ...bancaData, updatedAt: now };
    bancas[index] = finalBanca;
  } else {
    const lastBase = bancas.length > 0 ? Math.max(...bancas.map(b => b.baseTerminal)) : 0;
    const newBase = lastBase + 10000;

    finalBanca = {
      ...bancaData,
      id: bancaData.id || `banca-${bancaData.subdomain}-${Date.now()}`,
      adminLogin: bancaData.adminLogin || 'admin',
      adminPassword: bancaData.adminPassword || '1234',
      nome: bancaData.nome || 'Nova Banca',
      baseTerminal: bancaData.baseTerminal || newBase,
      modulos: bancaData.modulos || {
        bingo: true, cassino: true, jogoDoBicho: true, seninha: true,
        quininha: true, lotinha: true, futebol: true, sinucaAoVivo: true, loteriaUruguai: true
      },
      descargaConfig: bancaData.descargaConfig || { limitePremio: 999999, ativo: false, updatedAt: Date.now() },
      status: bancaData.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    } as Banca;
    bancas.push(finalBanca);
  }
  
  saveBancas(bancas);
  bancasRepo.save(finalBanca); // PERSISTÊNCIA CLOUD
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app:data-changed'));
  }
};

export const getCurrentBancaContext = (): BancaContext | null => {
  return getStorageItem<BancaContext | null>(CURRENT_BANCA_KEY, null);
};

export const setBancaContext = (context: BancaContext | null) => {
  if (!context) {
    localStorage.removeItem(CURRENT_BANCA_KEY);
  } else {
    setStorageItem(CURRENT_BANCA_KEY, context);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('banca-context-updated'));
  }
};

export const setBancaContextGlobal = () => {
  setBancaContext({
    mode: 'GLOBAL',
    bancaId: null,
    subdomain: null,
    updatedAt: new Date().toISOString()
  });
};

export const setBancaContextBanca = (banca: Banca) => {
  setBancaContext({
    mode: 'BANCA',
    bancaId: banca.id,
    subdomain: banca.subdomain,
    updatedAt: new Date().toISOString()
  });
};
