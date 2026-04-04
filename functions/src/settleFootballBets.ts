import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * CLOUD FUNCTION - Liquidação de Apostas de Futebol
 * Dispara quando o status de uma partida muda para FINISHED
 */
export const settleFootballBets = functions.firestore
  .document('bancas/{bancaId}/football_matches/{matchId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();
    const { bancaId, matchId } = context.params;

    // Só processar se o status mudou para FINISHED agora
    if (after.status !== 'FINISHED' || before.status === 'FINISHED') {
      return null;
    }

    console.log(`[FOOTBALL SETTLE] Partida ${matchId} finalizada. Iniciando conferência...`);

    try {
      // Implementação da lógica de conferência de bilhetes aqui
      // Buscar apostas em 'bancas/{bancaId}/football_bets' com status 'OPEN'
      // que contenham este matchId
      return null;
    } catch (error) {
      console.error('[FOOTBALL SETTLE ERROR]', error);
      return null;
    }
  });