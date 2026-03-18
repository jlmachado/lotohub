
'use client';

/**
 * @fileOverview Autenticação Multi-Tenant com Auto-Promoção de SuperAdmin.
 * Versão V5: Primeiro usuário a logar torna-se SuperAdmin automaticamente.
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
 * Implementa a lógica de auto-promoção para o primeiro usuário do sistema.
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

    // 3. Verificar se existe algum SuperAdmin no sistema (Busca Global)
    const superadminQuery = query(
      collectionGroup(firestore, "usuarios"),
      where("role", "==", "superadmin")
    );
    const superadminSnapshot = await getDocs(superadminQuery);
    const noSuperAdminExists = superadminSnapshot.empty;

    // 4. Definir banca e buscar documento do usuário
    const bancaId = banca?.id || "default";
    const userRef = doc(firestore, `bancas/${bancaId}/usuarios/${uid}`);
    const userDoc = await getDoc(userRef);

    let userData: any = null;
    let role = "usuario";

    if (!userDoc.exists()) {
      // 5. Criar usuário automaticamente se não existir no Firestore
      // Se for o primeiro usuário do sistema, vira superadmin
      role = noSuperAdminExists ? "superadmin" : "usuario";
      
      userData = {
        id: uid,
        uid,
        terminal: isEmail ? "ADMIN" : terminalOrEmail,
        email: fbUser.email,
        nome: fbUser.displayName || fbUser.email,
        bancaId,
        role,
        tipoUsuario: role === 'superadmin' ? 'SUPER_ADMIN' : 'USUARIO',
        saldo: 0,
        bonus: 0,
        status: "ACTIVE",
        permissoes: getDefaultPermissions(role === 'superadmin' ? 'SUPER_ADMIN' : 'USUARIO'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, userData);
    } else {
      userData = userDoc.data();
      
      // 6. Garantir que o campo role exista
      if (!userData.role) {
        role = userData.tipoUsuario === 'SUPER_ADMIN' ? 'superadmin' : 'usuario';
        await updateDoc(userRef, { role, updatedAt: new Date().toISOString() });
        userData.role = role;
      } else {
        role = userData.role;
      }
    }

    // DEBUG
    console.log("Usuário logado:", uid);
    console.log("Role:", role);
    console.log("Banca:", bancaId);

    // 7. Configurar Sessão
    const session = {
      userId: uid,
      terminal: userData.terminal,
      email: fbUser.email,
      role: role,
      bancaId: bancaId,
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
      uid: fbUser.uid,
      terminal,
      nome,
      cpf,
      cidade,
      email, 
      systemEmail,
      status: 'ACTIVE',
      tipoUsuario: 'USUARIO',
      role: 'usuario',
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
