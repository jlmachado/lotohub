
/**
 * @fileOverview Orquestrador de sincronização de Sinuca.
 * Gerencia a atualização de canais e criação de registros automáticos.
 */

import { SnookerYoutubeService, YoutubeApiResponse } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerChannel, SnookerAutomationSettings } from '@/context/AppContext';

export interface SyncSummary {
  itemsRead: number;
  created: number;
  updated: number;
  failures: number;
}

export class SnookerSyncService {
  static generateSyncHash(videoId: string, title: string, date: string): string {
    const norm = (s: string) => SnookerParserService.normalizeForHash(s);
    return `sync_${videoId}_${norm(title)}_${date.split('T')[0]}`;
  }

  static async sync(
    currentChannels: SnookerChannel[], 
    bancaId: string,
    settings: SnookerAutomationSettings
  ): Promise<{ updatedChannels: SnookerChannel[], summary: SyncSummary }> {
    const summary: SyncSummary = { itemsRead: 0, created: 0, updated: 0, failures: 0 };
    
    try {
      const youtubeData = await SnookerYoutubeService.fetchChannelData();
      summary.itemsRead = youtubeData.length;

      const newChannelsList = [...currentChannels];

      youtubeData.forEach((yt: YoutubeApiResponse) => {
        try {
          const videoId = yt.id.videoId;
          if (!videoId) return;

          const parsed = SnookerParserService.parse(yt.snippet.title, yt.snippet.description);
          const scheduledAt = yt.snippet.scheduledStartTime || new Date().toISOString();
          const syncHash = this.generateSyncHash(videoId, yt.snippet.title, scheduledAt);
          
          const existingIdx = newChannelsList.findIndex(c => c.sourceVideoId === videoId || c.syncHash === syncHash);

          let status: SnookerChannel['status'] = 'scheduled';
          if (yt.snippet.liveBroadcastContent === 'live') status = 'live';
          else if (yt.snippet.liveBroadcastContent === 'none') status = 'finished';

          const startTime = new Date(scheduledAt).getTime();
          if (status === 'scheduled' && (startTime - Date.now()) < 3600000) status = 'imminent';

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            if (existing.isManualOverride) {
              if (status !== existing.status) {
                newChannelsList[existingIdx] = { ...existing, status, updatedAt: new Date().toISOString() };
                summary.updated++;
              }
              return;
            }

            newChannelsList[existingIdx] = {
              ...existing,
              status,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              modality: parsed.modality,
              phase: parsed.phase,
              prize: parsed.prize,
              prizeLabel: parsed.prizeLabel,
              metadataConfidence: parsed.confidence,
              parserNotes: parsed.notes,
              thumbnailUrl: yt.snippet.thumbnails.medium.url,
              sourceStatus: 'synced',
              updatedAt: new Date().toISOString(),
              autoUpdatedAt: new Date().toISOString()
            };
            summary.updated++;
          } else if (settings.autoCreateChannels) {
            const newChannel: SnookerChannel = {
              id: `chan-auto-${videoId}`,
              syncHash,
              title: parsed.eventTitle,
              description: yt.snippet.description.substring(0, 200),
              youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
              embedId: videoId,
              sourceVideoId: videoId,
              source: 'youtube',
              sourceType: yt.snippet.liveBroadcastContent === 'none' ? 'video' : 'live',
              sourceStatus: settings.requireAdminApproval ? 'detected' : 'synced',
              autoCreated: true,
              scheduledAt,
              status,
              playerA: { name: parsed.playerA, level: 5 },
              playerB: { name: parsed.playerB, level: 5 },
              scoreA: 0,
              scoreB: 0,
              odds: { A: 1.95, B: 1.95, D: 3.20 },
              houseMargin: 8,
              bestOf: parsed.bestOf,
              priority: 10,
              enabled: !settings.requireAdminApproval,
              bancaId,
              thumbnailUrl: yt.snippet.thumbnails.medium.url,
              tournamentName: parsed.tournamentName,
              modality: parsed.modality,
              phase: parsed.phase,
              prize: parsed.prize,
              prizeLabel: parsed.prizeLabel,
              metadataConfidence: parsed.confidence,
              parserNotes: parsed.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            newChannelsList.unshift(newChannel);
            summary.created++;
          }
        } catch (e) {
          summary.failures++;
        }
      });

      return { updatedChannels: newChannelsList, summary };
    } catch (e) {
      throw e;
    }
  }
}
