/**
 * @fileOverview Orquestrador de sincronização Multicanal de Sinuca.
 * Reforçado com validação de Video ID e proteção de Player.
 */

import { SnookerYoutubeService, YoutubeApiResponse } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerChannel, SnookerAutomationSource, SnookerAutomationSettings } from '@/context/AppContext';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

export interface SyncSummary {
  itemsRead: number;
  created: number;
  updated: number;
  failures: number;
  invalidVideos: number;
}

export class SnookerSyncService {
  /**
   * Gera um hash único para identificar o evento e evitar duplicidade.
   */
  static generateSyncHash(videoId: string, title: string, date: string): string {
    const norm = (s: string) => SnookerParserService.normalizeForHash(s);
    return `sync_${videoId}_${norm(title)}_${date.split('T')[0]}`;
  }

  /**
   * Executa a sincronização para uma fonte específica.
   */
  static async sync(
    currentChannels: SnookerChannel[], 
    bancaId: string,
    source: SnookerAutomationSource,
    settings: SnookerAutomationSettings
  ): Promise<{ updatedChannels: SnookerChannel[], summary: SyncSummary }> {
    const summary: SyncSummary = { itemsRead: 0, created: 0, updated: 0, failures: 0, invalidVideos: 0 };
    
    try {
      const youtubeData = await SnookerYoutubeService.fetchChannelData(source.channelUrl);
      summary.itemsRead = youtubeData.length;

      const newChannelsList = [...currentChannels];

      youtubeData.forEach((yt: YoutubeApiResponse) => {
        try {
          const videoId = yt.id.videoId;
          
          // VALIDAÇÃO CRÍTICA DE VÍDEO
          const isVideoValid = isValidYoutubeVideoId(videoId);
          if (!isVideoValid) {
            summary.invalidVideos++;
            return; // Pula itens com IDs mal formatados
          }

          const parsed = SnookerParserService.parse(yt.snippet.title, yt.snippet.description, source.parseProfile);
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
              sourceName: source.name,
              sourceId: source.id,
              originPriority: source.priority,
              updatedAt: new Date().toISOString(),
              autoUpdatedAt: new Date().toISOString(),
              // Garante que o embedId seja o videoId validado
              embedId: videoId,
              youtubeUrl: buildYoutubeWatchUrl(videoId)
            };
            summary.updated++;
          } else if (source.autoCreateChannels) {
            const newChannel: SnookerChannel = {
              id: `chan-auto-${videoId}`,
              syncHash,
              title: parsed.eventTitle,
              description: yt.snippet.description.substring(0, 200),
              youtubeUrl: buildYoutubeWatchUrl(videoId),
              embedId: videoId,
              sourceVideoId: videoId,
              source: 'youtube',
              sourceName: source.name,
              sourceId: source.id,
              originPriority: source.priority,
              sourceType: yt.snippet.liveBroadcastContent === 'none' ? 'video' : 'live',
              sourceStatus: source.requireAdminApproval ? 'detected' : 'synced',
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
              enabled: !source.requireAdminApproval,
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
              updatedAt: new Date().toISOString(),
              isFeatured: source.markAsFeatured,
              bettingAvailability: 'all'
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
