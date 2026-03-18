
'use client';

/**
 * @fileOverview Gestão de Carteiras e Transações Financeiras Avançadas.
 * Utiliza o padrão de transação do Firestore para segurança total.
 */

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, collection } from 'firebase/firestore';

export class WalletService {
  /**
   * Atualiza saldo de forma segura e registra a transação.
   */
  static async atualizarSaldo(
    bancaId: string, 
    userId: string, 
    valor: number, 
    tipo: 'credito' | 'debito', 
    origem: 'aposta' | 'pix' | 'comissao'
  ) {
    const { firestore } = initializeFirebase();
    const walletRef = doc(firestore, 'bancas', bancaId, 'carteiras', userId);
    const txColRef = collection(firestore, 'transacoesFinanceiras');

    try {
      await runTransaction(firestore, async (transaction) => {
        const walletSnap = await transaction.get(walletRef);
        let currentSaldo = 0;
        let currentBonus = 0;

        if (walletSnap.exists()) {
          currentSaldo = walletSnap.data().saldo || 0;
          currentBonus = walletSnap.data().bonus || 0;
        }

        const delta = tipo === 'credito' ? valor : -valor;
        const newSaldo = currentSaldo + delta;

        if (newSaldo < 0 && tipo === 'debito') {
          throw new Error("Saldo insuficiente na carteira avançada.");
        }

        // 1. Atualiza Carteira do Usuário
        transaction.set(walletRef, {
          saldo: newSaldo,
          bonus: currentBonus,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Registra Transação Global para Auditoria
        const txRef = doc(txColRef);
        transaction.set(txRef, {
          userId,
          bancaId,
          tipo,
          valor,
          origem,
          createdAt: new Date().toISOString()
        });
      });

      return { success: true };
    } catch (e: any) {
      console.error("[WALLET ERROR]", e.message);
      return { success: false, message: e.message };
    }
  }
}
