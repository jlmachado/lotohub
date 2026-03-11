
'use client';

/**
 * @fileOverview Persistência de Usuários via LocalStorage com Seeding Automático Síncrono.
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

const seedInitialUsers = (): User[] => {
  const now = new Date().toISOString();
  const initialUsers: User[] = [
    {
      id: 'u-10001',
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
      nome: 'Caixa Central',
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
    },
    {
      id: 'u-30003',
      terminal: '30003',
      password: '1234',
      nome: 'Promotor Gold',
      status: 'ACTIVE',
      tipoUsuario: 'PROMOTOR',
      permissoes: getDefaultPermissions('PROMOTOR'),
      promotorConfig: { porcentagemComissao: 15 },
      saldo: 1000,
      bonus: 500,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'u-40004',
      terminal: '40004',
      password: '1234',
      nome: 'Jogador Teste',
      status: 'ACTIVE',
      tipoUsuario: 'USUARIO',
      permissoes: getDefaultPermissions('USUARIO'),
      saldo: 100,
      bonus: 50,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    }
  ];
  setStorageItem(USERS_KEY, initialUsers);
  return initialUsers;
};

export const getUsers = (): User[] => {
  const users = getStorageItem<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    return seedInitialUsers();
  }
  return users;
};

export const getUserByTerminal = (terminal: string): User | null => {
  const users = getUsers();
  return users.find(u => u.terminal === terminal || u.email === terminal) || null;
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
