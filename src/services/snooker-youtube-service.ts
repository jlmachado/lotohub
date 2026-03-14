/**
 * @fileOverview Serviço de comunicação com a fonte de dados do YouTube (Multicanal).
 * Reforçado com validações rigorosas de Video ID para evitar players quebrados.
 */

import { isValidYoutubeVideoId, buildYoutubeWatchUrl, extractYoutubeVideoId } from '@/utils/youtube';

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
   * Aplica validação de segurança antes de permitir que o item siga para o sync.
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
        // Filtragem e Validação Granular
        return result.data.map((item: any) => {
          const videoId = item.id.videoId;
          const isValid = isValidYoutubeVideoId(videoId);
          
          return {
            ...item,
            videoValidation: {
              valid: isValid,
              reason: isValid ? null : 'ID do YouTube inválido (deve ter 11 caracteres)'
            },
            isEmbeddableCandidate: isValid && !item.isMock
          };
        });
      }
      return [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Falha técnica:', error.message);
      throw error;
    }
  }
}
