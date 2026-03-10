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

  let url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/${resource}`;
  
  // Se for summary, o endpoint é ligeiramente diferente ou usa query
  if (resource === 'summary') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/summary?event=${eventId}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, status: response.status }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
