import * as admin from 'firebase-admin';

admin.initializeApp();

// Importar e exportar todas as Cloud Functions
export { checkLotteryResults } from './checkLotteryResults';
export { settleFootballBets } from './settleFootballBets';
export { cleanupOldMatches } from './cleanupOldMatches';