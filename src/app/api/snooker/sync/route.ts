import { NextResponse } from 'next/server';
import { isValidYoutubeVideoId } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização real com a YouTube Data API.
 * Busca transmissões ao vivo, agendadas e vídeos recentes dos canais configurados.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Mapeamento manual de Channel IDs conhecidos para garantir precisão caso o handle falhe
const CHANNEL_IDS: Record<string, string> = {
  '@TVSnookerBrasil': 'UC_v_X_example_id_tv_snooker', // IDs reais seriam buscados ou fixados aqui
  '@juniorsnooker': 'UC_v_X_example_id_junior_snooker'
};

async function fetchFromYoutube(params: URLSearchParams) {
  params.append('key', YOUTUBE_API_KEY || '');
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro na YouTube API');
  }
  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelHandle = searchParams.get('channelHandle');

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ 
      success: false, 
      message: 'YouTube API Key não configurada no servidor.',
      isMock: true // Fallback para indicar que o sistema está cego sem a chave
    }, { status: 500 });
  }

  try {
    // 1. Resolver Channel ID se necessário (simplificado: busca por q=handle se não tiver ID fixo)
    const query = channelHandle || '@TVSnookerBrasil';
    
    // 2. Buscar conteúdos variados (Live, Upcoming, Recent)
    // Para simplificar e economizar quota, faremos uma busca geral por vídeos do canal
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '10',
      order: 'date',
      type: 'video',
      q: query // Busca por handle funciona bem na search API do YouTube
    });

    const searchData = await fetchFromYoutube(params);
    const items = searchData.items || [];

    // 3. Normalizar e Validar Resultados
    const normalizedData = items.map((item: any) => {
      const videoId = item.id.videoId;
      const isValid = isValidYoutubeVideoId(videoId);
      
      // Determinar o tipo de conteúdo baseado no snippet (simplificado)
      // Em uma integração real, chamaríamos videos.list para pegar liveStreamingDetails
      const liveStatus = item.snippet.liveBroadcastContent; // 'live', 'upcoming', 'none'
      
      return {
        id: { videoId },
        snippet: {
          title: item.snippet.title,
          description: item.snippet.description,
          liveBroadcastContent: liveStatus,
          publishedAt: item.snippet.publishedAt,
          thumbnails: item.snippet.thumbnails
        },
        isMock: false,
        isEmbeddableCandidate: isValid && liveStatus !== 'none', // Vídeos finalizados ou inválidos não são candidatos imediatos para 'live'
        videoValidation: {
          valid: isValid,
          reason: isValid ? null : 'ID do YouTube inválido ou mal formatado'
        }
      };
    }).filter((item: any) => item.videoValidation.valid); // Filtra lixo da API

    return NextResponse.json({
      success: true,
      data: normalizedData,
      count: normalizedData.length,
      source: 'YouTube Data API V3'
    });

  } catch (error: any) {
    console.error('[YouTube Sync API Error]:', error.message);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}
