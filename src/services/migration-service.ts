'use client';

/**
 * @fileOverview MigrationService V6 - Motor de Espelhamento Multi-Tenant Profissional.
 * Transfere dados das coleções globais para a estrutura bancas/{bancaId}/...
 * Garante a integridade e não duplicidade de documentos.
 */

import { Firestore, collection, getDocs, doc, setDoc, query, limit } from 'firebase/firestore';

export class MigrationService {
  /**
   * Executa a migração de coleções globais para a estrutura Multi-Tenant.
   */
  static async syncToCloud(db: Firestore) {
    if (typeof window === 'undefined') return;

    // Evita rodar múltiplas vezes se já migrado recentemente
    const lastSync = localStorage.getItem('app:multi_banca_sync');
    if (lastSync && Date.now() - parseInt(lastSync) < 1000 * 60 * 30) return; // 1 hora de cooldown

    console.log("🚀 [Migration] Analisando coleções globais para espelhamento multi-banca...");

    const collectionsToMigrate = [
      'apostas', 
      'banners', 
      'jdbResults', 
      'ledgerEntries', 
      'news_messages', 
      'popups', 
      'snooker',
      'football_bets'
    ];

    try {
      for (const colName of collectionsToMigrate) {
        // Busca documentos na raiz global
        const globalSnap = await getDocs(query(collection(db, colName), limit(100)));
        
        if (globalSnap.empty) continue;

        console.log(`- [Migration] Processando ${globalSnap.size} itens de "${colName}"...`);

        for (const docSnap of globalSnap.docs) {
          const data = docSnap.data();
          // Define para qual banca este dado pertence
          const targetBancaId = data.bancaId || 'default';
          
          // Salva no novo caminho scoped: bancas/{bancaId}/{colName}/{docId}
          const newDocRef = doc(db, 'bancas', targetBancaId, colName, docSnap.id);
          
          await setDoc(newDocRef, {
            ...data,
            bancaId: targetBancaId,
            migratedAt: new Date().toISOString()
          }, { merge: true });
        }
      }

      localStorage.setItem('app:multi_banca_sync', Date.now().toString());
      console.log("💎 [Migration] Espelhamento concluído com sucesso!");
    } catch (e: any) {
      console.warn("[Migration] Aviso:", e.message);
    }
  }
}
