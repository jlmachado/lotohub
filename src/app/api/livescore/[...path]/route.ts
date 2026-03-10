import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Live Score API.
 * Protege as chaves API_KEY e API_SECRET.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const { searchParams } = new URL(request.url);
  const path = params.path.join('/');
  
  const API_KEY = process.env.LIVE_SCORE_API_KEY || 'demo_key';
  const API_SECRET = process.env.LIVE_SCORE_API_SECRET || 'demo_secret';

  const baseUrl = `https://livescore-api.com/api-client/${path}`;
  const url = new URL(baseUrl);
  
  // Adiciona credenciais e repassa os parâmetros da query original
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('secret', API_SECRET);
  searchParams.forEach((v, k) => url.searchParams.append(k, v));

  try {
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`LiveScore API error: ${response.status}`);
    
    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error(`[LiveScore Proxy Error] ${url}:`, error.message);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
