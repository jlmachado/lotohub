/**
 * @fileOverview Orquestrador de sincronização entre YouTube e Canais do Sistema.
 */

import { SnookerYoutubeService, YoutubeApiResponse } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerChannel } from '@/context/AppContext';

export interface SyncResult {
  added: number;
  updated: number;
  total: number;
}

export class SnookerSyncService {
  /**
   * Sincroniza a lista de canais baseada no YouTube.
   */
  static async sync(currentChannels: SnookerChannel[], bancaId: string): Promise<{ 
    updatedChannels: SnookerChannel[], 
    summary: SyncResult 
  }> {
    const youtubeData = await SnookerYoutubeService.fetchChannelData();
    let added = 0;
    let updated = 0;

    const newChannelsList = [...currentChannels];

    youtubeData.forEach((yt: YoutubeApiResponse) => {
      const embedId = yt.id.videoId;
      const parsed = SnookerParserService.parseTitle(yt.snippet.title);
      
      const existingIdx = newChannelsList.findIndex(c => c.embedId === embedId);

      const status: SnookerChannel['status'] = 
        yt.snippet.liveBroadcastContent === 'live' ? 'live' : 
        yt.snippet.liveBroadcastContent === 'upcoming' ? 'scheduled' : 'finished';

      if (existingIdx >= 0) {
        // Atualiza canais existentes preservando placar e prioridade manual
        newChannelsList[existingIdx] = {
          ...newChannelsList[existingIdx],
          status,
          title: parsed.eventTitle,
          updatedAt: new Date().toISOString()
        };
        updated++;
      } else {
        // Cria novo canal
        const newChannel: SnookerChannel = {
          id: `chan-yt-${embedId}`,
          title: parsed.eventTitle,
          description: yt.snippet.description.substring(0, 200),
          youtubeUrl: `https://www.youtube.com/watch?v=${embedId}`,
          embedId,
          scheduledAt: yt.snippet.scheduledStartTime || new Date().toISOString(),
          startedAt: yt.snippet.actualStartTime,
          status,
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newChannelsList.unshift(newChannel);
        added++;
      }
    });

    return {
      updatedChannels: newChannelsList,
      summary: { added, updated, total: youtubeData.length }
    };
  }
}
