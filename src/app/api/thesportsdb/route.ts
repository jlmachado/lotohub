import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API robusto para TheSportsDB.
 * Executa chamadas no servidor para evitar CORS e falhas de fetch no browser.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ ok: false, error: 'ENDPOINT_REQUIRED', message: 'O parâmetro endpoint é obrigatório.' }, { status: 400 });
  }

  // Base URL fixa com a chave 123 (V1 Free)
  const baseUrl = 'https://www.thesportsdb.com/api/v1/json/123';
  const url = `${baseUrl}/${endpoint}`;

  console.log(`[TheSportsDB Proxy] Chamando: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 segundos de timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LotoHub-App/1.1'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const status = response.status;
    const bodyText = await response.text();

    if (!response.ok) {
      console.error(`[TheSportsDB Proxy] Erro Upstream: ${status} - ${bodyText}`);
      return NextResponse.json({ 
        ok: false, 
        error: 'UPSTREAM_ERROR', 
        status, 
        message: `A API externa retornou erro ${status}`,
        body: bodyText
      }, { status: 502 });
    }

    try {
      const data = JSON.parse(bodyText);
      // Alguns endpoints da TheSportsDB retornam { "null": null } em vez de erro 404
      if (data === null || (typeof data === 'object' && Object.keys(data).length === 0)) {
         return NextResponse.json({ ok: true, endpoint, data: null, message: 'Nenhum dado encontrado para esta consulta.' });
      }
      return NextResponse.json({ ok: true, endpoint, data });
    } catch (e) {
      console.error(`[TheSportsDB Proxy] JSON Inválido:`, bodyText);
      return NextResponse.json({ 
        ok: false, 
        error: 'INVALID_JSON', 
        message: 'A API externa não retornou um JSON válido.',
        body: bodyText 
      }, { status: 502 });
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`[TheSportsDB Proxy] Timeout na requisição: ${url}`);
      return NextResponse.json({ ok: false, error: 'TIMEOUT', message: 'A API demorou muito para responder (Timeout).' }, { status: 504 });
    }

    console.error(`[TheSportsDB Proxy] Falha Crítica:`, error);
    return NextResponse.json({ ok: false, error: 'FETCH_FAILED', message: error.message || 'Falha ao conectar com o servidor da API.' }, { status: 500 });
  }
}
