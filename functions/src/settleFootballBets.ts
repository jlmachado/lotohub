import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * CLOUD FUNCTION - Liquidação Automática de Apostas de Futebol
 * Dispara quando um jogo muda para status FINISHED
 */
export const settleFootballBets = functions.firestore
  .document('bancas/{bancaId}/football_matches/{matchId}')
  .onUpdate(async (change, context) => {
    const { bancaId, matchId } = context.params;
    const before = change.before.data();
    const after = change.after.data();
    
    // Só processar quando jogo finaliza
    if (before.status !== 'FINISHED' && after.status === 'FINISHED') {
      console.log(`[LIQUIDAÇÃO FUTEBOL] Jogo finalizado: ${after.homeTeam} ${after.scoreHome} x ${after.scoreAway} ${after.awayTeam}`);
      
      try {
        // 1. Buscar todas apostas abertas
        const betsRef = db.collection(`bancas/${bancaId}/football_bets`);
        const openBetsQuery = betsRef.where('status', '==', 'OPEN');
        const betsSnapshot = await openBetsQuery.get();
        
        if (betsSnapshot.empty) {
          console.log('Nenhuma aposta aberta encontrada.');
          return null;
        }
        
        let processadas = 0;
        let vencedoras = 0;
        let perdedoras = 0;
        
        // 2. Processar cada aposta
        for (const betDoc of betsSnapshot.docs) {
          const bet = betDoc.data();
          
          // Verificar se esta aposta contém o jogo que finalizou
          const betItem = bet.items.find((item: any) => item.matchId === matchId);
          if (!betItem) {
            continue; // Esta aposta não tem este jogo
          }
          
          processadas++;
          
          // 3. Verificar resultado desta seleção
          const selectionWon = checkSelection(betItem, after);
          
          if (!selectionWon) {
            // Esta seleção perdeu = aposta toda perdeu
            await settleBet(bancaId, betDoc.id, 'LOST', bet, 0);
            perdedoras++;
            console.log(`[PERDEU] Aposta ${betDoc.id} - Seleção: ${betItem.selection}`);
            continue;
          }
          
          // 4. Esta seleção ganhou, verificar outras seleções
          const allSelectionsSettled = await checkAllSelections(bet.items, bancaId);
          
          if (allSelectionsSettled.allFinished) {
            if (allSelectionsSettled.allWon) {
              // GANHOU TUDO - Pagar
              await settleBet(bancaId, betDoc.id, 'WON', bet, bet.potentialWin);
              vencedoras++;
              console.log(`[GANHOU] Aposta ${betDoc.id} - Prêmio: R$ ${bet.potentialWin.toFixed(2)}`);
            } else {
              // Alguma seleção perdeu
              await settleBet(bancaId, betDoc.id, 'LOST', bet, 0);
              perdedoras++;
              console.log(`[PERDEU] Aposta ${betDoc.id} - Outra seleção perdeu`);
            }
          } else {
            // Ainda tem jogos em aberto, não liquidar ainda
            console.log(`[PENDENTE] Aposta ${betDoc.id} - Aguardando outros jogos`);
          }
        }
        
        console.log(`[LIQUIDAÇÃO COMPLETA]`);
        console.log(`  - Processadas: ${processadas}`);
        console.log(`  - Vencedoras: ${vencedoras}`);
        console.log(`  - Perdedoras: ${perdedoras}`);
        
        return {
          success: true,
          processadas,
          vencedoras,
          perdedoras
        };
        
      } catch (error) {
        console.error('[LIQUIDAÇÃO ERRO]', error);
        throw error;
      }
    }
    
    return null;
  });

/**
 * Verifica se uma seleção específica ganhou
 */
function checkSelection(betItem: any, match: any): boolean {
  const { market, selection } = betItem;
  const s = selection.toLowerCase();
  
  // Mercado 1X2 - Vencedor do Jogo
  if (market === 'Vencedor do Jogo' || market === '1X2') {
    if (s === 'casa' || s === 'home') {
      return match.scoreHome > match.scoreAway;
    }
    if (s === 'fora' || s === 'away') {
      return match.scoreAway > match.scoreHome;
    }
    if (s === 'empate' || s === 'draw') {
      return match.scoreHome === match.scoreAway;
    }
  }
  
  // Mercado Over/Under 2.5
  if (market === 'Gols +/- 2.5' || market === 'OU25') {
    const totalGoals = match.scoreHome + match.scoreAway;
    if (s === 'mais de 2.5' || s === 'over') {
      return totalGoals > 2.5;
    }
    if (s === 'menos de 2.5' || s === 'under') {
      return totalGoals < 2.5;
    }
  }
  
  // Mercado Ambas Marcam (BTTS)
  if (market === 'Ambas Marcam' || market === 'BTTS') {
    const bothScored = match.scoreHome > 0 && match.scoreAway > 0;
    if (s === 'sim' || s === 'yes') {
      return bothScored;
    }
    if (s === 'não' || s === 'no') {
      return !bothScored;
    }
  }
  
  console.warn(`Mercado desconhecido: ${market} - ${selection}`);
  return false;
}

