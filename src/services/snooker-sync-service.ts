
/**
 * @fileOverview Orquestrador de Sincronização de Sinuca com Fallback.
 */

import { SnookerYoutubeService } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerPriorityService } from './snooker-priority-service';
import { SnookerChannel } from '@/context/AppContext';
import { isValidYoutubeVideoId } from '@/utils/youtube';

export class SnookerSyncService {
  /**
   * Fonte Principal: YouTube Feed
   */
  static async fetchFromMainSource(): Promise<any[]> {
    // Busca do canal oficial
    const channelId = "UCkb_vWhEvID_v_vXOnZ_sqQ"; 
    return await SnookerYoutubeService.fetchChannelData(channelId);
  }

  /**
   * Fonte de Fallback: Backup Channel
   */
  static async fetchFromFallbackSource(): Promise<any[]> {
    // Busca de um canal secundário caso o principal falhe
    const fallbackId = "UC7_88_scX_sq_v_vXOnZ_sqQ"; // Exemplo
    try {
      return await SnookerYoutubeService.fetchChannelData(fallbackId);
    } catch {
      return [];
    }
  }

  /**
   * Processa a lista bruta de itens do YouTube para o formato SnookerChannel.
   */
  static async processItems(rawData: any[], bancaId: string): Promise<SnookerChannel[]> {
    const results: SnookerChannel[] = [];

    rawData.forEach((ytItem: any) => {
      const videoId = ytItem.videoId || ytItem.sourceVideoId;
      if (!isValidYoutubeVideoId(videoId)) return;

      const parsed = SnookerParserService.parse(ytItem.title, ytItem.description);
      const uniqueId = `yt_${videoId}`;

      results.push({
        id: uniqueId,
        title: parsed.eventTitle,
        description: ytItem.description?.substring(0, 200) || '',
        youtubeUrl: ytItem.youtubeUrl,
        embedId: videoId,
        sourceVideoId: videoId,
        source: 'youtube',
        sourceName: ytItem.sourceName || 'YouTube',
        scheduledAt: ytItem.publishedAt,
        status: ytItem.statusHint === 'live' ? 'live' : 'scheduled',
        playerA: { name: parsed.playerA, level: 5 },
        playerB: { name: parsed.playerB, level: 5 },
        scoreA: 0,
        scoreB: 0,
        odds: { A: 1.95, B: 1.95, D: 3.20 },
        houseMargin: 8,
        bestOf: parsed.bestOf,
        priority: 10,
        enabled: true,
        bancaId,
        thumbnailUrl: ytItem.thumbnailUrl,
        tournamentName: parsed.tournamentName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as SnookerChannel);
    });

    return SnookerPriorityService.rankItems(results);
  }
}
