import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Standings (Tabela) da ESPN.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league');

  if (!league) {
    return NextResponse.json({ ok: false, message: 'League slug é obrigatório' }, { status: 400 });
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/standings`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ ok: false, message: `Erro HTTP ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
