/**
 * @fileOverview Serviço centralizado para validação de permissões de aposta por perfil.
 * Padroniza as regras de saldo e bônus para todos os módulos.
 */

import { UserType } from '@/utils/usersStorage';

export interface BetPermissionResult {
  allowed: boolean;
  reason: string | null;
}

export class BetPermissionService {
  /**
   * Valida se um usuário pode realizar uma aposta com base no seu perfil e saldo.
   */
  static validate(
    tipoUsuario: UserType,
    saldo: number,
    bonus: number,
    stake: number
  ): BetPermissionResult {
    console.log(`[BET VALIDATION] Iniciando validação para: ${tipoUsuario} | Saldo: ${saldo} | Bônus: ${bonus} | Stake: ${stake}`);

    // 1. REGRA CAMBISTA: Sempre permitido, não exige saldo imediato
    if (tipoUsuario === 'CAMBISTA') {
      console.log(`[BET VALIDATION] Resultado: permitido (Perfil Cambista)`);
      return { allowed: true, reason: null };
    }

    // 2. REGRA USUÁRIO: Precisa de saldo OU bônus
    if (tipoUsuario === 'USUARIO') {
      const hasFunds = saldo > 0 || bonus > 0;
      if (hasFunds) {
        // Validação de cobertura do valor (simplificada para o protótipo)
        if (saldo + bonus < stake) {
          return { allowed: false, reason: "Saldo ou bônus insuficiente para o valor desta aposta." };
        }
        console.log(`[BET VALIDATION] Resultado: permitido (Usuário com fundos)`);
        return { allowed: true, reason: null };
      }
      console.log(`[BET VALIDATION] Resultado: bloqueado (Usuário sem fundos)`);
      return { allowed: false, reason: "Você precisa de saldo ou bônus para realizar apostas." };
    }

    // 3. REGRA PROMOTOR: Precisa de saldo E bônus
    if (tipoUsuario === 'PROMOTOR') {
      const hasBoth = saldo > 0 && bonus > 0;
      if (hasBoth) {
        if (saldo < stake) {
          return { allowed: false, reason: "Promotor deve utilizar saldo principal para cobrir a stake." };
        }
        console.log(`[BET VALIDATION] Resultado: permitido (Promotor com saldo e bônus)`);
        return { allowed: true, reason: null };
      }
      console.log(`[BET VALIDATION] Resultado: bloqueado (Promotor sem saldo ou bônus)`);
      return { allowed: false, reason: "Promotores precisam possuir saldo e bônus para apostar." };
    }

    // 4. ADMIN / SUPERADMIN
    if (tipoUsuario === 'ADMIN' || tipoUsuario === 'SUPER_ADMIN') {
      return { allowed: true, reason: null };
    }

    return { allowed: false, reason: "Perfil de usuário não autorizado para apostas." };
  }
}
