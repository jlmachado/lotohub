
'use client';

/**
 * @fileOverview Lógica de autenticação síncrona baseada em Storage Local.
 */

import { User, getUserByTerminal, upsertUser, getDefaultPermissions, generateNextTerminalForBanca, getUsers } from './usersStorage';
import { resolveCurrentBanca } from './bancaContext';

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
  window.dispatchEvent(new Event('auth-change'));

  return { success: true, message: 'Logado com sucesso!', user };
};

export const register = (data: Omit<Partial<User>, 'terminal'>): { success: boolean; message: string; terminal?: string } => {
  if (!data.nome || !data.password || !data.email) {
    return { success: false, message: 'Dados obrigatórios ausentes.' };
  }

  const allUsers = getUsers();
  if (allUsers.some(u => u.email === data.email)) {
    return { success: false, message: 'Este e-mail já está cadastrado.' };
  }

  const banca = resolveCurrentBanca();
  const bancaId = banca?.id || 'default';
  const terminal = generateNextTerminalForBanca(bancaId);

  upsertUser({
    ...data,
    terminal,
    password: data.password,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    bonus: 0,
    status: 'ACTIVE',
    bancaId,
    permissoes: getDefaultPermissions('USUARIO'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  return { 
    success: true, 
    message: 'Cadastro concluído com sucesso!', 
    terminal 
  };
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
