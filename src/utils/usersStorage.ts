/**
 * Gerenciamento de persistência de usuários e logs de auditoria via LocalStorage.
 * Expandido para suportar múltiplos perfis e regras de crédito.
 */

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
  promotorConfig?: {
    porcentagemComissao: number;
  };
  cambistaConfig?: {
    loginFechamento: string;
    senhaFechamento: string;
  };
  saldo: number;
  bonus: number;
  bancaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  at: string;
  adminUser: string;
  action: 'CREATE_USER' | 'BLOCK_USER' | 'UNBLOCK_USER' | 'RESET_PASSWORD' | 'ADJUST_BALANCE' | 'ADJUST_BONUS' | 'UPDATE_PROFILE' | 'CHANGE_TYPE' | 'PROMOTER_CREDIT';
  terminal: string;
  delta?: number;
  reason?: string;
}

const USERS_KEY = 'app:users:v1';
const AUDIT_KEY = 'app:admin_audit:v1';
const PROMOTER_CREDITS_KEY = 'app:promoter_creditos:v1';

export const getDefaultPermissions = (type: UserType): UserPermissions => {
  const common = {
    podeApostar: true,
    podeDepositar: true,
    podeSacar: true,
    podeVerRelatorios: true,
    podeFazerJogoParaTerceiros: false,
    podeReceberComissao: false,
    podeFecharCaixa: false,
    podeAcessarAdmin: false,
    podeGerenciarBancas: false
  };

  switch (type) {
    case 'PROMOTOR':
      return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true };
    case 'CAMBISTA':
      return { ...common, podeFazerJogoParaTerceiros: true, podeReceberComissao: true, podeFecharCaixa: true };
    case 'ADMIN':
      return { ...common, podeAcessarAdmin: true };
    case 'SUPER_ADMIN':
      return { ...common, podeAcessarAdmin: true, podeGerenciarBancas: true, podeFazerJogoParaTerceiros: true };
    default:
      return common;
  }
};

export const getUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) return [];
  try {
    const users: any[] = JSON.parse(stored);
    return users.map(u => ({
      ...u,
      tipoUsuario: u.tipoUsuario || 'USUARIO',
      permissoes: u.permissoes || getDefaultPermissions(u.tipoUsuario || 'USUARIO'),
      saldo: u.saldo || 0,
      bonus: u.bonus || 0,
    }));
  } catch (e) {
    console.error("Erro ao ler usuários:", e);
    return [];
  }
};

export const saveUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getUserByTerminal = (terminal: string): User | undefined => {
  return getUsers().find(u => u.terminal === terminal);
};

export const upsertUser = (userData: Partial<User> & { terminal: string }): User => {
  const users = getUsers();
  const index = users.findIndex(u => u.terminal === userData.terminal);
  const now = new Date().toISOString();

  if (index >= 0) {
    const currentType = userData.tipoUsuario || users[index].tipoUsuario;
    const updatedUser = { 
      ...users[index], 
      ...userData,
      tipoUsuario: currentType,
      permissoes: userData.permissoes || (userData.tipoUsuario ? getDefaultPermissions(userData.tipoUsuario) : users[index].permissoes),
      updatedAt: now 
    };
    users[index] = updatedUser;
    saveUsers(users);
    return updatedUser;
  } else {
    const type = userData.tipoUsuario || 'USUARIO';
    const newUser: User = {
      id: userData.id || `u-${userData.terminal}-${Date.now()}`,
      terminal: userData.terminal,
      password: userData.password || '1234',
      nome: userData.nome || '',
      status: userData.status || 'ACTIVE',
      tipoUsuario: type,
      permissoes: userData.permissoes || getDefaultPermissions(type),
      saldo: userData.saldo || 0,
      bonus: userData.bonus || 0,
      createdAt: now,
      updatedAt: now,
      ...userData,
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  }
};

/**
 * Cria usuários padrão para inicialização do sistema (Seed)
 */
export const ensureDefaultUsers = () => {
  if (typeof window === 'undefined') return;
  
  const users = getUsers();
  const now = new Date().toISOString();
  let changed = false;

  const defaults: Partial<User>[] = [
    {
      id: "user-default",
      nome: "Usuário Teste",
      email: "usuario@usuario.com",
      terminal: "10001",
      password: "123456",
      tipoUsuario: "USUARIO",
    },
    {
      id: "promoter-default",
      nome: "Promotor Teste",
      email: "promotor@promotor.com",
      terminal: "20001",
      password: "123456",
      tipoUsuario: "PROMOTOR",
      promotorConfig: { porcentagemComissao: 10 }
    },
    {
      id: "cashier-default",
      nome: "Cambista Teste",
      email: "cambista@cambista.com",
      terminal: "30001",
      password: "123456",
      tipoUsuario: "CAMBISTA",
      promotorConfig: { porcentagemComissao: 10 },
      cambistaConfig: { loginFechamento: "cambista", senhaFechamento: "123456" }
    },
    {
      id: "superadmin-default",
      nome: "Super Admin",
      email: "jao-lm@hotmail.com",
      terminal: "99999",
      password: "123456",
      tipoUsuario: "SUPER_ADMIN",
    }
  ];

  defaults.forEach(def => {
    if (!users.some(u => u.email === def.email || u.terminal === def.terminal)) {
      const type = def.tipoUsuario as UserType;
      const newUser: User = {
        id: def.id!,
        terminal: def.terminal!,
        email: def.email,
        password: def.password!,
        nome: def.nome,
        status: 'ACTIVE',
        tipoUsuario: type,
        permissoes: getDefaultPermissions(type),
        saldo: 0,
        bonus: 0,
        createdAt: now,
        updatedAt: now,
        ...def
      };
      users.push(newUser);
      changed = true;
    }
  });

  if (changed) {
    saveUsers(users);
    console.log("✅ Usuários default criados para inicialização do sistema.");
  }
};

export const logAdminAction = (log: Omit<AdminLog, 'id' | 'at'>) => {
  if (typeof window === 'undefined') return;
  const logs: AdminLog[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const newLog: AdminLog = {
    ...log,
    id: `log-${Date.now()}`,
    at: new Date().toISOString(),
  };
  logs.unshift(newLog); 
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 1000)));
};

export const getAuditLogs = (terminal?: string): AdminLog[] => {
  if (typeof window === 'undefined') return [];
  const logs: AdminLog[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  if (terminal) {
    return logs.filter(l => l.terminal === terminal);
  }
  return logs;
};

export const addPromoterCredit = (terminal: string, amount: number, reason: string) => {
  const user = getUserByTerminal(terminal);
  if (!user || user.tipoUsuario !== 'PROMOTOR') return;

  const newBalance = user.saldo + amount;
  upsertUser({ terminal, saldo: newBalance });

  logAdminAction({
    adminUser: 'admin',
    action: 'PROMOTER_CREDIT',
    terminal,
    delta: amount,
    reason: reason
  });

  const credits = JSON.parse(localStorage.getItem(PROMOTER_CREDITS_KEY) || '[]');
  credits.unshift({
    id: `credit-${Date.now()}`,
    userId: user.id,
    terminal: terminal,
    valor: amount,
    motivo: reason,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(PROMOTER_CREDITS_KEY, JSON.stringify(credits.slice(0, 500)));
};
