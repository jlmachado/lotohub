/**
 * Gerenciamento de persistência de bancas (unidades) via LocalStorage.
 */

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

const BANCAS_KEY = 'app:bancas:v1';
const CURRENT_BANCA_KEY = 'app:current_banca:v1';
const BANCAS_AUDIT_KEY = 'app:bancas_audit:v1';

export const getBancas = (): Banca[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BANCAS_KEY);
  if (!stored) return [];
  try {
    const list: Banca[] = JSON.parse(stored);
    return list.map(b => ({
      ...b,
      modulos: {
        loteriaUruguai: false,
        ...b.modulos
      },
      descargaConfig: b.descargaConfig || {
        limitePremio: 999999,
        ativo: false,
        updatedAt: Date.now()
      }
    }));
  } catch (e) {
    return [];
  }
};

export const saveBancas = (bancas: Banca[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BANCAS_KEY, JSON.stringify(bancas));
};

export const ensureDefaultBanca = (): Banca => {
  const bancas = getBancas();
  const hasDefault = bancas.some(b => b.id === 'default' || b.subdomain === 'default');
  
  if (!hasDefault) {
    const now = new Date().toISOString();
    const defaultBanca: Banca = {
      id: "default",
      subdomain: "default",
      adminLogin: "admin-default",
      adminPassword: "12345",
      nome: "Banca Padrão",
      cidade: "",
      whatsapp: "",
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
      descargaConfig: {
        limitePremio: 10000,
        ativo: true,
        updatedAt: Date.now()
      },
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now
    };
    
    bancas.unshift(defaultBanca);
    saveBancas(bancas);
    
    return defaultBanca;
  }
  
  return bancas.find(b => b.id === 'default' || b.subdomain === 'default')!;
};

export const upsertBanca = (bancaData: Partial<Banca> & { subdomain: string }): Banca => {
  const bancas = getBancas();
  const index = bancas.findIndex(b => b.subdomain === bancaData.subdomain);
  const now = new Date().toISOString();

  if (index >= 0) {
    const updated = { 
      ...bancas[index], 
      ...bancaData, 
      updatedAt: now,
      descargaConfig: bancaData.descargaConfig || bancas[index].descargaConfig
    };
    bancas[index] = updated;
    saveBancas(bancas);
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
    bancas.push(newBanca);
    saveBancas(bancas);
    return newBanca;
  }
};

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
