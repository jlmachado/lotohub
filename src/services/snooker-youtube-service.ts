/**
 * @fileOverview Serviço de comunicação com a fonte de dados do YouTube (Multicanal).
 * Reforçado com validações de Video ID.
 */

import { isValidYoutubeVideoId, extractYoutubeVideoId } from '@/utils/youtube';

export interface YoutubeApiResponse {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    liveBroadcastContent: 'live' | 'upcoming' | 'none';
    scheduledStartTime?: string;
    actualStartTime?: string;
    thumbnails: { medium: { url: string } };
  };
  isMock?: boolean;
}

export class SnookerYoutubeService {
  /**
   * Busca dados de transmissões via proxy interno.
   */
  static async fetchChannelData(channelUrl?: string): Promise<YoutubeApiResponse[]> {
    try {
      const url = new URL('/api/snooker/sync', window.location.origin);
      if (channelUrl) url.searchParams.append('channelUrl', channelUrl);

      const response = await fetch(url.toString(), { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API de Sinuca: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        // Retorna todos, mas o SyncService filtrará por validade do ID
        return result.data;
      }
      return [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Falha técnica:', error.message);
      throw error;
    }
  }
}
