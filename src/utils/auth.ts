'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Sincronização Firestore.
 * Versão V11: Suporte a login em subcoleções de bancas isoladas.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  limit
} from 'firebase/firestore';
import { resolveCurrentBanca, getCurrentBancaId } from './bancaContext';
import { 
  generateNextTerminalForBanca, 
  getDefaultPermissions, 
  getUsers
} from './usersStorage';
import { getBancas } from './bancasStorage';

const { auth, firestore } = initializeFirebase();

const SESSION_KEY = 'app:session:v1';

/**
 * Valida se um usuário tem permissão para acessar o painel administrativo.
 */
export function canAccessAdmin(user: any): boolean {
  if (!user) return false;
  const tipo = user.tipoUsuario;
  return tipo === "SUPER_ADMIN" || tipo === "ADMIN" || tipo === "CAMBISTA";
}

/**
 * Realiza o login do usuário e sincroniza com o Firestore.
 */
export const login = async (terminalOrEmail: string, password: string): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    let email = terminalOrEmail;
    const bancaId = getCurrentBancaId();
    const isEmail = terminalOrEmail.includes('@');

    // 1. Resolver Email do Sistema se for Terminal
    if (!isEmail) {
      const bancas = getBancas();
      const currentBanca = bancas.find(b => b.id === bancaId) || { subdomain: 'matriz' };
      email = `${terminalOrEmail}@${currentBanca.subdomain}.lotohub.app`;
    }

    // 2. Autenticação Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    const uid = fbUser.uid;

    // 3. Buscar Dados no Firestore (Isolamento por Banca)
    // Tenta primeiro na banca atual resolvida pelo contexto
    let userRef = doc(firestore, `bancas/${bancaId}/usuarios/${uid}`);
    let userDoc = await getDoc(userRef);

    // Fallback para banca mestre (SuperAdmins)
    if (!userDoc.exists() && bancaId !== 'default') {
      userRef = doc(firestore, `bancas/default/usuarios/${uid}`);
      userDoc = await getDoc(userRef);
    }

    if (!userDoc.exists()) {
      throw new Error("Usuário autenticado, mas perfil não encontrado nesta unidade.");
    }

    const userData = userDoc.data();

    // 4. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData?.terminal,
      email: fbUser.email,
      bancaId: userData?.bancaId || bancaId,
      tipoUsuario: userData?.tipoUsuario || 'USUARIO',
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    return { 
      success: true, 
      message: 'Sucesso', 
      user: { ...userData, id: uid } 
    };

  } catch (error: any) {
    console.error('[Auth Error]', error.message);
    let errorMsg = "Acesso negado. Verifique suas credenciais.";
    if (error.code === 'auth/invalid-credential') errorMsg = "Credenciais inválidas.";
    return { success: false, message: errorMsg };
  }
};

/**
 * Realiza o cadastro de um novo usuário dentro da banca atual.
 */
export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    const bancaId = getCurrentBancaId();
    const banca = getBancas().find(b => b.id === bancaId) || { subdomain: 'matriz' };

    const { nome, cpf, cidade, email, password } = userData;
    const terminal = generateNextTerminalForBanca(bancaId);
    const systemEmail = `${terminal}@${banca.subdomain}.lotohub.app`;

    // 1. Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const uid = userCredential.user.uid;

    // 2. Criar documento do usuário no Firestore (dentro da banca)
    const newUser = {
      id: uid,
      uid: uid,
      terminal,
      nome,
      cpf,
      cidade,
      email, 
      systemEmail,
      status: 'ACTIVE',
      tipoUsuario: 'USUARIO',
      permissoes: getDefaultPermissions('USUARIO'),
      saldo: 0,
      bonus: 0,
      bancaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(firestore, `bancas/${bancaId}/usuarios`, uid), newUser);
    
    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    return { success: false, message: "Falha ao realizar cadastro. Tente novamente." };
  }
};

export const logout = async () => {
  try { await signOut(auth); } catch (e) {}
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/login';
};

export function getSession() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function getCurrentUser() {
  return getSession();
}
