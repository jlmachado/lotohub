'use client';

/**
 * @fileOverview Lógica de autenticação baseada em Storage Local.
 * Valida credenciais contra a base de usuários do LocalStorage.
 */

import { User, getUserByTerminal, upsertUser, getDefaultPermissions } from './usersStorage';

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: User['tipoUsuario'];
  bancaId?: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

export const login = (identifier: string, password: string): { success: boolean; message: string; user?: User } => {
  if (typeof window === 'undefined') return { success: false, message: 'SSR' };

  // Busca usuário no storage local (inclui seeding se vazio)
  const user = getUserByTerminal(identifier);

  if (!user) {
    return { success: false, message: 'Terminal ou Usuário não identificado no sistema.' };
  }

  // Validação de senha simples (texto puro para protótipo local)
  if (user.password !== password) {
    return { success: false, message: 'Senha incorreta para este terminal.' };
  }

  if (user.status === 'BLOCKED') {
    return { success: false, message: 'Este terminal está temporariamente bloqueado. Contate o administrador.' };
  }

  // Criar sessão persistente
  const session: Session = {
    userId: user.id,
    terminal: user.terminal,
    tipoUsuario: user.tipoUsuario,
    bancaId: user.bancaId,
    loggedAt: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  // Notificar outros componentes
  window.dispatchEvent(new Event('auth-change'));

  return { success: true, message: 'Acesso autorizado!', user };
};

export const register = (data: Partial<User>): { success: boolean; message: string } => {
  if (!data.terminal || !data.password) {
    return { success: false, message: 'Dados obrigatórios ausentes.' };
  }

  if (getUserByTerminal(data.terminal)) {
    return { success: false, message: 'Este número de terminal já está em uso.' };
  }

  upsertUser({
    ...data,
    terminal: data.terminal,
    password: data.password,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    bonus: 0,
    status: 'ACTIVE',
    permissoes: getDefaultPermissions('USUARIO')
  } as any);

  return { success: true, message: 'Cadastro realizado com sucesso! Faça login para começar.' };
};

export const logout = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('auth-change'));
};

export const getSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const getCurrentUser = (): Session | null => {
  return getSession();
};

export const canAccessAdmin = (user: Session | null): boolean => {
  if (!user) return false;
  return user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN';
};
