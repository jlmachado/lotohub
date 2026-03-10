import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Odds da LiveScore API.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('match_id');

  if (!matchId) {
    return NextResponse.json({ ok: false, message: 'Match ID é obrigatório' }, { status: 400 });
  }

  const API_KEY = process.env.LIVE_SCORE_API_KEY || 'XtV2v4puj9N4kVUw';
  const API_SECRET = process.env.LIVE_SCORE_API_SECRET || '9mbzt6wQ38ovAFMy9HAFM0959W9uR411';

  const url = `https://livescore-api.com/api-client/matches/odds.json?key=${API_KEY}&secret=${API_SECRET}&match_id=${matchId}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