/**
 * Verifica status de todas as seleções de uma aposta
 */
async function checkAllSelections(
  items: any[], 
  bancaId: string
): Promise<{ allFinished: boolean; allWon: boolean }> {
  let allFinished = true;
  let allWon = true;
  
  for (const item of items) {
    const matchRef = db.doc(`bancas/${bancaId}/football_matches/${item.matchId}`);
    const matchSnap = await matchRef.get();
    
    if (!matchSnap.exists) {
      console.warn(`Jogo ${item.matchId} não encontrado`);
      allFinished = false;
      continue;
    }
    
    const match = matchSnap.data()!;
    
    if (match.status !== 'FINISHED') {
      allFinished = false;
      break; // Tem jogo pendente
    }
    
    const selectionWon = checkSelection(item, match);
    if (!selectionWon) {
      allWon = false;
      break; // Uma seleção perdeu = aposta perdeu
    }
  }
  
  return { allFinished, allWon };
}

/**
 * Liquida a aposta (marca como WON ou LOST e paga se ganhou)
 */
async function settleBet(
  bancaId: string,
  betId: string,
  status: 'WON' | 'LOST',
  bet: any,
  prize: number
): Promise<void> {
  const betRef = db.doc(`bancas/${bancaId}/football_bets/${betId}`);
  
  // 1. Atualizar status da aposta
  await betRef.update({
    status: status,
    settledAt: admin.firestore.FieldValue.serverTimestamp(),
    settledBy: 'SISTEMA_AUTO',
    finalPrize: prize
  });
  
  // 2. Se ganhou, pagar prêmio
  if (status === 'WON' && prize > 0) {
    await payFootballPrize(bancaId, bet, prize);
    
    // 3. Pagar comissão ao promotor (se houver)
    if (bet.promotorId) {
      await payFootballCommission(bancaId, bet, prize);
    }
  }
}

/**
 * Paga prêmio de aposta de futebol (TRANSAÇÃO ATÔMICA)
 */
async function payFootballPrize(
  bancaId: string,
  bet: any,
  prize: number
): Promise<void> {
  const userRef = db.doc(`bancas/${bancaId}/usuarios/${bet.userId}`);
  const ledgerColRef = db.collection(`bancas/${bancaId}/ledgerEntries`);
  
  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error(`Usuário ${bet.userId} não encontrado`);
    }
    
    const userData = userSnap.data()!;
    const currentBalance = userData.saldo || 0;
    const newBalance = currentBalance + prize;
    
    // Atualizar saldo
    transaction.update(userRef, {
      saldo: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Criar entrada no ledger
    const ledgerEntryId = `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ledgerRef = ledgerColRef.doc(ledgerEntryId);
    
    transaction.set(ledgerRef, {
      id: ledgerEntryId,
      userId: bet.userId,
      terminal: bet.terminal,
      tipoUsuario: bet.tipoUsuario || 'jogador',
      modulo: 'Futebol',
      type: 'BET_WIN',
      amount: prize,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: bet.id,
      description: `Prêmio Futebol - ${bet.items.length} seleções`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

/**
 * Paga comissão de aposta de futebol ao promotor
 */
async function payFootballCommission(
  bancaId: string,
  bet: any,
  prize: number
): Promise<void> {
  const promotorRef = db.doc(`bancas/${bancaId}/usuarios/${bet.promotorId}`);
  const ledgerColRef = db.collection(`bancas/${bancaId}/ledgerEntries`);
  
  return db.runTransaction(async (transaction) => {
    const promotorSnap = await transaction.get(promotorRef);
    if (!promotorSnap.exists) {
      console.warn(`Promotor ${bet.promotorId} não encontrado`);
      return;
    }
    
    const promotorData = promotorSnap.data()!;
    const taxaComissao = promotorData.comissao || 10;
    const valorComissao = parseFloat(((prize * taxaComissao) / 100).toFixed(2));
    
    const currentBalance = promotorData.saldo || 0;
    const newBalance = currentBalance + valorComissao;
    
    transaction.update(promotorRef, {
      saldo: newBalance,
      comissaoAcumulada: admin.firestore.FieldValue.increment(valorComissao),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const ledgerEntryId = `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ledgerRef = ledgerColRef.doc(ledgerEntryId);
    
    transaction.set(ledgerRef, {
      id: ledgerEntryId,
      userId: bet.promotorId,
      terminal: bet.terminal,
      tipoUsuario: 'promotor',
      modulo: 'Futebol',
      type: 'COMMISSION_EARNED',
      amount: valorComissao,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: bet.id,
      description: `Comissão ${taxaComissao}% sobre prêmio de R$ ${prize.toFixed(2)}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}
