import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl, isValidYoutubeChannelId } from '@/utils/youtube';

/**
 * @fileOverview Rota de API para sincronização híbrida.
 * Camada 1: Feed RSS (XML) - Descoberta de vídeos.
 * Camada 2: Live Page (HTML) - Confirmação de live ativa em tempo real.
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

  if (!isValidYoutubeChannelId(channelId)) {
    return NextResponse.json({ 
      success: false, 
      error: 'INVALID_CHANNEL_ID',
      message: `ID do canal inválido: ${channelId}.` 
    }, { status: 400 });
  }

  try {
    // 1. BUSCA FEED PÚBLICO (XML)
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feedResponse = await fetch(feedUrl, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'Mozilla/5.0' }
    });

    // 2. BUSCA PÁGINA LIVE DO CANAL (HTML) - Camada de confirmação real
    const livePageUrl = `https://www.youtube.com/channel/${channelId}/live`;
    const liveResponse = await fetch(livePageUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    let liveVideoId: string | null = null;
    let livePageTitle: string | null = null;

    if (liveResponse.ok) {
      const liveHtml = await liveResponse.text();
      // Regex robusto para capturar VideoID em tags canônicas, og:url ou scripts
      const videoIdMatch = liveHtml.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})">/) ||
                           liveHtml.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})">/) ||
                           liveHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      
      const titleMatch = liveHtml.match(/<title>(.*?)<\/title>/);
      
      if (videoIdMatch) liveVideoId = videoIdMatch[1];
      if (titleMatch) livePageTitle = titleMatch[1].replace(' - YouTube', '');
    }

    // 3. PARSE DO XML DO FEED
    const xml = await feedResponse.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const entries = $('entry');
    const results: any[] = [];

    entries.each((_, el) => {
      const entry = $(el);
      const videoId = entry.find('yt\\:videoId').text().trim() || entry.find('videoId').text().trim();
      
      if (!isValidYoutubeVideoId(videoId)) return;

      const title = entry.find('title').text().trim();
      const published = entry.find('published').text().trim();
      const description = entry.find('media\\:group media\\:description').text().trim() || "";
      const thumb = entry.find('media\\:group media\\:thumbnail').attr('url') || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      const isTitleLive = title.toUpperCase().includes('AO VIVO') || title.toUpperCase().includes('LIVE');
      const isActuallyLive = liveVideoId === videoId;

      results.push({
        sourceVideoId: videoId,
        videoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
        embedId: videoId,
        title,
        description: description.substring(0, 500),
        publishedAt: published,
        thumbnailUrl: thumb,
        sourceType: isActuallyLive ? 'live' : 'video',
        statusHint: isActuallyLive ? 'live' : (isTitleLive ? 'live' : 'video'),
        liveConfidence: isActuallyLive ? 'high' : (isTitleLive ? 'medium' : 'low'),
        detectionSource: isActuallyLive ? 'combined' : 'feed',
        isEmbeddableCandidate: true,
        videoValidation: { valid: true }
      });
    });

    // 4. SE A LIVE PAGE TEM UM VÍDEO QUE NÃO ESTÁ NO FEED (Live recém iniciada)
    if (liveVideoId && !results.find(r => r.videoId === liveVideoId)) {
      results.unshift({
        sourceVideoId: liveVideoId,
        videoId: liveVideoId,
        youtubeUrl: buildYoutubeWatchUrl(liveVideoId),
        embedId: liveVideoId,
        title: livePageTitle || 'Transmissão ao Vivo',
        description: 'Detectado via página de live do canal.',
        publishedAt: new Date().toISOString(),
        thumbnailUrl: `https://i.ytimg.com/vi/${liveVideoId}/hqdefault.jpg`,
        sourceType: 'live',
        statusHint: 'live',
        liveConfidence: 'high',
        detectionSource: 'channel_live_page',
        isEmbeddableCandidate: true,
        videoValidation: { valid: true }
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      liveDetected: !!liveVideoId,
      source: 'Hybrid Sync (Feed + Scraping)'
    });

  } catch (error: any) {
    console.error('[Sync API] Erro crítico:', error.message);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
}
