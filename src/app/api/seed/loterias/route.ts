
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { INITIAL_JDB_LOTERIAS } from '@/constants/lottery-configs';

/**
 * @fileOverview Motor de Seed para Loterias.
 * Consolida dados de constantes locais e persiste no Firestore de forma padronizada.
 */

export async function GET() {
  const { firestore } = initializeFirebase();
  const bancaId = 'default'; // Seed inicial na banca mestre
  const loteriasCol = collection(firestore, `bancas/${bancaId}/loterias`);

  try {
    const results = [];

    for (const lot of INITIAL_JDB_LOTERIAS) {
      // 1. Extrair horários únicos de todos os dias
      const uniqueHoras = new Set<string>();
      Object.values(lot.dias).forEach(d => {
        if (d.selecionado) {
          d.horarios.forEach(h => h && uniqueHoras.add(h));
        }
      });

      // 2. Mapear para o formato obrigatório
      const horariosPadronizados = Array.from(uniqueHoras).sort().map(h => ({
        nome: `Sorteio ${h}`,
        hora: h,
        ativo: true
      }));

      const docData = {
        nome: lot.nome,
        estado: lot.stateCode || (lot.stateName === 'Rio de Janeiro' ? 'RJ' : 'SP'),
        ativo: true,
        horarios: horariosPadronizados,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docId = lot.id;
      await setDoc(doc(loteriasCol, docId), docData, { merge: true });
      results.push({ id: docId, nome: lot.nome });
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
