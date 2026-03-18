'use client';

/**
 * @fileOverview Serviço de processamento de comissões para Cambistas e Promotores.
 * Implementa isolamento multi-banca via caminhos aninhados.
 */

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export interface CommissionEntry {
  userId: string;
  tipo: 'cambista' | 'promotor';
  valorAposta: number;
  porcentagem: number;
  valorComissao: number;
  bancaId: string;
  referenceId: string; // ID da aposta (Poule)
  createdAt: string;
}

export class CommissionService {
  /**
   * Processa a comissão de uma aposta de forma segura e isolada por banca.
   */
  static async processarComissao(bancaId: string, userId: string, userType: string, valorAposta: number, apostaId: string) {
    if (!bancaId) throw new Error("bancaId obrigatório para processar comissão.");
    if (userType !== 'CAMBISTA' && userType !== 'PROMOTOR') return;

    const { firestore } = initializeFirebase();
    
    // Busca configurações financeiras da banca ou usa padrões seguros
    const configRef = doc(firestore, 'bancas', bancaId, 'configuracoes', 'financeiro');
    const configSnap = await getDoc(configRef);
    const config = configSnap.exists() ? configSnap.data() : { taxaCambista: 5, taxaPromotor: 2 };

    const porcentagem = userType === 'CAMBISTA' ? config.taxaCambista : config.taxaPromotor;
    const valorComissao = (valorAposta * porcentagem) / 100;

    const entry: Omit<CommissionEntry, 'id'> = {
      userId,
      tipo: userType.toLowerCase() as 'cambista' | 'promotor',
      valorAposta,
      porcentagem,
      valorComissao,
      bancaId,
      referenceId: apostaId,
      createdAt: new Date().toISOString()
    };

    try {
      // Grava na subcoleção da banca específica
      const colRef = collection(firestore, 'bancas', bancaId, 'comissoes');
      await addDoc(colRef, entry);
      
      console.log(`[COMISSAO][BANCA: ${bancaId}] Gerada: R$ ${valorComissao.toFixed(2)} para ${userType} ${userId}`);
    } catch (e) {
      console.error("[CRITICAL] Falha ao registrar comissão no Firestore:", e);
    }
  }
}
