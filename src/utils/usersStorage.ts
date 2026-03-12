'use client';

/**
 * @fileOverview Persistência de Usuários via LocalStorage com Seeding Automático Síncrono.
 * Suporta Multi-Banca.
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
  bancaId: string; // Obrigatório
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

const seedInitialUsers = (): User[] => {
  const now = new Date().toISOString();
  const initialUsers: User[] = [
    {
      id: 'u-superadmin',
      terminal: '10001',
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
    },
    {
      id: 'u-20002',
      terminal: '20002',
      password: '1234',
      nome: 'Caixa Matriz',
      status: 'ACTIVE',
      tipoUsuario: 'CAMBISTA',
      permissoes: getDefaultPermissions('CAMBISTA'),
      cambistaConfig: { loginFechamento: 'caixa', senhaFechamento: '1234' },
      promotorConfig: { porcentagemComissao: 10 },
      saldo: 5000,
      bonus: 0,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    }
  ];
  setStorageItem(USERS_KEY, initialUsers);
  return initialUsers;
};

export const getUsers = (bancaId?: string | null): User[] => {
  const users = getStorageItem<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    return seedInitialUsers();
  }
  
  if (bancaId) {
    return users.filter(u => u.bancaId === bancaId || u.tipoUsuario === 'SUPER_ADMIN');
  }
  
  return users;
};

export const getUserByTerminal = (terminal: string): User | null => {
  const users = getStorageItem<User[]>(USERS_KEY, []);
  if (users.length === 0) seedInitialUsers();
  const all = getStorageItem<User[]>(USERS_KEY, []);
  return all.find(u => u.terminal === terminal || u.email === terminal) || null;
};

export const saveUsers = (users: User[]) => {
  setStorageItem(USERS_KEY, users);
};

export const upsertUser = (userData: Partial<User> & { terminal: string }) => {
  const allUsers = getStorageItem<User[]>(USERS_KEY, []);
  const index = allUsers.findIndex(u => u.terminal === userData.terminal);
  const now = new Date().toISOString();

  if (index >= 0) {
    allUsers[index] = { ...allUsers[index], ...userData, updatedAt: now };
  } else {
    const newUser = {
      ...userData,
      id: userData.id || `u-${userData.terminal}-${Date.now()}`,
      status: userData.status || 'ACTIVE',
      tipoUsuario: userData.tipoUsuario || 'USUARIO',
      permissoes: userData.permissoes || getDefaultPermissions(userData.tipoUsuario || 'USUARIO'),
      saldo: userData.saldo || 0,
      bonus: userData.bonus || 0,
      bancaId: userData.bancaId || 'default',
      createdAt: now,
      updatedAt: now
    } as User;
    allUsers.push(newUser);
  }
  saveUsers(allUsers);
};

export interface AdminLog {
  id: string;
  adminUser: string;
  action: string;
  terminal: string;
  delta?: number;
  reason?: string;
  at: string;
  bancaId: string;
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

export const getAuditLogs = (bancaId: string, terminal?: string): AdminLog[] => {
  const logs = getStorageItem<AdminLog[]>(AUDIT_KEY, []);
  return logs.filter(l => l.bancaId === bancaId && (!terminal || l.terminal === terminal));
};

export const addPromoterCredit = (terminal: string, amount: number, reason: string, bancaId: string) => {
  const user = getUserByTerminal(terminal);
  if (user) {
    upsertUser({ terminal, saldo: user.saldo + amount, bancaId: user.bancaId });
    logAdminAction({
      adminUser: 'admin',
      action: 'CREDIT_ADDED',
      terminal,
      delta: amount,
      reason,
      bancaId
    });
  }
};
