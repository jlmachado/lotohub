'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Tratamento de Erros e Auto-Promoção.
 * Versão V7: Removido collectionGroup para evitar erro de índice global e simplificar o fluxo master.
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

    // 3. Buscar Dados no Firestore
    // Estratégia: Tenta na banca default primeiro (SuperAdmins) e depois na banca específica
    let userRef = doc(firestore, `bancas/default/usuarios/${uid}`);
    let userDoc = await getDoc(userRef);

    if (!userDoc.exists() && banca && banca.id !== 'default') {
      userRef = doc(firestore, `bancas/${banca.id}/usuarios/${uid}`);
      userDoc = await getDoc(userRef);
    }

    if (!userDoc.exists()) {
      throw new Error("Perfil de usuário não encontrado no Firestore");
    }

    const userData = userDoc.data();
    
    // Garantir integridade da role
    if (!userData.role) {
      await updateDoc(userRef, { role: 'usuario' });
      userData.role = 'usuario';
    }

    console.log("[AUTH] Usuário validado:", uid);
    console.log("[AUTH] Role:", userData.role);

    // 4. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData.terminal,
      email: fbUser.email,
      role: userData.role,
      bancaId: userData.bancaId || (banca?.id || 'default'),
      tipoUsuario: userData.tipoUsuario,
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
 * Implementa auto-promoção de superadmin se for o primeiro usuário da banca mestre.
 */
export const register = async (userData: { nome: string; cpf: string; cidade: string; email: string; password: string }): Promise<{ success: boolean; message: string; terminal?: string }> => {
  try {
    // Cadastro sempre via banca default para garantir centralização inicial
    const bancaId = "default";
    const banca = getBancas().find(b => b.id === bancaId) || { subdomain: 'matriz' };

    const { nome, cpf, cidade, email, password } = userData;
    const terminal = generateNextTerminalForBanca(bancaId);
    const systemEmail = `${terminal}@${banca.subdomain}.lotohub.app`;

    // 1. Verificar se existe algum superadmin na banca default (Busca Direta, sem index global)
    const usuariosRef = collection(firestore, `bancas/${bancaId}/usuarios`);
    const q = query(usuariosRef, where("role", "==", "superadmin"), limit(1));
    const superadminSnapshot = await getDocs(q);
    const isFirstUser = superadminSnapshot.empty;

    // 2. Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const fbUser = userCredential.user;

    const newUser = {
      id: fbUser.uid,
      uid: fbUser.uid,
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

    // 3. Salvar no Firestore (Caminho absoluto e direto)
    await setDoc(doc(firestore, `bancas/${bancaId}/usuarios`, fbUser.uid), newUser);
    
    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      return { 
        success: false, 
        message: "O terminal gerado já está em uso. Tente novamente." 
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
