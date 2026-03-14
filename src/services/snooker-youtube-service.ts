/**
 * @fileOverview Serviço de comunicação e diagnóstico para a fonte de dados do YouTube.
 * Responsável por validar e extrair identificadores de vídeo com segurança.
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
   * Valida se uma string é uma URL válida do YouTube.
   */
  static isValidYoutubeUrl(url: string): boolean {
    if (!url) return false;
    const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:&.*)?$/;
    return regex.test(url);
  }

  /**
   * Extrai o videoId de uma URL de forma segura.
   */
  static extractVideoId(url: string): string | null {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Busca dados de transmissões do canal via proxy interno.
   * Em produção, isso bateria na YouTube Data API v3.
   */
  static async fetchChannelData(): Promise<YoutubeApiResponse[]> {
    try {
      const response = await fetch('/api/snooker/sync', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API de Sinuca: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    } catch (error: any) {
      console.error('[SnookerYoutubeService] Falha técnica:', error.message);
      throw error;
    }
  }
}
