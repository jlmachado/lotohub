'use client';

/**
 * @fileOverview Serviço de Semente (Seed) para garantir integridade inicial do banco.
 */

import { usersRepo } from '@/repositories/users-repository';
import { bancasRepo } from '@/repositories/bancas-repository';
import { getDefaultPermissions } from '@/utils/usersStorage';

export class DatabaseSeedService {
  static async ensureInitialData() {
    console.log("🛠️ Verificando dados iniciais do banco...");

    try {
      // 1. Garantir Banca Padrão
      const defaultBanca = await bancasRepo.getById('default');
      if (!defaultBanca) {
        console.log("🌱 Criando banca padrão...");
        await bancasRepo.save({
          id: 'default',
          subdomain: 'default',
          nome: 'LotoHub Matriz',
          adminLogin: 'admin',
          adminPassword: 'password',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modulos: {
            bingo: true,
            cassino: true,
            jogoDoBicho: true,
            seninha: true,
            quininha: true,
            lotinha: true,
            futebol: true,
            sinucaAoVivo: true,
            loteriaUruguai: true
          },
          descargaConfig: {
            limitePremio: 10000,
            ativo: true,
            updatedAt: Date.now()
          }
        } as any);
      }

      // 2. Garantir Super Admin
      const superAdmin = await usersRepo.getByTerminal('10001');
      if (!superAdmin) {
        console.log("🌱 Criando usuário Super Admin...");
        await usersRepo.save({
          id: 'u-10001',
          terminal: '10001',
          password: 'admin',
          nome: 'Super Administrador',
          tipoUsuario: 'SUPER_ADMIN',
          status: 'ACTIVE',
          saldo: 1000000,
          bonus: 0,
          bancaId: 'default',
          permissoes: getDefaultPermissions('SUPER_ADMIN'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);
      }

      console.log("✅ Banco de dados validado com sucesso.");
    } catch (error) {
      console.error("❌ Erro ao semear banco de dados:", error);
    }
  }
}
