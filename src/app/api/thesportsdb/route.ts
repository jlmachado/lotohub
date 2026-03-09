import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API robusto para TheSportsDB.
 * Executa chamadas no servidor para evitar CORS e falhas de fetch no browser.
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

  // Base URL fixa com a chave 123 (V1 Free)
  const baseUrl = 'https://www.thesportsdb.com/api/v1/json/123';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${baseUrl}/${cleanEndpoint}`;

  console.log(`[TheSportsDB Proxy] Chamando Upstream: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LotoHub-App/1.2'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const status = response.status;
    
    // Tratar 404 como sucesso vazio para não quebrar o motor de sync
    if (status === 404) {
      return NextResponse.json({ 
        ok: true, 
        endpoint, 
        data: null, 
        message: 'Recurso não encontrado na API externa (404).' 
      });
    }

    const bodyText = await response.text();

    if (!response.ok) {
      return NextResponse.json({ 
        ok: false, 
        error: 'UPSTREAM_ERROR', 
        status, 
        message: `A API externa retornou erro ${status}`,
        body: bodyText.substring(0, 200)
      }, { status: 502 });
    }

    try {
      const data = JSON.parse(bodyText);
      return NextResponse.json({ ok: true, endpoint, data });
    } catch (e) {
      return NextResponse.json({ 
        ok: false, 
        error: 'INVALID_JSON', 
        message: 'A API externa não retornou um JSON válido.',
        body: bodyText.substring(0, 200)
      }, { status: 502 });
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        ok: false, 
        error: 'TIMEOUT', 
        message: 'A API externa demorou muito para responder (Timeout de 15s).' 
      }, { status: 504 });
    }

    return NextResponse.json({ 
      ok: false, 
      error: 'FETCH_FAILED', 
      message: error.message || 'Falha de conexão com o servidor da API.' 
    }, { status: 500 });
  }
}
