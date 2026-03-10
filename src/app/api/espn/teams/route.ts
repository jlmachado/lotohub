import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Teams da ESPN.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league');
  const teamId = searchParams.get('team');

  const url = teamId 
    ? `https://site.api.espn.com/apis/site/v2/sports/soccer/${league || 'bra.1'}/teams/${teamId}`
    : `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`;

  console.log(`[ESPN API Route] GET teams ${league} ${teamId || ''}`);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
