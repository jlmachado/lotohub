import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização via FEED PÚBLICO (XML/RSS).
 * Corrigida para lidar corretamente com namespaces XML (yt:, media:).
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
      message: `ID do canal inválido ou truncado: ${channelId}` 
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
    // Forçamos o xmlMode para que seletores com namespace funcionem melhor
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const entries = $('entry');
    const results: any[] = [];

    entries.each((_, el) => {
      const entry = $(el);
      
      // 1. EXTRAÇÃO DO VIDEO ID (CAMINHO CRÍTICO)
      // Tentamos yt:videoId com escape, depois videoId puro, depois extração do link
      let videoId = entry.find('yt\\:videoId').first().text().trim() || 
                    entry.find('videoId').first().text().trim();
      
      if (!videoId) {
        const link = entry.find('link[rel="alternate"]').attr('href') || "";
        if (link.includes('v=')) {
          videoId = link.split('v=')[1]?.substring(0, 11);
        }
      }

      // Validação rigorosa do ID
      if (!isValidYoutubeVideoId(videoId)) {
        console.warn(`[Sync API] Entry ignorada: Video ID inválido (${videoId})`);
        return;
      }

      // 2. EXTRAÇÃO DE TÍTULO E DATAS
      const title = entry.find('title').first().text().trim();
      const published = entry.find('published').first().text().trim() || 
                        entry.find('updated').first().text().trim();
      
      // 3. EXTRAÇÃO DE DESCRIÇÃO (Namespace media:)
      const description = entry.find('media\\:description').first().text().trim() || 
                          entry.find('description').first().text().trim() ||
                          entry.find('media\\:group media\\:description').first().text().trim() || "";

      // 4. EXTRAÇÃO DE THUMBNAIL
      let thumbnailUrl = entry.find('media\\:thumbnail').attr('url') || 
                         entry.find('media\\:group media\\:thumbnail').attr('url');
      
      if (!thumbnailUrl) {
        thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      // 5. DETECÇÃO DE STATUS HINT
      const titleUpper = title.toUpperCase();
      const isLiveHint = titleUpper.includes('AO VIVO') || 
                         titleUpper.includes('LIVE') || 
                         titleUpper.includes('TRANSMISSÃO');
      
      const pubDate = new Date(published).getTime();
      const now = Date.now();
      const isVeryRecent = (now - pubDate) < (12 * 60 * 60 * 1000); // 12 horas

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

    console.log(`[Sync API] Canal ${channelId}: ${results.length} itens capturados com sucesso.`);

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
