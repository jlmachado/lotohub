/**
 * @fileOverview Serviço de comunicação com a fonte de dados do YouTube.
 */

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
}

export class SnookerYoutubeService {
  /**
   * Busca dados de transmissões do canal via proxy interno.
   */
  static async fetchChannelData(): Promise<YoutubeApiResponse[]> {
    try {
      const response = await fetch('/api/snooker/sync', { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha na comunicação com a API de Sinuca');
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('[SnookerYoutubeService] Error:', error);
      return [];
    }
  }
}
