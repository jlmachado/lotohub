import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa o admin se ainda não foi inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * CLOUD FUNCTION - Conferência Automática de Apostas de Loteria
 * Dispara quando um novo resultado é publicado em jdbResults
 */
export const checkLotteryResults = functions.firestore
  .document('bancas/{bancaId}/jdbResults/{resultId}')
  .onCreate(async (snapshot, context) => {
    const { bancaId } = context.params;
    const result = snapshot.data();
    
    // Só processar resultados publicados
    if (result.status !== 'PUBLICADO') {
      console.log(`Resultado ${context.params.resultId} não está publicado. Ignorando.`);
      return null;
    }
    
    console.log(`[CONFERÊNCIA] Processando resultado: ${result.loteria} - ${result.data} ${result.horario}`);
    
    try {
      // 1. Buscar apostas pendentes que correspondem a este resultado
      const apostasRef = db.collection(`bancas/${bancaId}/apostas`);
      const query = apostasRef
        .where('loteria', '==', result.loteria)
        .where('data', '==', result.data)
        .where('horario', '==', result.horario)
        .where('status', '==', 'aguardando');
      
      const apostasSnapshot = await query.get();
      
      if (apostasSnapshot.empty) {
        console.log('Nenhuma aposta pendente encontrada.');
        return null;
      }
      
      console.log(`Encontradas ${apostasSnapshot.size} apostas para conferir.`);
      
      // 2. Processar cada aposta em batch
      const batch = db.batch();
      let vencedores = 0;
      let perdedores = 0;
      let erros = 0;
      
      for (const apostaDoc of apostasSnapshot.docs) {
        const aposta = apostaDoc.data();
        
        try {
          // 3. Verificar se aposta ganhou
          const ganhou = checkIfWinner(aposta, result);
          
          if (ganhou) {
            // GANHOU - Calcular prêmio e pagar
            const premio = calculatePrize(aposta);
            
            // 3.1. Atualizar aposta
            batch.update(apostaDoc.ref, {
              status: 'ganhou',
              premio: premio,
              resultado: result.resultado,
              conferidoEm: admin.firestore.FieldValue.serverTimestamp(),
              conferidoPor: 'SISTEMA_AUTO'
            });
            
            // 3.2. Registrar pagamento no ledger
            await registerWinningPayment(bancaId, aposta, premio);
            
            // 3.3. Pagar comissão ao promotor (se houver)
            if (aposta.promotorId) {
              await payCommission(bancaId, aposta, premio);
            }
            
            vencedores++;
            
          } else {
            // PERDEU
            batch.update(apostaDoc.ref, {
              status: 'perdeu',
              resultado: result.resultado,
              conferidoEm: admin.firestore.FieldValue.serverTimestamp(),
              conferidoPor: 'SISTEMA_AUTO'
            });
            
            perdedores++;
          }
          
        } catch (error) {
          console.error(`Erro ao processar aposta ${apostaDoc.id}:`, error);
          erros++;
        }
      }
      
      // 4. Commitar batch
      await batch.commit();
      
      // 5. Log final
      console.log(`[CONFERÊNCIA COMPLETA]`);
      console.log(`  - Vencedores: ${vencedores}`);
      console.log(`  - Perdedores: ${perdedores}`);
      console.log(`  - Erros: ${erros}`);
      
      // 6. Atualizar estatísticas do resultado
      await snapshot.ref.update({
        conferido: true,
        apostasConferidas: apostasSnapshot.size,
        vencedores: vencedores,
        perdedores: perdedores,
        conferidoEm: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        apostasProcessadas: apostasSnapshot.size,
        vencedores,
        perdedores
      };
      
    } catch (error: any) {
      console.error('[CONFERÊNCIA ERRO]', error);
      
      // Marcar resultado como erro
      await snapshot.ref.update({
        conferido: false,
        erroConferencia: error.message,
        erroEm: admin.firestore.FieldValue.serverTimestamp()
      });
      
      throw error;
    }
  });

/**
 * Verifica se aposta ganhou baseado no resultado
 */
function checkIfWinner(aposta: any, result: any): boolean {
  const numeros = aposta.numeros.split(',').map((n: string) => n.trim());
  const [resultNum, resultGroup] = result.resultado.split('-');
  
  switch (aposta.modalidade) {
    case 'Grupo':
      return numeros.includes(resultGroup);
    
    case 'Dezena':
      const lastTwo = resultNum.slice(-2);
      return numeros.includes(lastTwo);
    
    case 'Centena':
      const lastThree = resultNum.slice(-3);
      return numeros.includes(lastThree);
    
    case 'Milhar':
      return numeros.includes(resultNum);
    
    case 'Milhar Invertida':
      const reversed = resultNum.split('').reverse().join('');
      return numeros.includes(reversed);
    
    case 'Duque de Grupo':
      const grupos = numeros;
      return grupos.includes(resultGroup);
    
    default:
      console.warn(`Modalidade desconhecida: ${aposta.modalidade}`);
      return false;
  }
}

/**
 * Calcula valor do prêmio
 */
function calculatePrize(aposta: any): number {
  const premio = aposta.valor * aposta.multiplicador;
  return parseFloat(premio.toFixed(2));
}

/**
 * Registra pagamento do prêmio no ledger (TRANSAÇÃO ATÔMICA)
 */
async function registerWinningPayment(
  bancaId: string, 
  aposta: any, 
  premio: number
): Promise<void> {
  const userRef = db.doc(`bancas/${bancaId}/usuarios/${aposta.userId}`);
  const ledgerColRef = db.collection(`bancas/${bancaId}/ledgerEntries`);
  
  return db.runTransaction(async (transaction) => {
    // 1. Ler saldo atual
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error(`Usuário ${aposta.userId} não encontrado`);
    }
    
    const userData = userSnap.data()!;
    const currentBalance = userData.saldo || 0;
    const newBalance = currentBalance + premio;
    
    // 2. Atualizar saldo
    transaction.update(userRef, {
      saldo: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 3. Criar entrada no ledger
    const ledgerEntryId = `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ledgerRef = ledgerColRef.doc(ledgerEntryId);
    
    transaction.set(ledgerRef, {
      id: ledgerEntryId,
      userId: aposta.userId,
      terminal: aposta.terminal,
      tipoUsuario: aposta.tipoUsuario || 'jogador',
      modulo: aposta.loteria,
      type: 'BET_WIN',
      amount: premio,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: aposta.id,
      description: `Prêmio ${aposta.loteria}: ${aposta.modalidade} - ${aposta.numeros}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[PAGAMENTO] R$ ${premio.toFixed(2)} → ${userData.nome}`);
  });
}

/**
 * Paga comissão ao promotor (TRANSAÇÃO ATÔMICA)
 */
async function payCommission(
  bancaId: string,
  aposta: any,
  premio: number
): Promise<void> {
  const promotorRef = db.doc(`bancas/${bancaId}/usuarios/${aposta.promotorId}`);
  const ledgerColRef = db.collection(`bancas/${bancaId}/ledgerEntries`);
  
  return db.runTransaction(async (transaction) => {
    // 1. Ler dados do promotor
    const promotorSnap = await transaction.get(promotorRef);
    if (!promotorSnap.exists) {
      console.warn(`Promotor ${aposta.promotorId} não encontrado. Pulando comissão.`);
      return;
    }
    
    const promotorData = promotorSnap.data()!;
    const taxaComissao = promotorData.comissao || 10; // 10% padrão
    const valorComissao = parseFloat(((premio * taxaComissao) / 100).toFixed(2));
    
    const currentBalance = promotorData.saldo || 0;
    const newBalance = currentBalance + valorComissao;
    
    // 2. Atualizar saldo e comissão acumulada
    transaction.update(promotorRef, {
      saldo: newBalance,
      comissaoAcumulada: admin.firestore.FieldValue.increment(valorComissao),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 3. Criar entrada no ledger
    const ledgerEntryId = `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ledgerRef = ledgerColRef.doc(ledgerEntryId);
    
    transaction.set(ledgerRef, {
      id: ledgerEntryId,
      userId: aposta.promotorId,
      terminal: aposta.terminal,
      tipoUsuario: 'promotor',
      modulo: aposta.loteria,
      type: 'COMMISSION_EARNED',
      amount: valorComissao,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: aposta.id,
      description: `Comissão ${taxaComissao}% sobre prêmio de R$ ${premio.toFixed(2)}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[COMISSÃO] R$ ${valorComissao.toFixed(2)} (${taxaComissao}%) → ${promotorData.nome}`);
  });
}
