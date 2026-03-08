/**
 * @fileOverview Lógica de autenticação e gestão de usuários baseada em LocalStorage.
 */

import { User, UserType, UserPermissions, getDefaultPermissions, getUsers, saveUsers, upsertUser } from './usersStorage';

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: UserType;
  bancaId?: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

/**
 * Realiza o login do usuário verificando credenciais no LocalStorage.
 * Aceita terminal ou e-mail.
 */
export const login = (identifier: string, password: string): { success: boolean; message: string; user?: User } => {
  const users = getUsers();
  
  // Busca por terminal ou e-mail
  const isEmail = identifier.includes('@');
  const user = users.find(u => isEmail ? u.email === identifier : u.terminal === identifier);

  if (!user) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Senha incorreta.' };
  }

  if (user.status === 'BLOCKED') {
    return { success: false, message: 'Este terminal está bloqueado. Entre em contato com o suporte.' };
  }

  // Criar sessão
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

/**
 * Realiza o cadastro de um novo usuário comum.
 */
export const register = (data: Partial<User>): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users.some(u => u.terminal === data.terminal)) {
    return { success: false, message: 'Este número de terminal já está em uso.' };
  }

  if (data.email && users.some(u => u.email === data.email)) {
    return { success: false, message: 'Este e-mail já está em uso.' };
  }

  const newUser = upsertUser({
    ...data,
    tipoUsuario: 'USUARIO', 
    saldo: 0,
    bonus: 0,
    status: 'ACTIVE',
    permissoes: getDefaultPermissions('USUARIO')
  } as User);

  return { success: true, message: 'Cadastro realizado! Agora você pode entrar.' };
};

/**
 * Encerra a sessão atual.
 */
export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('auth-change'));
};

/**
 * Retorna os dados da sessão atual.
 */
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
 * Retorna o objeto completo do usuário logado.
 */
export const getCurrentUser = (): User | null => {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
};

/**
 * Verifica se o usuário tem permissão para acessar o admin.
 */
export const canAccessAdmin = (user: User | null): boolean => {
  return !!(user && (user.tipoUsuario === 'ADMIN' || user.tipoUsuario === 'SUPER_ADMIN'));
};
