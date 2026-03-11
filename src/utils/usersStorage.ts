/**
 * @fileOverview Adaptador para manter compatibilidade com usersRepo.
 */

import { usersRepo } from '@/repositories/users-repository';

export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type UserType = 'USUARIO' | 'PROMOTOR' | 'CAMBISTA' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserPermissions {
  podeApostar: boolean;
  podeDepositar: boolean;
  podeSacar: boolean;
  podeVerRelatorios: boolean;
  podeFazerJogoParaTerceiros: boolean;
  podeReceberComissao: boolean;
  podeFecharCaixa: boolean;
  podeAcessarAdmin: boolean;
  podeGerenciarBancas: boolean;
}

export interface User {
  id: string;
  terminal: string;
  email?: string;
  password: string;
  nome?: string;
  cidade?: string;
  whatsapp?: string;
  status: UserStatus;
  tipoUsuario: UserType;
  permissoes: UserPermissions;
  promotorConfig?: { porcentagemComissao: number; };
  cambistaConfig?: { loginFechamento: string; senhaFechamento: string; };
  saldo: number;
  bonus: number;
  bancaId?: string;
  createdAt: string;
  updatedAt: string;
}

export const getDefaultPermissions = (type: UserType): UserPermissions => {
  const common = {
    podeApostar: true, podeDepositar: true, podeSacar: true, podeVerRelatorios: true,
    podeFazerJogoParaTerceiros: false, podeReceberComissao: false,
    podeFecharCaixa: false, podeAcessarAdmin: false, podeGerenciarBancas: false
  };
  switch (type) {
    case 'PROMOTOR': return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true };
    case 'CAMBISTA': return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true, podeFecharCaixa: true };
    case 'ADMIN': return { ...common, podeAcessarAdmin: true };
    case 'SUPER_ADMIN': return { ...common, podeAcessarAdmin: true, podeGerenciarBancas: true, podeFazerJogoParaTerceiros: true };
    default: return common;
  }
};

// Proxies para manter compatibilidade com telas administrativas (convertendo sync em async onde necessário)
export const getUsers = () => { /* Em telas reais, usar AppContext.users ou aguardar Firestore */ return []; };
export const getUserByTerminal = async (t: string) => await usersRepo.getByTerminal(t);
export const upsertUser = async (u: Partial<User> & { terminal: string }) => {
  const existing = await usersRepo.getByTerminal(u.terminal);
  if (existing) {
    await usersRepo.update(existing.id, u);
    return { ...existing, ...u };
  } else {
    const id = u.id || `u-${u.terminal}-${Date.now()}`;
    const newUser = { ...u, id } as User;
    await usersRepo.save(newUser);
    return newUser;
  }
};

export const ensureDefaultUsers = async () => {
  // Logic already moved to Firestore init/seed scripts if needed
};
