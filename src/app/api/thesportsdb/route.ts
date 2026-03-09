import { NextResponse } from 'next/server';

/**
 * @fileOverview Proxy de API para TheSportsDB.
 * Executa as chamadas no servidor para evitar erros de CORS e "Failed to fetch" no cliente.
 * Utiliza a chave 123 (V1 Free) conforme configurado.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  // Base URL fixa com a chave 123
  const baseUrl = 'https://www.thesportsdb.com/api/v1/json/123';
  
  // O endpoint já vem com os parâmetros (ex: search_all_leagues.php?c=Brazil)
  const url = `${baseUrl}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: 300 }, // Cache de 5 minutos no servidor
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      return NextResponse.json({ error: `TheSportsDB error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[TheSportsDB Proxy Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
