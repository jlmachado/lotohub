
'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Tratamento de Erros e Auto-Promoção.
 * Versão V6: Tratamento robusto para conflitos de e-mail e integração Firestore.
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collectionGroup, 
  where, 
  getDocs 
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

    // 3. Buscar Dados no Firestore (Tentando banca atual ou master)
    const bancaId = banca?.id || "default";
    let userRef = doc(firestore, `bancas/${bancaId}/usuarios/${uid}`);
    let userDoc = await getDoc(userRef);

    // Se não encontrou na banca atual, tenta na banca master (comum para SuperAdmin)
    if (!userDoc.exists() && bancaId !== 'default') {
      userRef = doc(firestore, `bancas/default/usuarios/${uid}`);
      userDoc = await getDoc(userRef);
    }

    if (!userDoc.exists()) {
      throw new Error("Perfil de usuário não encontrado no sistema.");
    }

    const userData = userDoc.data();
    console.log("[AUTH] Usuário logado:", uid, "Role:", userData.role);

    // 4. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData.terminal,
      email: fbUser.email,
      role: userData.role || 'usuario',
      bancaId: userData.bancaId || bancaId,
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
    
    if (error.code === 'auth/invalid-credential') errorMsg = "E-mail ou senha inválidos.";
    if (error.code === 'auth/user-not-found') errorMsg = "Usuário não cadastrado.";
    if (error.code === 'auth/wrong-password') errorMsg = "Senha incorreta.";
    if (error.code === 'auth/too-many-requests') errorMsg = "Muitas tentativas. Tente novamente mais tarde.";
    
    return { success: false, message: error.message || errorMsg };
  }
};

/**
 * Realiza o cadastro de um novo usuário.
 */
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

    // 1. Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, systemEmail, password);
    const fbUser = userCredential.user;

    // 2. Verificar se este é o primeiro SuperAdmin do sistema
    const superadminQuery = query(
      collectionGroup(firestore, "usuarios"),
      where("role", "==", "superadmin")
    );
    const superadminSnapshot = await getDocs(superadminQuery);
    const isFirstUser = superadminSnapshot.empty;

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
      bancaId: banca.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Salvar no Firestore
    await setDoc(doc(firestore, 'bancas', banca.id, 'usuarios', fbUser.uid), newUser);
    
    return { success: true, message: 'Cadastro realizado com sucesso!', terminal };
  } catch (error: any) {
    console.error('[Register Error]', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      return { 
        success: false, 
        message: "Este número de terminal já está registrado. Tente outro ou realize o login." 
      };
    }
    if (error.code === 'auth/weak-password') {
      return { success: false, message: "A senha escolhida é muito fraca." };
    }
    if (error.code === 'auth/invalid-email') {
      return { success: false, message: "Erro interno na geração do terminal." };
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
