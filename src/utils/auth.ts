'use client';

/**
 * @fileOverview Autenticação Multi-Tenant.
 * Suporta detecção automática de banca por terminal caso o subdomínio não esteja presente.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolveCurrentBanca } from './bancaContext';
import { generateNextTerminalForBanca, getDefaultPermissions, getUsers, getUserByTerminal } from './usersStorage';
import { getBancas } from './bancasStorage';

const { auth, firestore } = initializeFirebase();

const SESSION_KEY = 'app:session:v1';

/**
 * Realiza o login do usuário.
 * Se não houver subdomínio, tenta localizar a banca pelo número do terminal.
 */
export const login = async (terminal: string, password: string): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    let banca = resolveCurrentBanca();
    
    // Fallback: Se não estamos em um subdomínio, procuramos a qual banca este terminal pertence
    if (!banca) {
      const allUsers = getUsers();
      const userRecord = allUsers.find(u => u.terminal === terminal);
      if (userRecord) {
        const bancas = getBancas();
        banca = bancas.find(b => b.id === userRecord.bancaId) || null;
      }
    }

    if (!banca) {
      throw new Error("Terminal não reconhecido ou unidade inválida.");
    }

    // O email no Firebase Auth segue o padrão terminal@subdomain.lotohub.app
    const email = `${terminal}@${banca.subdomain}.lotohub.app`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // Busca dados estendidos no tenant correto no Firestore
    const userRef = doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Perfil de usuário não encontrado nesta unidade.");
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
    let errorMsg = "Acesso negado. Verifique suas credenciais.";
    if (error.message.includes("Terminal não reconhecido")) errorMsg = error.message;
    return { success: false, message: errorMsg };
  }
};

/**
 * Registra um novo usuário no Firebase Auth e no Firestore (Multi-Tenant).
 */
export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    let banca = resolveCurrentBanca();
    
    // Se não houver subdomínio (ex: localhost), usa a banca default para o cadastro
    if (!banca) {
      const bancas = getBancas();
      banca = bancas.find(b => b.id === 'default') || bancas[0];
    }

    if (!banca) {
      throw new Error("Nenhuma unidade disponível para cadastro.");
    }

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

    // Atualiza cache local para garantir que o login encontre o novo registro
    const allUsers = getUsers();
    allUsers.push(newUser as any);
    localStorage.setItem('app:users:v1', JSON.stringify(allUsers));

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
  try {
    await signOut(auth);
  } catch (e) {}
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
