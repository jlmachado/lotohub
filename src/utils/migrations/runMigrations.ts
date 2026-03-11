/**
 * @fileOverview Motor de migração idempotente para dados legados.
 * Garante que registros antigos sem bancaId sejam atribuídos à banca 'default'.
 */

import { ensureDefaultBanca } from "../bancasStorage";

const MIGRATION_KEY = 'app:migrations:v1';

interface MigrationSource {
  key: string;
  type: 'array' | 'object';
}

// Chaves mapeadas no sistema que precisam de bancaId
const SOURCES: MigrationSource[] = [
  { key: 'app:users:v1', type: 'array' },           // Usuários / Terminais
  { key: 'jogo_bicho:loterias:v1', type: 'array' }, // Loterias customizadas
  { key: 'app:admin_audit:v1', type: 'array' },     // Logs de auditoria admin
  { key: 'news_messages', type: 'array' },          // Mensagens do ticker
  { key: 'app:banners:v1', type: 'array' },         // Banners/Status
  { key: 'app:popups:v1', type: 'array' },          // Popups
];

export async function runMigrations() {
  if (typeof window === 'undefined') return;

  const status = localStorage.getItem(MIGRATION_KEY);
  const migrationDone = status ? JSON.parse(status).defaultBancaMigrationDone : false;

  if (migrationDone) {
    return;
  }

  console.log("🚀 Iniciando migração de dados para modelo multi-banca...");

  // 1. Garantir que a banca default existe no banco
  await ensureDefaultBanca();

  // 2. Migrar cada fonte de dados localmente antes do upload para Cloud
  SOURCES.forEach(source => {
    const rawData = localStorage.getItem(source.key);
    if (!rawData) return;

    try {
      let data = JSON.parse(rawData);
      let changed = false;

      if (source.type === 'array' && Array.isArray(data)) {
        data = data.map(item => {
          if (typeof item === 'object' && item !== null && !item.bancaId) {
            changed = true;
            return { ...item, bancaId: 'default' };
          }
          return item;
        });
      }

      if (changed) {
        localStorage.setItem(source.key, JSON.stringify(data));
        console.log(`✅ Migração concluída para: ${source.key}`);
      }
    } catch (e) {
      console.error(`❌ Falha ao migrar fonte ${source.key}:`, e);
    }
  });

  // 3. Marcar migração como concluída
  localStorage.setItem(MIGRATION_KEY, JSON.stringify({
    defaultBancaMigrationDone: true,
    at: new Date().toISOString()
  }));

  console.log("✨ Todas as migrações locais foram processadas.");
}
