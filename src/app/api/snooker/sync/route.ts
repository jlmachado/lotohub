import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl, isValidYoutubeChannelId } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização via FEED PÚBLICO (XML/RSS).
 * Corrigida para validar Channel ID e evitar erros 404 por IDs truncados.
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

  // Validação rigorosa do Channel ID (Deve ter 24 chars e começar com UC)
  if (!isValidYoutubeChannelId(channelId)) {
    return NextResponse.json({ 
      success: false, 
      error: 'INVALID_CHANNEL_ID',
      message: `ID do canal inválido ou truncado: ${channelId}. Certifique-se de usar o ID completo de 24 caracteres.` 
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
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'CHANNEL_NOT_FOUND',
          message: 'Canal não encontrado no YouTube. Verifique se o Channel ID está correto.'
        }, { status: 404 });
      }
      return NextResponse.json({ 
        success: false, 
        error: 'FETCH_ERROR',
        message: `YouTube retornou status ${response.status}` 
      }, { status: response.status });
    }

    const xml = await response.text();
    // Forçamos o xmlMode para que seletores com namespace funcionem melhor
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const entries = $('entry');
    const results: any[] = [];

    entries.each((_, el) => {
      const entry = $(el);
      
      // EXTRAÇÃO DO VIDEO ID COM ESCAPE DE NAMESPACE
      let videoId = entry.find('yt\\:videoId').first().text().trim() || 
                    entry.find('videoId').first().text().trim();
      
      if (!videoId) {
        const link = entry.find('link[rel="alternate"]').attr('href') || "";
        if (link.includes('v=')) {
          videoId = link.split('v=')[1]?.substring(0, 11);
        }
      }

      // Validação do Video ID
      if (!isValidYoutubeVideoId(videoId)) return;

      const title = entry.find('title').first().text().trim();
      const published = entry.find('published').first().text().trim() || 
                        entry.find('updated').first().text().trim();
      
      const description = entry.find('media\\:description').first().text().trim() || 
                          entry.find('description').first().text().trim() ||
                          entry.find('media\\:group media\\:description').first().text().trim() || "";

      let thumbnailUrl = entry.find('media\\:thumbnail').attr('url') || 
                         entry.find('media\\:group media\\:thumbnail').attr('url');
      
      if (!thumbnailUrl) {
        thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      const titleUpper = title.toUpperCase();
      const isLiveHint = titleUpper.includes('AO VIVO') || 
                         titleUpper.includes('LIVE') || 
                         titleUpper.includes('TRANSMISSÃO');
      
      const pubDate = new Date(published).getTime();
      const now = Date.now();
      const isVeryRecent = (now - pubDate) < (12 * 60 * 60 * 1000);

      results.push({
        sourceVideoId: videoId,
        videoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
        embedId: videoId,
        title,
        description: description.substring(0, 500),
        publishedAt: published,
        thumbnailUrl,
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
    console.error('[Sync API] Erro crítico:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'SERVER_ERROR',
      message: error.message 
    }, { status: 500 });
  }
}
