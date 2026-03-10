import { NextResponse } from 'next/server';
import { BettingService } from '@/services/betting-service';

/**
 * @fileOverview Rota final para processamento e registro da aposta.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stake, items, balance, userType, bonus } = body;

    if (!stake || !items || balance === undefined || !userType) {
      return NextResponse.json({ ok: false, message: 'Parâmetros de aposta incompletos.' }, { status: 400 });
    }

    // Chama o serviço de aposta passando o contexto do usuário para validação de perfil
    const result = await BettingService.processBetIntent(stake, items, {
      tipo: userType,
      saldo: balance,
      bonus: bonus || 0
    });

    if (!result.success) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Aposta confirmada com sucesso!',
      receipt: result.data
    });

  } catch (error: any) {
    console.error('[API Place Bet Error]:', error);
    return NextResponse.json({ ok: false, message: 'Erro interno ao processar aposta.' }, { status: 500 });
  }
}
