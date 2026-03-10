import { NextResponse } from 'next/server';
import { BettingService } from '@/services/betting-service';

/**
 * @fileOverview Rota para validação de integridade do bilhete antes da confirmação.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ ok: false, message: 'Dados do bilhete inválidos.' }, { status: 400 });
    }

    const validation = BettingService.validateSlip(items);

    return NextResponse.json({
      ok: validation.valid,
      errors: validation.errors,
      totalOdds: validation.totalOdds
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
