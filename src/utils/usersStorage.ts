'use client';

/**
 * @fileOverview Camada de compatibilidade para Usuários.
 * Faz a ponte entre as telas existentes e o repositório Firestore.
 */

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

/**
 * Proxy de compatibilidade assíncrona.
 */
export const getUserByTerminal = async (terminal: string) => {
  return await usersRepo.getByTerminal(terminal);
};

export const getUsers = async (): Promise<User[]> => {
  return await usersRepo.getAll();
};

export const upsertUser = async (userData: Partial<User> & { terminal: string }) => {
  const existing = await usersRepo.getByTerminal(userData.terminal);
  if (existing) {
    const updated = { ...existing, ...userData };
    await usersRepo.save(updated);
    return updated;
  } else {
    const id = userData.id || `u-${userData.terminal}-${Date.now()}`;
    const newUser = {
      ...userData,
      id,
      status: userData.status || 'ACTIVE',
      tipoUsuario: userData.tipoUsuario || 'USUARIO',
      permissoes: userData.permissoes || getDefaultPermissions(userData.tipoUsuario || 'USUARIO'),
      saldo: userData.saldo || 0,
      bonus: userData.bonus || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as User;
    await usersRepo.save(newUser);
    return newUser;
  }
};

// Funções de Log de Auditoria (Admin)
export interface AdminLog {
  id: string;
  adminUser: string;
  action: string;
  terminal: string;
  delta?: number;
  reason?: string;
  at: string;
}

export const logAdminAction = async (log: Omit<AdminLog, 'id' | 'at'>) => {
  // No futuro, usar um repositório específico para logs
};

export const getAuditLogs = async (terminal: string): Promise<AdminLog[]> => {
  return []; // Placeholder para logs no Firestore futuramente
};

export const addPromoterCredit = async (terminal: string, amount: number, reason: string) => {
  const user = await usersRepo.getByTerminal(terminal);
  if (user) {
    const newSaldo = user.saldo + amount;
    await usersRepo.update(user.id, { saldo: newSaldo });
  }
};
