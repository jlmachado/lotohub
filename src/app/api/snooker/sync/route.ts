import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização via FEED PÚBLICO (XML/RSS).
 * Corrigida para garantir extração precisa de IDs de vídeo reais.
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
      message: 'Channel ID não informado.' 
    }, { status: 400 });
  }

  if (!channelId.startsWith('UC') || channelId.length < 20) {
    return NextResponse.json({ 
      success: false, 
      error: 'INVALID_CHANNEL_ID',
      message: `ID do canal inválido: ${channelId}` 
    }, { status: 400 });
  }

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    const response = await fetch(feedUrl, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'FETCH_ERROR',
        message: `YouTube retornou status ${response.status}` 
      }, { status: response.status });
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const entries = $('entry');
    const results: any[] = [];

    entries.each((_, el) => {
      const entry = $(el);
      // Extração robusta do ID do vídeo (com ou sem namespace)
      const videoId = entry.find('yt\\:videoId').text() || entry.find('videoId').text();
      const title = entry.find('title').text();
      const published = entry.find('published').text();
      const description = entry.find('media\\:group media\\:description').text() || '';
      
      // Validação rigorosa do ID do YouTube (11 caracteres)
      if (!isValidYoutubeVideoId(videoId)) return;

      const titleUpper = title.toUpperCase();
      const isLiveHint = titleUpper.includes('AO VIVO') || titleUpper.includes('LIVE') || titleUpper.includes('TRANSMISSÃO');
      
      const pubDate = new Date(published).getTime();
      const now = Date.now();
      const isVeryRecent = (now - pubDate) < (6 * 60 * 60 * 1000); // 6 horas

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
      source: 'YouTube RSS Feed'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'SERVER_ERROR',
      message: error.message 
    }, { status: 500 });
  }
}
