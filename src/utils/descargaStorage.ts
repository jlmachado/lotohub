/**
 * Gerenciamento de persistência de apostas em Descarga.
 */

export interface DescargaEntry {
  id: string;
  bancaId: string;
  bancaNome: string;
  apostaId: string;
  userId: string;
  terminal: string;
  nomeUsuario: string;
  tipoUsuario: string;
  modulo: string;
  loteria?: string;
  horario?: string;
  modalidade?: string;
  numeros?: string | string[];
  valorApostado: number;
  retornoPossivel: number;
  status: "EM_DESCARGA" | "PAGO_PELO_SUPERADMIN" | "CANCELADO";
  createdAt: string;
  updatedAt: string;
}

const DESCARGAS_KEY = 'app:descargas:v1';

export const loadDescargas = (): DescargaEntry[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(DESCARGAS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

export const saveDescargas = (descargas: DescargaEntry[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DESCARGAS_KEY, JSON.stringify(descargas));
};

export const registerDescarga = (entry: Omit<DescargaEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  const descargas = loadDescargas();
  const now = new Date().toISOString();
  const newEntry: DescargaEntry = {
    ...entry,
    id: `dsc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now
  };
  descargas.unshift(newEntry);
  saveDescargas(descargas);
  return newEntry;
};

export const updateDescargaStatus = (id: string, status: DescargaEntry['status']) => {
  const descargas = loadDescargas();
  const index = descargas.findIndex(d => d.id === id);
  if (index >= 0) {
    descargas[index].status = status;
    descargas[index].updatedAt = new Date().toISOString();
    saveDescargas(descargas);
  }
};

export const getDescargasByBanca = (bancaId: string): DescargaEntry[] => {
  return loadDescargas().filter(d => d.bancaId === bancaId);
};