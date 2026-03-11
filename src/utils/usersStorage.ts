'use client';

/**
 * @fileOverview Persistência de Usuários via LocalStorage.
 * Restaurado para funcionamento síncrono local.
 */

import { getStorageItem, setStorageItem } from './safe-local-storage';

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
  email?: string;
  password: string;
  nome?: string;
  cidade?: string;
  whatsapp?: string;
  status: UserStatus;
  tipoUsuario: UserType;
  permissoes: UserPermissions;
  promotorConfig?: { porcentagemComissao: number; };
  cambistaConfig?: { loginFechamento: string; senhaFechamento: string; };
  saldo: number;
  bonus: number;
  bancaId?: string;
  createdAt: string;
  updatedAt: string;
}

const USERS_KEY = 'app:users:v1';

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

export const getUsers = (): User[] => {
  return getStorageItem(USERS_KEY, []);
};

export const getUserByTerminal = (terminal: string): User | null => {
  const users = getUsers();
  return users.find(u => u.terminal === terminal) || null;
};

export const saveUsers = (users: User[]) => {
  setStorageItem(USERS_KEY, users);
};

export const upsertUser = (userData: Partial<User> & { terminal: string }) => {
  const users = getUsers();
  const index = users.findIndex(u => u.terminal === userData.terminal);
  const now = new Date().toISOString();

  if (index >= 0) {
    users[index] = { ...users[index], ...userData, updatedAt: now };
  } else {
    const newUser = {
      ...userData,
      id: userData.id || `u-${userData.terminal}-${Date.now()}`,
      status: userData.status || 'ACTIVE',
      tipoUsuario: userData.tipoUsuario || 'USUARIO',
      permissoes: userData.permissoes || getDefaultPermissions(userData.tipoUsuario || 'USUARIO'),
      saldo: userData.saldo || 0,
      bonus: userData.bonus || 0,
      createdAt: now,
      updatedAt: now
    } as User;
    users.push(newUser);
  }
  saveUsers(users);
};

export interface AdminLog {
  id: string;
  adminUser: string;
  action: string;
  terminal: string;
  delta?: number;
  reason?: string;
  at: string;
  bancaId?: string;
}

const AUDIT_KEY = 'app:admin_audit:v1';

export const logAdminAction = (log: Omit<AdminLog, 'id' | 'at'>) => {
  const logs = getStorageItem<AdminLog[]>(AUDIT_KEY, []);
  logs.unshift({
    ...log,
    id: `log-${Date.now()}`,
    at: new Date().toISOString()
  });
  setStorageItem(AUDIT_KEY, logs.slice(0, 1000));
};

export const getAuditLogs = (terminal?: string): AdminLog[] => {
  const logs = getStorageItem<AdminLog[]>(AUDIT_KEY, []);
  if (terminal) return logs.filter(l => l.terminal === terminal);
  return logs;
};

export const addPromoterCredit = (terminal: string, amount: number, reason: string) => {
  const user = getUserByTerminal(terminal);
  if (user) {
    upsertUser({ terminal, saldo: user.saldo + amount });
    logAdminAction({
      adminUser: 'admin',
      action: 'CREDIT_ADDED',
      terminal,
      delta: amount,
      reason
    });
  }
};
