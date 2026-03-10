import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API para ESPN (site.api.espn.com).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const league = urlObj.searchParams.get('league');
  const resource = urlObj.searchParams.get('resource') || 'scoreboard';
  const eventId = urlObj.searchParams.get('event');

  if (!league && !eventId) {
    return NextResponse.json({ ok: false, message: 'Parâmetro league ou event é obrigatório.' }, { status: 400 });
  }

  // Se for summary, o endpoint é construído de forma específica
  let url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/${resource}`;
  
  if (resource === 'summary' && eventId) {
    // Summary endpoint aceita um slug de liga mas o ID do evento é o que manda
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league || 'bra.1'}/summary?event=${eventId}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ 
        ok: false, 
        status: response.status,
        message: `ESPN retornou status ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    console.error(`[ESPN Proxy Error] ${url}:`, error.message);
    return NextResponse.json({ 
      ok: false, 
      message: isTimeout ? 'Tempo esgotado (Timeout)' : error.message 
    }, { status: isTimeout ? 504 : 500 });
  }
}
