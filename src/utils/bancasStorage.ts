'use client';

/**
 * @fileOverview Camada de compatibilidade para Bancas.
 * Integra as funções legadas com o repositório Firestore.
 */

import { bancasRepo } from '@/repositories/bancas-repository';

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
  modulos: BancaModulos;
  descargaConfig: DescargaConfig;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface BancaContext {
  mode: 'GLOBAL' | 'BANCA';
  bancaId: string | null;
  subdomain: string | null;
  updatedAt: string;
}

const CURRENT_BANCA_KEY = 'app:current_banca:v1';

/**
 * Retorna todas as bancas cadastradas no Firestore.
 */
export const getBancas = async (): Promise<Banca[]> => {
  return await bancasRepo.getAll();
};

/**
 * Cria ou atualiza uma banca no Firestore.
 */
export const upsertBanca = async (bancaData: Partial<Banca> & { subdomain: string }): Promise<Banca> => {
  const existing = await bancasRepo.getBySubdomain(bancaData.subdomain);
  const now = new Date().toISOString();

  if (existing) {
    const updated = { ...existing, ...bancaData, updatedAt: now };
    await bancasRepo.save(updated);
    return updated;
  } else {
    const newBanca: Banca = {
      id: bancaData.id || `banca-${bancaData.subdomain}-${Date.now()}`,
      subdomain: bancaData.subdomain.toLowerCase().trim(),
      adminLogin: bancaData.adminLogin || 'admin',
      adminPassword: bancaData.adminPassword || '1234',
      nome: bancaData.nome || 'Nova Banca',
      cidade: bancaData.cidade || '',
      whatsapp: bancaData.whatsapp || '',
      modulos: bancaData.modulos || {
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
      descargaConfig: bancaData.descargaConfig || {
        limitePremio: 999999,
        ativo: false,
        updatedAt: Date.now()
      },
      status: bancaData.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    await bancasRepo.save(newBanca);
    return newBanca;
  }
};

/**
 * Garante que a banca padrão exista (usado em migrações).
 */
export const ensureDefaultBanca = async () => {
  const existing = await bancasRepo.getById('default');
  if (!existing) {
    await upsertBanca({
      id: 'default',
      subdomain: 'default',
      nome: 'LotoHub Matriz',
      status: 'ACTIVE'
    });
  }
};

/**
 * Gerenciamento de Contexto (LocalStorage - Mantido local por ser preferência de sessão da UI)
 */
export const getCurrentBancaContext = (): BancaContext | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_BANCA_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const setBancaContext = (context: BancaContext | null) => {
  if (typeof window === 'undefined') return;
  if (!context) {
    localStorage.removeItem(CURRENT_BANCA_KEY);
  } else {
    localStorage.setItem(CURRENT_BANCA_KEY, JSON.stringify(context));
  }
  window.dispatchEvent(new Event('banca-context-updated'));
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

export const saveBancas = (bancas: Banca[]) => {
  // Função legada - No Firestore salvamos individualmente via upsertBanca
  console.warn("saveBancas (legacy) chamada. Use upsertBanca para persistência em nuvem.");
};
