import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Agenda de Times da ESPN.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'bra.1';
  const teamId = searchParams.get('team');

  if (!teamId) {
    return NextResponse.json({ ok: false, message: 'Team ID é obrigatório' }, { status: 400 });
  }

  console.log(`[ESPN API Route] GET schedule team ${teamId}`);

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${teamId}/schedule`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
