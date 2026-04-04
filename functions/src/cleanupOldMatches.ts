import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * CLOUD FUNCTION - Limpeza de Jogos Antigos
 * Executa periodicamente para remover registros finalizados e economizar espaço
 */
export const cleanupOldMatches = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    console.log(`[CLEANUP] Iniciando limpeza de jogos anteriores a ${threshold}`);
    
    try {
      const bancasSnap = await db.collection('bancas').get();
      
      for (const bancaDoc of bancasSnap.docs) {
        const matchesRef = db.collection(`bancas/${bancaDoc.id}/football_matches`);
        const oldMatches = await matchesRef
          .where('isFinished', '==', true)
          .where('updatedAt', '<', threshold)
          .get();
          
        if (oldMatches.empty) continue;

        const batch = db.batch();
        oldMatches.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        console.log(`[CLEANUP] Removidos ${oldMatches.size} jogos da banca ${bancaDoc.id}`);
      }
    } catch (error) {
      console.error('[CLEANUP ERROR]', error);
    }
    
    return null;
  });