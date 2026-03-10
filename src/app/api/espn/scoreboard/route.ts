import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Scoreboard da ESPN.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'bra.1';

  console.log(`[ESPN API Route] GET scoreboard ${league}`);

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (LotoHub Premium Proxy)'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[ESPN API Route] HTTP ${response.status} scoreboard ${league}`);
      return NextResponse.json({ ok: false, message: `ESPN retornou status ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[ESPN API Route] HTTP 200 scoreboard ${league}`);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    console.error(`[ESPN API Route] Erro scoreboard ${league}:`, error.message);
    return NextResponse.json({ 
      ok: false, 
      message: isTimeout ? 'Tempo esgotado' : 'Falha na conexão com servidor ESPN' 
    }, { status: isTimeout ? 504 : 500 });
  }
}
