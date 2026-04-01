
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { INITIAL_JDB_LOTERIAS, INITIAL_GENERIC_LOTTERIES } from '@/constants/lottery-configs';

/**
 * @fileOverview Motor de Seed para Loterias.
 * Consolida dados de constantes locais e persiste no Firestore de forma padronizada.
 */

export async function GET() {
  const { firestore } = initializeFirebase();
  const bancaId = 'default'; // Seed inicial na banca mestre
  
  try {
    const results = [];

    // 1. Seed de Loterias do Jogo do Bicho (Estrutura por Estado)
    const loteriasCol = collection(firestore, `bancas/${bancaId}/loterias`);
    for (const lot of INITIAL_JDB_LOTERIAS) {
      const uniqueHoras = new Set<string>();
      Object.values(lot.dias).forEach(d => {
        if (d.selecionado) {
          d.horarios.forEach(h => h && uniqueHoras.add(h));
        }
      });

      const docData = {
        nome: lot.nome,
        estado: lot.stateCode || (lot.stateName === 'Rio de Janeiro' ? 'RJ' : 'SP'),
        ativo: true,
        horarios: Array.from(uniqueHoras).sort().map(h => ({
          nome: `Sorteio ${h}`,
          hora: h,
          ativo: true
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(loteriasCol, lot.id), docData, { merge: true });
      results.push({ id: lot.id, nome: lot.nome, type: 'JDB' });
    }

    // 2. Seed de Loterias Genéricas (Seninha, Quininha, etc.)
    const genericCol = collection(firestore, `bancas/${bancaId}/genericLotteryConfigs`);
    for (const gen of INITIAL_GENERIC_LOTTERIES) {
      await setDoc(doc(genericCol, gen.id), {
        ...gen,
        updatedAt: serverTimestamp()
      }, { merge: true });
      results.push({ id: gen.id, nome: gen.nome, type: 'GENERIC' });
    }

    return NextResponse.json({
      success: true,
      message: 'Base de loterias reconstruída com sucesso no Firebase',
      count: results.length,
      data: results
    });

  } catch (error: any) {
    console.error('[Seed Error]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
