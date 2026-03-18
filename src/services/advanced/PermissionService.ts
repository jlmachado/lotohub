
/**
 * @fileOverview Controle de Permissões baseado em Roles.
 */

export type UserRole = 'admin' | 'cambista' | 'promotor' | 'usuario';

export class PermissionService {
  private static ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    admin: ['*'],
    cambista: ['place_bets', 'view_cashier', 'print_ticket', 'manage_balance'],
    promotor: ['view_commissions', 'recruit_users', 'view_reports'],
    usuario: ['place_bets', 'view_history', 'request_withdrawal']
  };

  static hasPermission(role: UserRole, action: string): boolean {
    const perms = this.ROLE_PERMISSIONS[role] || [];
    if (perms.includes('*')) return true;
    return perms.includes(action);
  }
}
