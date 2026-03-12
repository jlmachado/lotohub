'use client';

/**
 * @fileOverview Lógica de autenticação síncrona baseada em Storage Local.
 * Totalmente compatível com a arquitetura Multi-Banca.
 */

import { User, getUserByTerminal, upsertUser, getDefaultPermissions } from './usersStorage';

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: User['tipoUsuario'];
  bancaId: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

export const login = (identifier: string, password: string): { success: boolean; message: string; user?: User } => {
  if (typeof window === 'undefined') return { success: false, message: 'Ambiente inválido' };

  // Busca o usuário globalmente (o terminal deve ser único no sistema prototype)
  const user = getUserByTerminal(identifier);

  if (!user) {
    return { success: false, message: 'Usuário ou Terminal não encontrado.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Senha incorreta.' };
  }

  if (user.status === 'BLOCKED') {
    return { success: false, message: 'Seu acesso está bloqueado. Entre em contato com o suporte.' };
  }

  const session: Session = {
    userId: user.id,
    terminal: user.terminal,
    tipoUsuario: user.tipoUsuario,
    bancaId: user.bancaId || 'default',
    loggedAt: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  // Notifica o sistema da mudança de autenticação
  window.dispatchEvent(new Event('auth-change'));

  return { success: true, message: 'Logado com sucesso!', user };
};

export const register = (data: Partial<User>): { success: boolean; message: string } => {
  if (!data.terminal || !data.password) {
    return { success: false, message: 'Dados obrigatórios ausentes.' };
  }

  if (getUserByTerminal(data.terminal)) {
    return { success: false, message: 'Este terminal já existe no sistema.' };
  }

  upsertUser({
    ...data,
    terminal: data.terminal,
    password: data.password,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    bonus: 0,
    status: 'ACTIVE',
    bancaId: data.bancaId || 'default',
    permissoes: getDefaultPermissions('USUARIO')
  } as any);

  return { success: true, message: 'Cadastro concluído! Agora você pode fazer login.' };
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
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const getCurrentUser = (): Session | null => {
  return getSession();
};

export const canAccessAdmin = (user: Session | null): boolean => {
  if (!user) return false;
  return ['ADMIN', 'SUPER_ADMIN'].includes(user.tipoUsuario);
};
