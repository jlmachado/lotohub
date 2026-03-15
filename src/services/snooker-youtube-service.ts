/**
 * @fileOverview Serviço de normalização de dados reais da YouTube API para o sistema de Sinuca.
 * Reforçado com validações rigorosas de Video ID para garantir integridade do player.
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
  validation?: {
    valid: boolean;
    reason?: string;
  };
}

export class SnookerYoutubeService {
  /**
   * Busca dados de canais via API interna (que faz a ponte segura com YouTube Data API).
   */
  static async fetchChannelData(channelHandle: string): Promise<any[]> {
    try {
      const url = new URL('/api/snooker/sync', window.location.origin);
      url.searchParams.append('channelHandle', channelHandle);

      const response = await fetch(url.toString(), { cache: 'no-store' });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Falha na comunicação com o motor de busca.');
      }
      
      return result.success ? (result.data || []) : [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Erro ao buscar dados:', error.message);
      throw error;
    }
  }

  /**
   * Normaliza o item da API do YouTube para o formato interno resiliente.
   */
  static normalizeItem(ytItem: any): SnookerYoutubeItem | null {
    // Tenta extrair o videoId de múltiplos locais possíveis no payload da API v3
    const videoId = ytItem.sourceVideoId || ytItem.id?.videoId || ytItem.videoId;
    
    // BARREIRA DE SEGURANÇA: Se o ID não for válido, não prosseguimos com a normalização para o player
    if (!isValidYoutubeVideoId(videoId)) {
      return {
        sourceVideoId: videoId || 'invalid',
        youtubeUrl: '',
        embedId: '',
        title: ytItem.snippet?.title || 'Item Inválido',
        description: '',
        thumbnailUrl: '',
        publishedAt: new Date().toISOString(),
        status: 'video',
        isEmbeddable: false,
        rawPayload: ytItem,
        validation: { valid: false, reason: 'ID de vídeo do YouTube inválido ou mal-formado.' }
      };
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
      isEmbeddable: true,
      rawPayload: ytItem,
      validation: { valid: true }
    };
  }
}
