
'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Sincronização Firestore.
 * Versão V3: Busca obrigatória de perfil no Firestore após login.
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
      if (!banca) {
        // Fallback para login global se a banca não for identificada
        const allBancas = getBancas();
        banca = allBancas.find(b => b.id === 'default') || allBancas[0];
      }
      email = `${terminalOrEmail}@${banca?.subdomain || 'matriz'}.lotohub.app`;
    }

    // 2. Autenticação Firebase Auth
    console.log("[AUTH] Tentando autenticação para:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    const uid = fbUser.uid;

    console.log("UID AUTH:", uid);

    // 3. Busca Obrigatória no Firestore
    let userData: any = null;
    let finalBancaId = banca?.id || 'default';
    
    // Tenta buscar no tenant atual ou resolvido
    const userRef = doc(firestore, 'bancas', finalBancaId, 'usuarios', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      // Fallback para Banca Master (SuperAdmin geralmente fica aqui)
      console.log("[AUTH] Usuário não encontrado no tenant. Buscando em default...");
      const masterRef = doc(firestore, 'bancas', 'default', 'usuarios', uid);
      const masterSnap = await getDoc(masterRef);
      if (masterSnap.exists()) {
        userData = masterSnap.data();
        finalBancaId = 'default';
      }
    }

    // 4. Validação de existência no banco
    if (!userData) {
      // Se autenticou no Auth mas não existe no banco, verifica se é um usuário padrão do Seed
      const seededUser = getDefaultUsers().find(u => u.email === email || u.terminal === terminalOrEmail);
      if (seededUser) {
        userData = {
          ...seededUser,
          id: uid,
          updatedAt: new Date().toISOString()
        };
        // Auto-seed no Firestore
        await setDoc(doc(firestore, 'bancas', userData.bancaId || 'default', uid), userData);
      } else {
        throw new Error("Usuário autenticado mas perfil não encontrado no Firestore.");
      }
    }

    console.log("USER DATA FOUND:", userData);

    // 5. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData.terminal,
      email: email,
      role: userData.tipoUsuario || 'USUARIO',
      bancaId: userData.bancaId || finalBancaId,
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
    
    return { success: false, message: error.message || errorMsg };
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
