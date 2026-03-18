
'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Sincronização Firestore.
 * Versão V8: Correção de permissões de criação e alinhamento com regras enterprise.
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
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  limit
} from 'firebase/firestore';
import { resolveCurrentBanca } from './bancaContext';
import { 
  generateNextTerminalForBanca, 
  getDefaultPermissions, 
  getUsers
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
      if (!banca) {
        const allBancas = getBancas();
        banca = allBancas.find(b => b.id === 'default') || allBancas[0];
      }
      email = `${terminalOrEmail}@${banca?.subdomain || 'matriz'}.lotohub.app`;
    }

    // 2. Autenticação Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    const uid = fbUser.uid;

    console.log("[AUTH] UID Autenticado:", uid);

    // 3. Buscar Dados no Firestore (Estratégia de Fallback Master)
    let bancaIdParaBusca = banca?.id || 'default';
    let userRef = doc(firestore, `bancas/${bancaIdParaBusca}/usuarios/${uid}`);
    let userDoc = await getDoc(userRef);

    // Se não encontrou na banca atual, tenta na default (SuperAdmins)
    if (!userDoc.exists() && bancaIdParaBusca !== 'default') {
      userRef = doc(firestore, `bancas/default/usuarios/${uid}`);
      userDoc = await getDoc(userRef);
    }

    if (!userDoc.exists()) {
      throw new Error("Perfil de usuário não encontrado no banco de dados.");
    }

    const userData = userDoc.data();
    console.log("[AUTH] Dados do Perfil Recuperados:", userData);

    // 4. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData.terminal,
      email: fbUser.email,
      role: userData.role || 'usuario',
      bancaId: userData.bancaId || 'default',
      tipoUsuario: userData.tipoUsuario || 'USUARIO',
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
    if (error.code === 'auth/user-not-found') errorMsg = "Usuário não cadastrado.";
    
    return { success: false, message: error.message || errorMsg };
  }
};

/**
 * Realiza o cadastro de um novo usuário.
 * Cria a conta no Auth e o documento no Firestore seguindo as regras de segurança.
 */
export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    const bancaId = "default";
    const banca = getBancas().find(b => b.id === bancaId) || { subdomain: 'matriz' };

    const { nome, cpf, cidade, email, password } = userData;
    const terminal = generateNextTerminalForBanca(bancaId);
    const systemEmail = `${terminal}@${banca.subdomain}.lotohub.app`;

    // 1. Verificar se existe algum superadmin (Lógica de auto-seeding)
    const usuariosRef = collection(firestore, `bancas/${bancaId}/usuarios`);
    const q = query(usuariosRef, where("role", "==", "superadmin"), limit(1));
    const superadminSnapshot = await getDocs(q);
    const isFirstUser = superadminSnapshot.empty;

    // 2. Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const uid = userCredential.user.uid;

    // 3. Criar documento do usuário no Firestore (Obrigatório usar o UID do Auth)
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
      tipoUsuario: isFirstUser ? 'SUPER_ADMIN' : 'USUARIO',
      role: isFirstUser ? 'superadmin' : 'usuario',
      permissoes: getDefaultPermissions(isFirstUser ? 'SUPER_ADMIN' : 'USUARIO'),
      saldo: 0,
      bonus: 0,
      bancaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // A regra 'allow create' no firestore.rules permite esta operação
    await setDoc(doc(firestore, `bancas/${bancaId}/usuarios`, uid), newUser);
    
    console.log(`[AUTH] Novo usuário criado: ${terminal} (Role: ${newUser.role})`);

    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      return { 
        success: false, 
        message: "O terminal gerado já está em uso no sistema de autenticação." 
      };
    }

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
