'use client';

/**
 * @fileOverview Autenticação Multi-Tenant.
 * Suporta login híbrido via Terminal (SaaS) ou E-mail Direto (SuperAdmin).
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
 * Suporta detecção automática de banca por terminal ou login via e-mail direto.
 */
export const login = async (terminalOrEmail: string, password: string): Promise<{ success: boolean; message: string; user?: any }> => {
  try {
    let email = terminalOrEmail;
    let banca = resolveCurrentBanca();
    
    const isEmail = terminalOrEmail.includes('@');

    // Se for um terminal numérico, resolvemos a identidade SaaS
    if (!isEmail) {
      if (!banca) {
        const allUsers = getUsers();
        const userRecord = allUsers.find(u => u.terminal === terminalOrEmail);
        if (userRecord) {
          const bancas = getBancas();
          banca = bancas.find(b => b.id === userRecord.bancaId) || null;
        }
      }

      if (!banca) {
        throw new Error("Terminal não reconhecido ou unidade inválida.");
      }

      // O email no Firebase Auth para terminais segue o padrão SaaS
      email = `${terminalOrEmail}@${banca.subdomain}.lotohub.app`;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // Busca dados estendidos no tenant correto. 
    // Se não tiver banca (SuperAdmin), procura na 'default'.
    const activeBancaId = banca?.id || 'default';
    let userRef = doc(firestore, 'bancas', activeBancaId, 'usuarios', fbUser.uid);
    let userSnap = await getDoc(userRef);

    // Tenta fallback na default se não encontrou (comum para Admins globais)
    if (!userSnap.exists() && activeBancaId !== 'default') {
      userRef = doc(firestore, 'bancas', 'default', 'usuarios', fbUser.uid);
      userSnap = await getDoc(userRef);
    }

    if (!userSnap.exists()) {
      throw new Error("Perfil de usuário não encontrado.");
    }

    const userData = userSnap.data();
    const session = {
      userId: fbUser.uid,
      terminal: userData.terminal,
      tipoUsuario: userData.tipoUsuario,
      bancaId: userData.bancaId || activeBancaId,
      loggedAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, message: 'Sucesso', user: { ...userData, id: fbUser.uid } };
  } catch (error: any) {
    console.error('[Auth Error]', error.message);
    let errorMsg = "Acesso negado. Verifique suas credenciais.";
    if (error.code === 'auth/user-not-found') errorMsg = "Usuário não cadastrado.";
    if (error.code === 'auth/wrong-password') errorMsg = "Senha incorreta.";
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
    
    if (!banca) {
      const bancas = getBancas();
      banca = bancas.find(b => b.id === 'default') || bancas[0];
    }

    if (!banca) {
      throw new Error("Nenhuma unidade disponível para cadastro.");
    }

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

    const allUsers = getUsers();
    allUsers.push(newUser as any);
    localStorage.setItem('app:users:v1', JSON.stringify(allUsers));

    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    return { success: false, message: error.message || "Falha ao realizar cadastro." };
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
