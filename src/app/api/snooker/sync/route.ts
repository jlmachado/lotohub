import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização via FEED PÚBLICO (XML/RSS).
 * Substitui a necessidade de YouTube Data API Key.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ 
      success: false, 
      error: 'CHANNEL_ID_REQUIRED',
      message: 'Channel ID não informado para sincronização via feed.' 
    }, { status: 400 });
  }

  // Validação rigorosa do formato do Channel ID para evitar 404 óbvios
  // IDs do YouTube geralmente começam com UC e têm 24 caracteres
  if (!channelId.startsWith('UC') || channelId.length < 20) {
    return NextResponse.json({ 
      success: false, 
      error: 'INVALID_CHANNEL_ID',
      message: `O ID do canal informado (${channelId}) parece estar incorreto ou truncado.` 
    }, { status: 400 });
  }

  try {
    // URL do Feed Público do YouTube
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    console.log(`[YouTube Feed Sync] Buscando feed para: ${channelId}`);

    const response = await fetch(feedUrl, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: 'CHANNEL_NOT_FOUND',
          message: `O canal com ID ${channelId} não foi encontrado pelo YouTube.` 
        }, { status: 404 });
      }
      throw new Error(`Falha ao acessar feed do YouTube: HTTP ${response.status}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const entries = $('entry');
    const results: any[] = [];

    entries.each((_, el) => {
      const entry = $(el);
      const videoId = entry.find('yt\\:videoId').text() || entry.find('videoId').text();
      const title = entry.find('title').text();
      const published = entry.find('published').text();
      const description = entry.find('media\\:group media\\:description').text() || '';
      
      if (!isValidYoutubeVideoId(videoId)) return;

      // Heurística de Status baseada no título
      const titleUpper = title.toUpperCase();
      const isLiveHint = titleUpper.includes('AO VIVO') || titleUpper.includes('LIVE') || titleUpper.includes('TRANSMISSÃO');
      
      // RSS Feed geralmente contém os vídeos mais recentes.
      // Se for muito recente e tiver "AO VIVO", tratamos como live.
      const pubDate = new Date(published).getTime();
      const now = Date.now();
      const isVeryRecent = (now - pubDate) < (4 * 60 * 60 * 1000); // 4 horas

      results.push({
        sourceVideoId: videoId,
        videoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
        embedId: videoId,
        title,
        description,
        publishedAt: published,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        isMock: false,
        sourceType: (isLiveHint && isVeryRecent) ? 'live' : 'video',
        isEmbeddableCandidate: true,
        videoValidation: { valid: true }
      });
    });

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      source: 'YouTube Public RSS Feed'
    });

  } catch (error: any) {
    console.error('[YouTube Feed Sync Error]:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'FETCH_ERROR',
      message: error.message || 'Falha ao processar feed do YouTube'
    }, { status: 500 });
  }
}
