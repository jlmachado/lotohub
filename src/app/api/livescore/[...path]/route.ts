import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy Server-Side para Live Score API.
 * Utiliza as chaves fornecidas para autenticação segura.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const { searchParams } = new URL(request.url);
  const path = params.path.join('/');
  
  // Chaves fornecidas pelo usuário
  const API_KEY = 'XtV2v4puj9N4kVUw';
  const API_SECRET = '9mbzt6wQ38ovAFMy9HAFM0959W9uR411';

  const baseUrl = `https://livescore-api.com/api-client/${path}`;
  const url = new URL(baseUrl);
  
  // Adiciona credenciais obrigatórias
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('secret', API_SECRET);
  
  // Repassa os demais parâmetros da query original
  searchParams.forEach((v, k) => {
    if (k !== 'key' && k !== 'secret') {
      url.searchParams.append(k, v);
    }
  });

  try {
    const response = await fetch(url.toString(), { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        ok: false, 
        message: `LiveScore API retornou erro ${response.status}` 
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error(`[LiveScore Proxy Error] ${url}:`, error.message);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
