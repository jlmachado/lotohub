import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Live Score API.
 * Protege as chaves de API e injeta credenciais em todas as requisições.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const { searchParams } = new URL(request.url);
  const path = params.path.join('/');
  
  // 1. Obter credenciais das ENV (Fallback para chaves fornecidas se necessário)
  const API_KEY = process.env.LIVE_SCORE_API_KEY || 'XtV2v4puj9N4kVUw';
  const API_SECRET = process.env.LIVE_SCORE_API_SECRET || '9mbzt6wQ38ovAFMy9HAFM0959W9uR411';

  if (!API_KEY || !API_SECRET) {
    return NextResponse.json({ ok: false, message: 'Credenciais LiveScore não configuradas no servidor.' }, { status: 500 });
  }

  // 2. Montar URL externa
  const baseUrl = `https://livescore-api.com/api-client/${path}`;
  const url = new URL(baseUrl);
  
  // 3. Injetar autenticação
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('secret', API_SECRET);
  
  // 4. Repassar filtros originais do frontend
  searchParams.forEach((v, k) => {
    if (k !== 'key' && k !== 'secret') {
      url.searchParams.append(k, v);
    }
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(url.toString(), { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LotoHub-Premium-Proxy/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No body');
      console.error(`[LiveScore Proxy] Erro HTTP ${response.status} em ${url.pathname}:`, errorBody);
      return NextResponse.json({ 
        ok: false, 
        message: `API retornou erro ${response.status}`,
        status: response.status 
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Tratamento de erro interno da API (success: false)
    if (data.success === false) {
      return NextResponse.json({ ok: false, message: data.error || 'Erro interno na LiveScore API' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    console.error(`[LiveScore Proxy Error] ${path}:`, error.message);
    return NextResponse.json({ 
      ok: false, 
      message: isTimeout ? 'Tempo esgotado ao conectar com LiveScore' : 'Falha na conexão com o provedor de dados' 
    }, { status: isTimeout ? 504 : 500 });
  }
}
