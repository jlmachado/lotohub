import { NextResponse } from 'next/server';
import { BettingService } from '@/services/betting-service';

/**
 * @fileOverview Rota final para processamento e registro da aposta.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stake, items, balance } = body;

    if (!stake || !items || balance === undefined) {
      return NextResponse.json({ ok: false, message: 'Parâmetros incompletos.' }, { status: 400 });
    }

    const result = await BettingService.processBetIntent(stake, items, balance);

    if (!result.success) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    // Em produção, aqui persistiria no Firestore/DB
    return NextResponse.json({
      ok: true,
      message: 'Aposta confirmada com sucesso!',
      receipt: result.data
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, message: 'Erro interno ao processar aposta.' }, { status: 500 });
  }
}
