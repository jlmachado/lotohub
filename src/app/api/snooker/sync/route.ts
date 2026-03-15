import { NextResponse } from 'next/server';
import { isValidYoutubeVideoId } from '@/utils/youtube';

/**
 * @fileOverview Rota de API Segura para sincronização REAL com YouTube Data API.
 * Executa exclusivamente no servidor para proteger a chave de API.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelHandle = searchParams.get('channelHandle');

  // Acesso estritamente no servidor para garantir leitura correta das ENV
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('[YouTube API Route] Erro: YOUTUBE_API_KEY não encontrada no processo.');
    return NextResponse.json({ 
      success: false, 
      error: 'CONFIG_ERROR',
      message: 'YouTube API Key não configurada no servidor.' 
    }, { status: 500 });
  }

  try {
    const query = channelHandle || '@TVSnookerBrasil';
    
    // Chamada à YouTube Search API
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('maxResults', '8');
    searchUrl.searchParams.append('order', 'date');
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('key', apiKey);

    console.log(`[YouTube API Route] Iniciando busca para: ${query}`);

    const response = await fetch(searchUrl.toString(), { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[YouTube API Route] Erro retornado pelo Google:', errorData);
      
      if (response.status === 403) {
        return NextResponse.json({ 
          success: false, 
          error: 'QUOTA_EXCEEDED', 
          message: 'Limite de requisições do YouTube atingido ou chave inválida.' 
        }, { status: 403 });
      }
      
      throw new Error(errorData.error?.message || 'Erro na API do YouTube');
    }

    const data = await response.json();
    const items = data.items || [];

    // Normalizar retorno para o frontend
    const normalizedData = items.map((item: any) => {
      const videoId = item.id?.videoId;
      const isValid = isValidYoutubeVideoId(videoId);
      
      return {
        sourceVideoId: videoId,
        videoId: videoId,
        id: { videoId },
        snippet: {
          title: item.snippet.title,
          description: item.snippet.description,
          liveBroadcastContent: item.snippet.liveBroadcastContent,
          publishedAt: item.snippet.publishedAt,
          thumbnails: item.snippet.thumbnails
        },
        isMock: false,
        isEmbeddableCandidate: isValid && item.snippet.liveBroadcastContent !== 'none',
        videoValidation: {
          valid: isValid,
          reason: isValid ? null : 'ID do YouTube inválido (deve ter 11 caracteres)'
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: normalizedData,
      count: normalizedData.length,
      source: 'YouTube Data API V3 (Server-Side)'
    });

  } catch (error: any) {
    console.error('[YouTube API Route Error]:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'FETCH_ERROR',
      message: error.message || 'Falha inesperada ao consultar YouTube'
    }, { status: 500 });
  }
}
