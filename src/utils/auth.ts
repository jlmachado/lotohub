'use client';

/**
 * @fileOverview Lógica de autenticação integrada ao Firebase Auth.
 * Mapeia terminais para identidades oficiais do Firebase.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { User, getUserByTerminal, upsertUser, getDefaultPermissions, generateNextTerminalForBanca } from './usersStorage';
import { resolveCurrentBanca } from './bancaContext';
import { usersRepo } from '@/repositories/users-repository';

const { auth } = initializeFirebase();

export interface Session {
  userId: string;
  terminal: string;
  tipoUsuario: User['tipoUsuario'];
  bancaId: string;
  loggedAt: number;
}

const SESSION_KEY = 'app:session:v1';

/**
 * Gera um e-mail virtual para o terminal para compatibilidade com Firebase Auth.
 */
const getVirtualEmail = (terminal: string) => `${terminal}@lotohub.app`;

export const login = async (identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    let email = identifier.includes('@') ? identifier : getVirtualEmail(identifier);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    let userRecord = getUserByTerminal(identifier);
    
    if (!userRecord) {
      userRecord = await usersRepo.getByTerminal(identifier);
    }

    if (!userRecord) {
      userRecord = {
        id: firebaseUser.uid,
        terminal: identifier,
        tipoUsuario: 'USUARIO',
        bancaId: 'default',
        nome: identifier,
        saldo: 0,
        bonus: 0,
        status: 'ACTIVE',
        email: email,
        password: password,
        permissoes: getDefaultPermissions('USUARIO'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as User;
    }

    const session: Session = {
      userId: firebaseUser.uid,
      terminal: userRecord.terminal,
      tipoUsuario: userRecord.tipoUsuario || 'USUARIO',
      bancaId: userRecord.bancaId || 'default',
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    upsertUser(userRecord);
    window.dispatchEvent(new Event('auth-change'));

    return { success: true, message: 'Logado com sucesso!', user: userRecord };
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    let msg = 'Erro ao realizar login.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = 'Terminal ou senha incorretos.';
    }
    return { success: false, message: msg };
  }
};

export const register = async (data: Omit<Partial<User>, 'terminal'>): Promise<{ success: boolean; message: string; terminal?: string }> => {
  if (!data.nome || !data.password || !data.email) {
    return { success: false, message: 'Dados obrigatórios ausentes.' };
  }

  try {
    const banca = resolveCurrentBanca();
    const bancaId = banca?.id || 'default';
    const terminal = generateNextTerminalForBanca(bancaId);
    const virtualEmail = getVirtualEmail(terminal);

    const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, data.password!);
    const firebaseUser = userCredential.user;

    const newUser: User = {
      ...data,
      id: firebaseUser.uid,
      terminal,
      email: data.email,
      password: data.password!,
      tipoUsuario: 'USUARIO', 
      saldo: 0,
      bonus: 0,
      status: 'ACTIVE',
      bancaId,
      permissoes: getDefaultPermissions('USUARIO'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as User;

    upsertUser(newUser);

    return { 
      success: true, 
      message: 'Cadastro concluído com sucesso!', 
      terminal 
    };
  } catch (error: any) {
    console.error('[Auth Register Error]:', error);
    let msg = 'Falha ao criar conta.';
    if (error.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
    return { success: false, message: msg };
  }
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('auth-change'));
};

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getCurrentUser(): Session | null {
  return getSession();
}

export const canAccessAdmin = (user: Session | null): boolean => {
  if (!user) return false;
  return ['ADMIN', 'SUPER_ADMIN'].includes(user.tipoUsuario);
};
