
'use client';

/**
 * @fileOverview Serviço de processamento de comissões para Cambistas e Promotores.
 * Funciona de forma paralela e independente ao fluxo principal de apostas.
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
  referenceId: string; // ID da aposta
  createdAt: string;
}

export class CommissionService {
  /**
   * Processa a comissão de uma aposta sem interferir no fluxo original.
   */
  static async processarComissao(bancaId: string, userId: string, userType: string, valorAposta: number, apostaId: string) {
    if (userType !== 'CAMBISTA' && userType !== 'PROMOTOR') return;

    const { firestore } = initializeFirebase();
    
    // Busca configurações da banca ou usa padrão
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
      const colRef = collection(firestore, 'bancas', bancaId, 'comissoes');
      await addDoc(colRef, entry);
      
      // Log do evento
      console.log(`[COMISSAO] Gerada: R$ ${valorComissao} para ${userType} ${userId}`);
    } catch (e) {
      console.error("Erro ao processar comissão avançada:", e);
    }
  }
}
