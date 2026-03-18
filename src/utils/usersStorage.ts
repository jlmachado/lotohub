
'use client';

/**
 * @fileOverview Persistência de Usuários via LocalStorage e Firestore.
 */

import { getStorageItem, setStorageItem } from './safe-local-storage';
import { getBancas } from './bancasStorage';
import { usersRepo } from '@/repositories/users-repository';

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

const getDefaultUsers = (): User[] => {
  const now = new Date().toISOString();
  return [
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
    },
    {
      id: 'u-player-01',
      terminal: '12345',
      email: 'jogador@demo.com',
      password: '1234',
      nome: 'Jogador Demo',
      status: 'ACTIVE',
      tipoUsuario: 'USUARIO',
      permissoes: getDefaultPermissions('USUARIO'),
      saldo: 500,
      bonus: 100,
      bancaId: 'default',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'u-cambista-01',
      terminal: '20001',
      email: 'cambista@demo.com',
      password: '1234',
      nome: 'Cambista Matriz',
      status: 'ACTIVE',
      tipoUsuario: 'CAMBISTA',
      permissoes: getDefaultPermissions('CAMBISTA'),
      saldo: 0,
      bonus: 0,
      bancaId: 'default',
      promotorConfig: { porcentagemComissao: 10 },
      cambistaConfig: { loginFechamento: 'caixa20001', senhaFechamento: '1234' },
      createdAt: now,
      updatedAt: now
    }
  ];
};

export const getUsers = (bancaId?: string | null): User[] => {
  let users = getStorageItem<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    const defaults = getDefaultUsers();
    setStorageItem(USERS_KEY, defaults);
    return defaults;
  }
  return users;
};

export const upsertUser = (userData: Partial<User> & { terminal: string }) => {
  const allUsers = getUsers();
  const index = allUsers.findIndex(u => u.terminal === userData.terminal);
  const now = new Date().toISOString();

  let finalUser: User;

  if (index >= 0) {
    const existing = allUsers[index];
    const newRole = userData.tipoUsuario || existing.tipoUsuario;
    const updates: Partial<User> = { ...userData, updatedAt: now };
    
    if (newRole === 'PROMOTOR' && !existing.promotorConfig) updates.promotorConfig = { porcentagemComissao: 10 };
    if (newRole === 'CAMBISTA') {
      if (!existing.promotorConfig) updates.promotorConfig = { porcentagemComissao: 10 };
      if (!existing.cambistaConfig) updates.cambistaConfig = { loginFechamento: `caixa${existing.terminal}`, senhaFechamento: '1234' };
    }

    finalUser = { ...existing, ...updates, permissoes: getDefaultPermissions(newRole) };
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
  usersRepo.save(finalUser); // PERSISTÊNCIA CLOUD IMEDIATA
  
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('app:data-changed'));
};

export interface AdminLog { id: string; adminUser: string; action: string; terminal: string; delta?: number; reason?: string; at: string; bancaId: string; }
const AUDIT_KEY = 'app:admin_audit:v1';

export const logAdminAction = (log: Omit<AdminLog, 'id' | 'at'>) => {
  const logs = getStorageItem<AdminLog[]>(AUDIT_KEY, []);
  const newLog = { ...log, id: `log-${Date.now()}`, at: new Date().toISOString() };
  logs.unshift(newLog);
  setStorageItem(AUDIT_KEY, logs.slice(0, 1000));
};

export const getAuditLogs = (terminal?: string): AdminLog[] => getStorageItem<AdminLog[]>(AUDIT_KEY, []).filter(l => !terminal || l.terminal === terminal);

export const addPromoterCredit = (terminal: string, amount: number, reason: string) => {
  const user = getUserByTerminal(terminal);
  if (user) {
    upsertUser({ terminal, saldo: user.saldo + amount });
    logAdminAction({ adminUser: 'admin', action: 'CREDIT_ADDED', terminal, delta: amount, reason, bancaId: user.bancaId });
  }
};

export const getUserByTerminal = (terminal: string): User | null => getUsers().find(u => u.terminal === terminal || u.email === terminal) || null;
export const generateNextTerminalForBanca = (bancaId: string): string => {
  const banca = getBancas().find(b => b.id === bancaId || b.subdomain === bancaId);
  const users = getUsers();
  const base = banca?.baseTerminal || 10000;
  const terminalNumbers = users.filter(u => u.bancaId === banca?.id).map(u => parseInt(u.terminal)).filter(n => !isNaN(n) && n >= base);
  let next = (terminalNumbers.length > 0 ? Math.max(...terminalNumbers) : base) + 1;
  while (users.some(u => u.terminal === String(next))) next++;
  return String(next);
};
