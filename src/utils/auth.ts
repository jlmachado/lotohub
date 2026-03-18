'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Auto-Seeding para SuperAdmin.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolveCurrentBanca } from './bancaContext';
import { 
  generateNextTerminalForBanca, 
  getDefaultPermissions, 
  getUsers, 
  getUserByTerminal,
  getDefaultUsers
} from './usersStorage';
import { getBancas } from './bancasStorage';

const { auth, firestore } = initializeFirebase();

const SESSION_KEY = 'app:session:v1';

/**
 * Realiza o login do usuário.
 * Tenta autenticar e, se for um usuário mestre definido no código que ainda não existe no Firebase,
 * realiza o auto-seeding (criação automática da credencial).
 */
export const login = async (terminalOrEmail: string, password: string): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    let email = terminalOrEmail;
    let banca = resolveCurrentBanca();
    const isEmail = terminalOrEmail.includes('@');

    // 1. Resolver Email do Sistema se for Terminal
    if (!isEmail) {
      if (!banca) {
        const allUsers = getUsers();
        const userRecord = allUsers.find(u => u.terminal === terminalOrEmail);
        if (userRecord) {
          const bancas = getBancas();
          banca = bancas.find(b => b.id === userRecord.bancaId) || null;
        }
      }
      if (!banca) throw new Error("Terminal não reconhecido ou unidade inválida.");
      email = `${terminalOrEmail}@${banca.subdomain}.lotohub.app`;
    }

    // 2. Tentar Login
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (authError: any) {
      // Se falhar e for um usuário padrão (como o SuperAdmin jao-lm), tenta criar a conta
      const seededUser = getDefaultUsers().find(u => u.email === email || u.terminal === terminalOrEmail);
      
      if (seededUser && seededUser.password === password && (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found')) {
        console.log(`[Auth] Detectado usuário mestre offline. Criando credencial para ${email}...`);
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw authError;
      }
    }

    const fbUser = userCredential.user;

    // 3. Buscar Perfil Detalhado no Firestore (Nested por Banca)
    // Se for SuperAdmin, o bancaId no storage é 'default'
    const sessionUserLocal = getDefaultUsers().find(u => u.email === email || u.terminal === terminalOrEmail);
    const bancaId = sessionUserLocal?.bancaId || banca?.id || 'default';
    
    const userRef = doc(firestore, 'bancas', bancaId, 'usuarios', fbUser.uid);
    let userSnap = await getDoc(userRef);

    let userData: any;

    if (!userSnap.exists()) {
      // Se a credencial existe mas o documento no Firestore não, cria o documento baseado no seed
      if (sessionUserLocal) {
        userData = {
          ...sessionUserLocal,
          id: fbUser.uid,
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, userData);
      } else {
        throw new Error("Perfil de usuário não encontrado no banco de dados da unidade.");
      }
    } else {
      userData = userSnap.data();
    }

    const session = {
      userId: fbUser.uid,
      terminal: userData.terminal,
      tipoUsuario: userData.tipoUsuario,
      bancaId: userData.bancaId || bancaId,
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, message: 'Sucesso', user: { ...userData, id: fbUser.uid } };

  } catch (error: any) {
    console.error('[Auth Error]', error.message);
    let errorMsg = "Acesso negado. Verifique suas credenciais.";
    if (error.code === 'auth/invalid-credential') errorMsg = "E-mail ou senha inválidos.";
    if (error.code === 'auth/user-not-found') errorMsg = "Usuário não cadastrado.";
    
    return { success: false, message: errorMsg };
  }
};

export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    let banca = resolveCurrentBanca();
    if (!banca) {
      const bancas = getBancas();
      banca = bancas.find(b => b.id === 'default') || bancas[0];
    }
    if (!banca) throw new Error("Nenhuma unidade disponível para cadastro.");

    const { nome, cpf, cidade, email, password } = userData;
    const terminal = generateNextTerminalForBanca(banca.id);
    const systemEmail = `${terminal}@${banca.subdomain}.lotohub.app`;

    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const fbUser = userCredential.user;

    const userRef = doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid);
    
    const newUser = {
      id: fbUser.uid,
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
      bancaId: banca.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, newUser);
    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    return { success: false, message: error.message || "Falha ao realizar cadastro." };
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
