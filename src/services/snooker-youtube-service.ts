/**
 * @fileOverview Serviço de normalização de dados do Feed Público do YouTube.
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
  validation: {
    valid: boolean;
    reason?: string;
  };
}

export class SnookerYoutubeService {
  /**
   * Busca dados de canais via API interna (ponte com Feed RSS).
   */
  static async fetchChannelData(channelId: string): Promise<any[]> {
    try {
      const url = new URL('/api/snooker/sync', window.location.origin);
      url.searchParams.append('channelId', channelId);

      const response = await fetch(url.toString(), { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Erro HTTP ${response.status}`);
      }
      
      if (result.success === false) {
        throw new Error(result.message || 'Falha na sincronização.');
      }
      
      return result.data || [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Falha na comunicação:', error.message);
      throw error;
    }
  }

  /**
   * Normaliza o item do feed para o formato interno resiliente.
   */
  static normalizeItem(ytItem: any): SnookerYoutubeItem | null {
    const videoId = ytItem.videoId;
    
    if (!isValidYoutubeVideoId(videoId)) {
      return {
        sourceVideoId: videoId || 'invalid',
        youtubeUrl: '',
        embedId: '',
        title: ytItem.title || 'Item Inválido',
        description: '',
        thumbnailUrl: '',
        publishedAt: new Date().toISOString(),
        status: 'video',
        isEmbeddable: false,
        rawPayload: ytItem,
        validation: { valid: false, reason: 'ID de vídeo inválido.' }
      };
    }

    return {
      sourceVideoId: videoId,
      youtubeUrl: buildYoutubeWatchUrl(videoId),
      embedId: videoId,
      title: ytItem.title,
      description: ytItem.description || '',
      thumbnailUrl: ytItem.thumbnailUrl,
      publishedAt: ytItem.publishedAt,
      status: ytItem.sourceType || 'video',
      isEmbeddable: true,
      rawPayload: ytItem,
      validation: { valid: true }
    };
  }
}
