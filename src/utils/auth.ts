'use client';

/**
 * @fileOverview Autenticação Multi-Tenant.
 * Garante que o login de um usuário seja validado contra a banca específica.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolveCurrentBanca } from './bancaContext';
import { generateNextTerminalForBanca, getDefaultPermissions } from './usersStorage';

const { auth, firestore } = initializeFirebase();

const SESSION_KEY = 'app:session:v1';

export const login = async (terminal: string, password: string): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    const banca = resolveCurrentBanca();
    if (!banca) throw new Error("Acesse através de um subdomínio válido.");

    const email = `${terminal}@${banca.subdomain}.lotohub.app`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // Busca dados estendidos no tenant correto
    const userRef = doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado nesta banca.");
    }

    const userData = userSnap.data();
    const session = {
      userId: fbUser.uid,
      terminal: userData.terminal,
      tipoUsuario: userData.tipoUsuario,
      bancaId: banca.id,
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, message: 'Sucesso', user: { ...userData, id: fbUser.uid } };
  } catch (error: any) {
    console.error('[Auth Error]', error.message);
    return { success: false, message: "Acesso negado. Verifique suas credenciais." };
  }
};

/**
 * Registra um novo usuário no Firebase Auth e no Firestore (Multi-Tenant).
 */
export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    const banca = resolveCurrentBanca();
    if (!banca) throw new Error("Acesse através de um subdomínio válido.");

    const { nome, cpf, cidade, email, password } = userData;

    // 1. Gerar próximo terminal disponível para esta banca
    const terminal = generateNextTerminalForBanca(banca.id);
    
    // Pattern de email para o Firebase Auth vinculado à banca para evitar conflitos globais
    const systemEmail = `${terminal}@${banca.subdomain}.lotohub.app`;

    // 2. Criar conta no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const fbUser = userCredential.user;

    // 3. Salvar perfil detalhado no Firestore dentro da estrutura isolada da banca
    const userRef = doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid);
    
    const newUser = {
      id: fbUser.uid,
      terminal,
      nome,
      cpf,
      cidade,
      email, // Email real para contato
      systemEmail, // Email técnico usado no login
      status: 'ACTIVE',
      tipoUsuario: 'USUARIO',
      permissoes: getDefaultPermissions('USUARIO'),
      saldo: 0,
      bonus: 0,
      bancaId: banca.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, newUser);

    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    
    let message = "Falha ao realizar cadastro.";
    if (error.code === 'auth/email-already-in-use') message = "Terminal já registrado.";
    if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
    
    return { success: false, message: error.message || message };
  }
};

export const logout = async () => {
  await signOut(auth);
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
