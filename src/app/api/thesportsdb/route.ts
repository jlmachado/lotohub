import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API robusto para TheSportsDB V1 (Chave 123).
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); 

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LotoHub-Premium/2.0'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return NextResponse.json({ 
        ok: true, 
        endpoint, 
        data: null, 
        message: 'Recurso não encontrado (404).' 
      });
    }

    const bodyText = await response.text();

    if (!response.ok) {
      return NextResponse.json({ 
        ok: false, 
        error: 'UPSTREAM_ERROR', 
        status: response.status, 
        message: `API retornou erro ${response.status}`,
        body: bodyText.substring(0, 200)
      }, { status: 502 });
    }

    // Se o corpo estiver vazio, retorna sucesso com data null
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json({ ok: true, endpoint, data: null });
    }

    try {
      const data = JSON.parse(bodyText);
      return NextResponse.json({ ok: true, endpoint, data });
    } catch (e) {
      // Se não for JSON, não quebra o sistema, apenas retorna data null
      console.warn(`[TheSportsDB Proxy] Resposta não-JSON de ${url}`);
      return NextResponse.json({ 
        ok: true, 
        endpoint, 
        data: null,
        message: 'Resposta da API não é um JSON válido.' 
      });
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        ok: false, 
        error: 'TIMEOUT', 
        message: 'API demorou muito para responder (Timeout 15s).' 
      }, { status: 504 });
    }

    return NextResponse.json({ 
      ok: false, 
      error: 'FETCH_FAILED', 
      message: error.message || 'Falha de conexão com o servidor.' 
    }, { status: 500 });
  }
}
