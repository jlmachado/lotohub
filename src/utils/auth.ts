'use client';

/**
 * @fileOverview Lógica de autenticação baseada em Storage Local.
 * Revertido para o modelo síncrono original.
 */

import { User, getUserByTerminal, upsertUser, getDefaultPermissions, getUsers } from './usersStorage';

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: any;
  bancaId?: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

export const login = (identifier: string, password: string): { success: boolean; message: string; user?: User } => {
  // Super Admin Fallback (only for dev/initial setup)
  if (identifier === '10001' && password === 'admin') {
    const admin = getUserByTerminal('10001');
    if (!admin) {
      upsertUser({
        terminal: '10001',
        password: 'admin',
        nome: 'Super Administrador',
        tipoUsuario: 'SUPER_ADMIN',
        saldo: 1000000,
        bancaId: 'default'
      });
    }
  }

  const user = getUserByTerminal(identifier);

  if (!user) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Senha incorreta.' };
  }

  if (user.status === 'BLOCKED') {
    return { success: false, message: 'Este terminal está bloqueado.' };
  }

  const session: Session = {
    userId: user.id,
    terminal: user.terminal,
    tipoUsuario: user.tipoUsuario,
    bancaId: user.bancaId,
    loggedAt: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('auth-change'));

  return { success: true, message: 'Login realizado com sucesso!', user };
};

export const register = (data: Partial<User>): { success: boolean; message: string } => {
  if (data.terminal && getUserByTerminal(data.terminal)) {
    return { success: false, message: 'Terminal em uso.' };
  }

  upsertUser({
    ...data,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    status: 'ACTIVE',
    permissoes: getDefaultPermissions('USUARIO')
  } as any);

  return { success: true, message: 'Cadastro realizado!' };
};

export const logout = () => {
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
