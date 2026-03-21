'use client';

/**
 * @fileOverview Persistência de Usuários via LocalStorage e Firestore.
 */

import { getStorageItem, setStorageItem } from './safe-local-storage';
import { getBancas } from './bancasStorage';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type UserType = 'USUARIO' | 'PROMOTOR' | 'CAMBISTA' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserPermissions {
  podeApostar: boolean;
  podeDepositar: boolean;
  podeSacar: boolean;
  podeVerRelatorios: boolean;
  podeFazerJogoParaTerceiros: boolean;
  podeReceberComissao: boolean;
  podeFecharCaixa: boolean;
  podeAcessarAdmin: boolean;
  podeGerenciarBancas: boolean;
}

export interface User {
  id: string;
  terminal: string;
  email: string;
  password: string;
  nome: string;
  cpf?: string;
  cidade?: string;
  whatsapp?: string;
  status: UserStatus;
  tipoUsuario: UserType;
  permissoes: UserPermissions;
  promotorConfig?: { porcentagemComissao: number; };
  cambistaConfig?: { loginFechamento: string; senhaFechamento: string; };
  saldo: number;
  bonus: number;
  bancaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  adminUser: string;
  action: string;
  terminal: string;
  reason?: string;
  delta?: number;
  bancaId?: string;
  at: string;
}

const USERS_KEY = 'app:users:v1';
const AUDIT_LOGS_KEY = 'app:audit_logs:v1';

export const getDefaultPermissions = (type: UserType): UserPermissions => {
  const common = {
    podeApostar: true, podeDepositar: true, podeSacar: true, podeVerRelatorios: true,
    podeFazerJogoParaTerceiros: false, podeReceberComissao: false,
    podeFecharCaixa: false, podeAcessarAdmin: false, podeGerenciarBancas: false
  };
  switch (type) {
    case 'PROMOTOR': return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true };
    case 'CAMBISTA': return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true, podeFecharCaixa: true };
    case 'ADMIN': return { ...common, podeAcessarAdmin: true };
    case 'SUPER_ADMIN': return { ...common, podeAcessarAdmin: true, podeGerenciarBancas: true, podeFazerJogoParaTerceiros: true };
    default: return common;
  }
};

export const getDefaultUsers = (): User[] => {
  const now = "2024-01-01T00:00:00.000Z";
  return [
    {
      id: 'u-jao-lm',
      terminal: '99999',
      email: 'jao-lm@hotmail.com',
      password: 'admin',
      nome: 'João Machado (Master)',
      status: 'ACTIVE',
      tipoUsuario: 'SUPER_ADMIN',
      permissoes: getDefaultPermissions('SUPER_ADMIN'),
      saldo: 1000000,
      bonus: 0,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'u-superadmin',
      terminal: '10001',
      email: 'admin@lotohub.com',
      password: 'admin',
      nome: 'Diretoria LotoHub',
      status: 'ACTIVE',
      tipoUsuario: 'SUPER_ADMIN',
      permissoes: getDefaultPermissions('SUPER_ADMIN'),
      saldo: 1000000,
      bonus: 0,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    }
  ];
};

export const getUsers = (): User[] => {
  const users = getStorageItem<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    const defaults = getDefaultUsers();
    setStorageItem(USERS_KEY, defaults);
    return defaults;
  }
  return users;
};

export const upsertUser = async (userData: Partial<User> & { terminal: string }) => {
  const { firestore } = initializeFirebase();
  const allUsers = getUsers();
  const index = allUsers.findIndex(u => u.terminal === userData.terminal);
  const now = new Date().toISOString();

  let finalUser: User;

  if (index >= 0) {
    const existing = allUsers[index];
    finalUser = { ...existing, ...userData, updatedAt: now };
    allUsers[index] = finalUser;
  } else {
    const type = userData.tipoUsuario || 'USUARIO';
    finalUser = {
      ...userData,
      id: userData.id || `u-${userData.terminal}-${Date.now()}`,
      status: userData.status || 'ACTIVE',
      tipoUsuario: type,
      permissoes: userData.permissoes || getDefaultPermissions(type),
      saldo: userData.saldo || 0,
      bonus: userData.bonus || 0,
      bancaId: userData.bancaId || 'default',
      createdAt: now,
      updatedAt: now
    } as User;
    allUsers.push(finalUser);
  }

  setStorageItem(USERS_KEY, allUsers);
  
  // Persistência Cloud
  const userRef = doc(firestore, 'bancas', finalUser.bancaId, 'usuarios', finalUser.id);
  await setDoc(userRef, finalUser, { merge: true });
  
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('app:data-changed'));
};

export const getUserByTerminal = (terminal: string): User | null => getUsers().find(u => u.terminal === terminal || u.email === terminal) || null;

export const generateNextTerminalForBanca = (bancaId: string): string => {
  const banca = getBancas().find(b => b.id === bancaId);
  const users = getUsers();
  const base = banca?.baseTerminal || 10000;
  const terminalNumbers = users.filter(u => u.bancaId === bancaId).map(u => parseInt(u.terminal)).filter(n => !isNaN(n) && n >= base);
  let next = (terminalNumbers.length > 0 ? Math.max(...terminalNumbers) : base) + 1;
  while (users.some(u => u.terminal === String(next))) next++;
  return String(next);
};

export const logAdminAction = async (data: Omit<AdminLog, 'id' | 'at'>) => {
  const { firestore } = initializeFirebase();
  const bancaId = data.bancaId || 'default';
  const id = `log-${Date.now()}`;
  const now = new Date().toISOString();
  
  const logEntry = { ...data, id, at: now, bancaId };
  
  // Local cache
  const logs = getStorageItem<AdminLog[]>(AUDIT_LOGS_KEY, []);
  setStorageItem(AUDIT_LOGS_KEY, [logEntry, ...logs].slice(0, 100));

  // Firestore
  await setDoc(doc(firestore, `bancas/${bancaId}/auditLogs`, id), logEntry);
};

export const getAuditLogs = (terminal: string): AdminLog[] => {
  const logs = getStorageItem<AdminLog[]>(AUDIT_LOGS_KEY, []);
  return logs.filter(l => l.terminal === terminal);
};

export const addPromoterCredit = async (terminal: string, amount: number, reason: string) => {
  const user = getUserByTerminal(terminal);
  if (!user) return;
  
  const newBalance = (user.saldo || 0) + amount;
  await upsertUser({ terminal, saldo: newBalance });
  
  await logAdminAction({
    adminUser: 'system',
    action: 'PROMOTER_CREDIT',
    terminal,
    delta: amount,
    reason,
    bancaId: user.bancaId
  });
};
