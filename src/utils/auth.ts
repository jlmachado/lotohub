/**
 * @fileOverview Lógica de autenticação integrada ao Firestore.
 */

import { User, UserType } from './usersStorage';
import { usersRepo } from '@/repositories/users-repository';

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: UserType;
  bancaId?: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

export const login = async (identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  const isEmail = identifier.includes('@');
  const user = isEmail 
    ? await usersRepo.getByEmail(identifier)
    : await usersRepo.getByTerminal(identifier);

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

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('auth-change'));
  }

  return { success: true, message: 'Login realizado com sucesso!', user };
};

export const register = async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
  if (data.terminal && await usersRepo.getByTerminal(data.terminal)) {
    return { success: false, message: 'Terminal em uso.' };
  }

  const id = `u-${data.terminal}-${Date.now()}`;
  const newUser: User = {
    ...data,
    id,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    bonus: 0,
    status: 'ACTIVE',
    permissoes: {
      podeApostar: true,
      podeDepositar: true,
      podeSacar: true,
      podeVerRelatorios: true,
      podeFazerJogoParaTerceiros: false,
      podeReceberComissao: false,
      podeFecharCaixa: false,
      podeAcessarAdmin: false,
      podeGerenciarBancas: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as User;

  await usersRepo.save(newUser);
  return { success: true, message: 'Cadastro realizado!' };
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('auth-change'));
  }
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

/**
 * Retorna os dados básicos da sessão do usuário atual de forma síncrona.
 */
export const getCurrentUser = (): Session | null => {
  return getSession();
};

/**
 * Verifica se o usuário tem permissão para acessar áreas administrativas.
 */
export const canAccessAdmin = (user: Session | null): boolean => {
  if (!user) return false;
  return user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN';
};
