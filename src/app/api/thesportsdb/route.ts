import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API robusto para TheSportsDB V1 (Chave 123).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const endpoint = urlObj.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ 
      ok: false, 
      error: 'ENDPOINT_REQUIRED', 
      message: 'O parâmetro endpoint é obrigatório.' 
    }, { status: 400 });
  }

  const baseUrl = 'https://www.thesportsdb.com/api/v1/json/123';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${baseUrl}/${cleanEndpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const bodyText = await response.text();

    if (!response.ok) {
      return NextResponse.json({ 
        ok: false, 
        status: response.status, 
        message: `API retornou erro ${response.status}`,
        body: bodyText.substring(0, 200)
      }, { status: 502 });
    }

    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json({ ok: true, endpoint, data: null });
    }

    try {
      const data = JSON.parse(bodyText);
      return NextResponse.json({ ok: true, endpoint, data });
    } catch (e) {
      return NextResponse.json({ 
        ok: true, 
        endpoint, 
        data: null,
        message: 'Resposta da API não é um JSON válido.' 
      });
    }

  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    console.error(`[TDB Proxy Error] ${url}:`, error.message);
    return NextResponse.json({ 
      ok: false, 
      error: isTimeout ? 'TIMEOUT' : 'FETCH_FAILED', 
      message: isTimeout ? 'Tempo esgotado (API lenta)' : error.message 
    }, { status: isTimeout ? 504 : 500 });
  }
}
