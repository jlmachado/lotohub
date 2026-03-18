
'use client';

import { initializeFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * @fileOverview Sistema de Log de Auditoria Avançado.
 */

export class LogService {
  static async logEvent(bancaId: string, tipo: 'INFO' | 'ERROR' | 'SECURITY' | 'FINANCIAL', dados: any) {
    const { firestore } = initializeFirebase();
    const logRef = collection(firestore, 'bancas', bancaId, 'logs');
    
    try {
      await addDoc(logRef, {
        tipo,
        ...dados,
        createdAt: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
      });
    } catch (e) {
      console.error("Falha ao registrar log de sistema:", e);
    }
  }
}
