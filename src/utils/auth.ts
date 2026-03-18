'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Sincronização Firestore.
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
  getDefaultUsers
} from './usersStorage';
import { getBancas } from './bancasStorage';

const { auth, firestore } = initializeFirebase();

const SESSION_KEY = 'app:session:v1';

/**
 * Realiza o login do usuário e sincroniza com o Firestore.
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

    // 2. Autenticação Firebase
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (authError: any) {
      // Auto-seeding para usuários mestres (SuperAdmin)
      const seededUser = getDefaultUsers().find(u => u.email === email || u.terminal === terminalOrEmail);
      
      if (seededUser && seededUser.password === password && (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found')) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw authError;
      }
    }

    const fbUser = userCredential.user;

    // 3. Busca de Dados Completos no Firestore (Obrigatório)
    let userData: any = null;
    
    // Tenta primeiro na banca atual
    if (banca) {
      const userRef = doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) userData = userSnap.data();
    }

    // Fallback para Banca Master (SuperAdmin)
    if (!userData) {
      const masterRef = doc(firestore, 'bancas', 'default', 'usuarios', fbUser.uid);
      const masterSnap = await getDoc(masterRef);
      if (masterSnap.exists()) userData = masterSnap.data();
    }

    // Se ainda não existe no Firestore, usa o Seed
    if (!userData) {
      const sessionUserLocal = getDefaultUsers().find(u => u.email === email || u.terminal === terminalOrEmail);
      if (sessionUserLocal) {
        const targetBancaId = sessionUserLocal.bancaId || 'default';
        userData = {
          ...sessionUserLocal,
          id: fbUser.uid,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(firestore, 'bancas', targetBancaId, 'usuarios', fbUser.uid), userData);
      } else {
        throw new Error("Usuário autenticado mas perfil não encontrado no banco de dados.");
      }
    }

    console.log("USER DATA FETCHED:", userData);

    const session = {
      userId: fbUser.uid,
      terminal: userData.terminal,
      tipoUsuario: userData.tipoUsuario || 'USUARIO',
      bancaId: userData.bancaId || 'default',
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, message: 'Sucesso', user: { ...userData, id: fbUser.uid } };

  } catch (error: any) {
    console.error('[Auth Error]', error.message);
    let errorMsg = "Acesso negado. Verifique suas credenciais.";
    if (error.code === 'auth/invalid-credential') errorMsg = "E-mail ou senha inválidos.";
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

    await setDoc(doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid), newUser);
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
