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
