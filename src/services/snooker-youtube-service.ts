/**
 * @fileOverview Serviço de normalização de dados do Feed Público do YouTube.
 * Corrigido para validar a integridade dos campos obrigatórios.
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
    const videoId = ytItem.videoId || ytItem.sourceVideoId;
    
    // Validação de segurança: Não aceita itens sem Video ID válido
    if (!isValidYoutubeVideoId(videoId)) {
      console.warn(`[SnookerYoutubeService] Item descartado: Video ID inválido (${videoId})`);
      return null;
    }

    // Garante que campos críticos existam
    if (!ytItem.title || !ytItem.publishedAt) {
      console.warn(`[SnookerYoutubeService] Item descartado: Metadados incompletos para ${videoId}`);
      return null;
    }

    return {
      sourceVideoId: videoId,
      youtubeUrl: buildYoutubeWatchUrl(videoId),
      embedId: videoId,
      title: ytItem.title,
      description: ytItem.description || '',
      thumbnailUrl: ytItem.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: ytItem.publishedAt,
      status: ytItem.sourceType || 'video',
      isEmbeddable: true,
      rawPayload: ytItem,
      validation: { valid: true }
    };
  }
}
