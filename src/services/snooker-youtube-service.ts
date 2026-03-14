/**
 * @fileOverview Serviço de normalização de dados reais da YouTube API para o sistema de Sinuca.
 * Reforçado com validações rigorosas de Video ID.
 */

import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

export interface SnookerYoutubeItem {
  sourceVideoId: string;
  youtubeUrl: string;
  embedId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  status: 'live' | 'upcoming' | 'video';
  isEmbeddable: boolean;
  rawPayload: any;
}

export class SnookerYoutubeService {
  /**
   * Busca dados de canais via API interna (que faz a ponte com YouTube Data API).
   */
  static async fetchChannelData(channelHandle: string): Promise<any[]> {
    try {
      const url = new URL('/api/snooker/sync', window.location.origin);
      url.searchParams.append('channelHandle', channelHandle);

      const response = await fetch(url.toString(), { cache: 'no-store' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha na sincronização');
      }
      
      const result = await response.json();
      return result.success ? (result.data || []) : [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Erro ao buscar dados:', error.message);
      throw error;
    }
  }

  /**
   * Normaliza o item da API do YouTube para o formato interno.
   */
  static normalizeItem(ytItem: any): SnookerYoutubeItem | null {
    const videoId = ytItem.id?.videoId;
    
    if (!isValidYoutubeVideoId(videoId)) {
      console.warn('[SnookerYoutubeService] Ignorando item com VideoID inválido:', videoId);
      return null;
    }

    const statusMap: Record<string, 'live' | 'upcoming' | 'video'> = {
      'live': 'live',
      'upcoming': 'upcoming',
      'none': 'video'
    };

    return {
      sourceVideoId: videoId,
      youtubeUrl: buildYoutubeWatchUrl(videoId),
      embedId: videoId,
      title: ytItem.snippet.title,
      description: ytItem.snippet.description,
      thumbnailUrl: ytItem.snippet.thumbnails?.medium?.url || ytItem.snippet.thumbnails?.default?.url,
      publishedAt: ytItem.snippet.publishedAt,
      status: statusMap[ytItem.snippet.liveBroadcastContent] || 'video',
      isEmbeddable: ytItem.isEmbeddableCandidate !== false,
      rawPayload: ytItem
    };
  }
}
